import UIKit
import WebKit
import XCTest

final class LessonTests: XCTestCase {
    private let field = "document.querySelector('canvas[aria-label=\"Буква А, проба 1\"]')"

    @MainActor
    func testPracticeRepeatsPersist() async throws {
        let web = try await loadedLesson()
        let original = try await web.evaluateJavaScript("preferences.practiceRepeats") as? Int ?? 0
        let ink = try await web.evaluateJavaScript("JSON.stringify(data)") as? String
        let changed = try await web.evaluateJavaScript("""
            document.querySelector('#open-parent').click();
            document.querySelector('#open-developer').click();
            window.repeatCanary = true;
            (() => {
                const control = document.querySelector('#setting-practiceRepeats');
                control.value = '6';
                control.dispatchEvent(new Event('change', {bubbles: true}));
                document.querySelector('#close-developer').click();
                return [...document.querySelectorAll('[data-lesson-stage]')]
                    .filter(row => /^(upper|lower)-(letter|elements)$/.test(row.dataset.lessonStage))
                    .every(row => row.querySelectorAll('canvas').length === 6);
            })();
            """) as? Bool
        XCTAssertEqual(changed, true)
        web.reload()
        let reopened = try await loadedLesson()
        let saved = try await reopened.evaluateJavaScript("""
            typeof window.repeatCanary === 'undefined' && preferences.practiceRepeats === 6 &&
            document.querySelectorAll('[data-lesson-stage="upper-letter"] canvas').length === 6 &&
            document.querySelectorAll('[data-lesson-stage="lower-letter"] canvas').length === 6;
            """) as? Bool
        XCTAssertEqual(saved, true)
        _ = try await reopened.callAsyncJavaScript("""
            await document.querySelector('#reference').decode();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return true;
            """, arguments: [:], in: nil, contentWorld: .page)
        let attachment = XCTAttachment(image: try await reopened.takeSnapshot(configuration: nil))
        attachment.name = "six-repeats"
        attachment.lifetime = .keepAlways
        add(attachment)
        _ = try await reopened.evaluateJavaScript("configure({practiceRepeats: \(original)})")
        let restored = try await reopened.evaluateJavaScript("JSON.stringify(data)") as? String
        XCTAssertEqual(restored, ink)
        let count = try await reopened.evaluateJavaScript("""
            document.querySelectorAll('[data-lesson-stage="upper-letter"] canvas').length;
            """) as? Int
        XCTAssertEqual(count, original == 0 ? 3 : original)
    }

    @MainActor
    func testWriteResetAndSave() async throws {
        let web = try await loadedLesson()
        let sampleOpened = try await web.evaluateJavaScript("""
            document.querySelector('#open-sample').click();
            !!document.querySelector('dialog[open] svg');
            """) as? Bool
        XCTAssertEqual(sampleOpened, true)

        let score = try await web.evaluateJavaScript("""
            document.querySelector('dialog[open]').close();
            (() => {
                const canvas = \(field);
                const cell = canvas.closest('.cell');
                const score = cell.querySelector('.score');
                const reset = cell.querySelector('.reset');
                if (!score.disabled) { score.click(); reset.click(); }
                canvas.scrollIntoView({block: 'center'});
                // Pointer capture is provided by the OS for real pointer streams.
                canvas.setPointerCapture = () => {};
                canvas.releasePointerCapture = () => {};
                const guides = [...cell.querySelectorAll('.writing > svg:first-child path')].slice(0, 2);
                for (const guide of guides) {
                    const matrix = guide.getScreenCTM();
                    const length = guide.getTotalLength();
                    for (let step = 0; step <= 40; step++) {
                        const point = guide.getPointAtLength(length * step / 40).matrixTransform(matrix);
                        const event = step === 0 ? 'pointerdown' : step === 40 ? 'pointerup' : 'pointermove';
                        canvas.dispatchEvent(new PointerEvent(event, {
                            bubbles: true, cancelable: true, pointerType: 'pen', pointerId: 1,
                            isPrimary: true, clientX: point.x, clientY: point.y
                        }));
                    }
                }
                return Number.parseInt(score.textContent, 10);
            })();
            """) as? Int
        XCTAssertGreaterThanOrEqual(score ?? 0, 90)
        let feedback = try await web.callAsyncJavaScript("""
            return await new Promise(resolve => {
                const expiry = setTimeout(() => resolve('timeout'), 2000);
                FeedbackJobs.request({
                    strokes: [[[0, 0], [0.1, 0.1]]], model: [[[45, 44], [45, 135]]]
                }, 'outside', markup => {
                    clearTimeout(expiry);
                    resolve(markup.includes('extra-ink') ? FeedbackJobs.engine : 'empty');
                });
            });
            """, arguments: [:], in: nil, contentWorld: .page) as? String
        XCTAssertTrue(feedback == "worker" || feedback == "cooperative")
        print("Offline correction engine: \(feedback ?? "missing")")

        let resetAndUndo = try await web.evaluateJavaScript("""
            (() => {
                const cell = \(field).closest('.cell');
                const score = cell.querySelector('.score');
                const reset = cell.querySelector('.reset');
                score.click();
                const resetShown = !reset.hidden;
                reset.click();
                const cleared = score.disabled;
                document.querySelector('#undo').click();
                return resetShown && cleared && !score.disabled;
            })();
            """) as? Bool
        XCTAssertEqual(resetAndUndo, true)
        try await assertSavedScore(in: web)
    }

    @MainActor
    func testWrittenAttemptAfterLaunch() async throws {
        let web = try await loadedLesson()
        try await assertSavedScore(in: web)
    }

    @MainActor
    private func assertSavedScore(in web: WKWebView) async throws {
        let score = try await web.evaluateJavaScript("""
            Number.parseInt(\(field).closest('.cell').querySelector('.score').textContent, 10);
            """) as? Int
        XCTAssertGreaterThanOrEqual(score ?? 0, 90)
    }

    @MainActor
    private func loadedLesson() async throws -> WKWebView {
        for _ in 0..<80 {
            let windows = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap(\.windows)
            for window in windows {
                guard let web = webView(in: window),
                      web.url?.isFileURL == true, !web.isLoading,
                      let ready = try? await web.evaluateJavaScript("""
                        !!\(field) && document.querySelector('#demo').innerHTML.length > 0
                        """) as? Bool, ready else { continue }
                return web
            }
            try await Task.sleep(for: .milliseconds(100))
        }
        throw CocoaError(.fileReadUnknown, userInfo: [NSLocalizedDescriptionKey: "The local app did not load the lesson"])
    }

    @MainActor
    private func webView(in view: UIView) -> WKWebView? {
        if let web = view as? WKWebView { return web }
        return view.subviews.lazy.compactMap { self.webView(in: $0) }.first
    }
}
