import UIKit
import WebKit
import XCTest
import SQLite3

final class LessonTests: XCTestCase {
    private let field = "document.querySelector('canvas[aria-label=\"Буква А, проба 1\"]')"

    @MainActor
    func testNumbersWorksheet() async throws {
        let web = try await loadedLesson()
        let before = try await web.evaluateJavaScript("JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('letter-worksheet-')&&k!=='letter-worksheet-numbers-v1').sort().map(k=>[k,localStorage.getItem(k)])))") as? String
        _ = try await web.evaluateJavaScript("location.hash='#numbers';location.reload()")
        for _ in 0..<100 {
            if !web.isLoading, (try? await web.evaluateJavaScript("typeof NumberPractice!=='undefined'&&NumberPractice.active&&surfaces.length>0")) as? Bool == true { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        let result = try await web.evaluateJavaScript("""
            (()=>{
                const failures=[];
                if(!NumberPractice.active)return ['numbers did not reload'];
                const oldRepeats=preferences.practiceRepeats;
                configure({practiceRepeats:0});
                if(surfaces.length!==Object.keys(NumberGlyphs).length*2)failures.push('field count');
                for(const character of Object.keys(NumberGlyphs)){
                    const canvas=[...document.querySelectorAll('canvas[data-surface-id]')].find(c=>c.getAttribute('aria-label')===`Символ ${character}, проба 1`);
                    const cell=canvas.closest('.cell'),score=cell.querySelector('.score'),reset=cell.querySelector('.reset');
                    if(!score.disabled){score.click();reset.click()}
                    canvas.scrollIntoView({block:'center'});canvas.setPointerCapture=()=>{};
                    const box=canvas.getBoundingClientRect(),frame=JSON.parse(canvas.dataset.viewBox),model=NumberGlyphs[character].model;
                    for(const line of model)for(let i=0;i<line.length;i++){
                        const [x,y]=line[i];canvas.dispatchEvent(new PointerEvent(i===0?'pointerdown':i===line.length-1?'pointerup':'pointermove',{bubbles:true,cancelable:true,pointerType:'pen',pointerId:1,isPrimary:true,clientX:box.left+(x-frame.x)/frame.width*box.width,clientY:box.top+(y-frame.y)/frame.height*box.height}));
                    }
                    if(parseInt(score.textContent)<90||score.disabled)failures.push(character+' score '+score.textContent);
                    if(NumberPractice.selected!==character||!document.querySelector('#number-pencil'))failures.push(character+' demo');
                    const ink=JSON.stringify(data[canvas.dataset.surfaceId]);
                    score.click();reset.click();if(!score.disabled)failures.push(character+' reset');
                    undo();if(JSON.stringify(data[canvas.dataset.surfaceId])!==ink)failures.push(character+' undo');
                }
                const ink=JSON.stringify(data),backup=LocalBackup.parse(LocalBackup.export(localStorage));
                if(!backup.entries[NumberPractice.key])failures.push('backup');
                reflowPage();if(JSON.stringify(data)!==ink)failures.push('reload');
                configure({practiceRepeats:5});if(surfaces.length!==Object.keys(NumberGlyphs).length*5)failures.push('repeat setting');
                configure({practiceRepeats:oldRepeats});
                window.scrollTo({top:0});return failures;
            })()
            """) as? [String]
        XCTAssertEqual(result, [])
        let numericInk = try await web.evaluateJavaScript("JSON.stringify(data)") as? String
        web.reload()
        for _ in 0..<100 {
            if !web.isLoading, (try? await web.evaluateJavaScript("typeof NumberPractice!=='undefined'&&NumberPractice.active&&surfaces.length>0")) as? Bool == true { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        let reopenedInk = try await web.evaluateJavaScript("JSON.stringify(data)") as? String
        XCTAssertEqual(numericInk, reopenedInk)
        let after = try await web.evaluateJavaScript("JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('letter-worksheet-')&&k!=='letter-worksheet-numbers-v1').sort().map(k=>[k,localStorage.getItem(k)])))") as? String
        XCTAssertEqual(before, after)
        let attachment = XCTAttachment(image: try await web.takeSnapshot(configuration: nil))
        attachment.name = "numbers-worksheet"; attachment.lifetime = .keepAlways; add(attachment)
        _ = try await web.evaluateJavaScript("location.hash='';location.reload()")
        _ = try await loadedLesson()
    }

    @MainActor
    func testNativeLayoutSizes() async throws {
        let web = try await loadedLesson()
        let window = try XCTUnwrap(web.window)
        let original = window.bounds
        defer { window.bounds = original; window.rootViewController?.view.frame = original }
        let ink = try await web.evaluateJavaScript("JSON.stringify(data)") as? String
        // Windowed iPadOS rejects orientation requests; this is a component size test.
        for size in [CGSize(width: 1210, height: 834), CGSize(width: 834, height: 1210)] {
            window.bounds = CGRect(origin: .zero, size: size)
            window.rootViewController?.view.frame = window.bounds
            window.layoutIfNeeded()
            for _ in 0..<40 {
                let viewport = try await web.evaluateJavaScript("innerWidth") as? Double ?? 0
                if abs(web.bounds.width - size.width) < 1 && abs(viewport - size.width) < 1 { break }
                try await Task.sleep(for: .milliseconds(100))
            }
            XCTAssertEqual(web.bounds.width, size.width, accuracy: 1)
            let afterInk = try await web.evaluateJavaScript("JSON.stringify(data)") as? String
            XCTAssertEqual(afterInk, ink)
            let viewport = try await web.evaluateJavaScript("innerWidth") as? Double ?? 0
            XCTAssertEqual(viewport, size.width, accuracy: 1)
            let fits = try await web.evaluateJavaScript("document.body.scrollWidth <= innerWidth + 1") as? Bool
            XCTAssertEqual(fits, true)
            let picture = UIGraphicsImageRenderer(bounds: window.bounds).image { _ in window.drawHierarchy(in: window.bounds, afterScreenUpdates: true) }
            let attachment = XCTAttachment(image: picture)
            attachment.name = size.width > size.height ? "native-wide-layout" : "native-tall-layout"
            attachment.lifetime = .keepAlways; add(attachment)
        }
    }

    @MainActor
    func testCourseNavigationAndBackupData() async throws {
        let web = try await loadedLesson()
        let valid = try await web.evaluateJavaScript("""
            (() => {
                for (const letter of ['А', 'О']) {
                    build(0, letter);
                    data['gost-file-b90-upper-0'] = models.map(line => line.map(([x,y]) => [x/150,y/180]));
                    save(); refresh();
                    document.querySelector('#finish-session').click();
                    document.querySelector('#session-result').close();
                }
                const backup = LocalBackup.parse(LocalBackup.export(localStorage));
                const good = backup.fields >= 2 && ['А','О'].every(letter => LearnerExperience.store().sessions(letter).length > 0);
                build(0, 'А');
                document.querySelector('#choose-letter').click();
                const tiles = document.querySelectorAll('#lesson-grid button').length;
                document.querySelector('#lesson-picker').close();
                return good && tiles === 33 && typeof NativeApp?.command === 'function';
            })();
            """) as? Bool
        XCTAssertEqual(valid, true)
        try await assertDurableEntries(in: web)
    }

    @MainActor
    func testFullCourseResources() async throws {
        let web = try await loadedLesson()
        let failures = try await web.callAsyncJavaScript("""
            const original = preferences.practiceRepeats;
            configure({practiceRepeats: 6});
            const failures = [];
            for (const letter of LetterCurriculum.order) {
                build(0, letter);
                await document.querySelector('#reference').decode();
                document.querySelector('#open-sample').click();
                const rows = [...document.querySelectorAll('[data-lesson-stage]')]
                    .filter(row => /^(upper|lower)-(letter|elements)$/.test(row.dataset.lessonStage));
                if (!rows.length || !rows.every(row => row.querySelectorAll('canvas').length === 6) ||
                    !document.querySelector('#scheme-upper path') || !document.querySelector('#scheme-lower path') ||
                    !document.querySelector('#art-guide path')) failures.push(letter);
                document.querySelector('#sample-panel').close();
                await new Promise(requestAnimationFrame);
            }
            if (LetterCurriculum.order.length !== 33) failures.push('count');
            build(0, 'А');
            configure({practiceRepeats: original});
            return failures;
            """, arguments: [:], in: nil, contentWorld: .page) as? [String]
        XCTAssertEqual(failures, [])
    }

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
    private func assertDurableEntries(in web: WKWebView) async throws {
        let json = try await web.evaluateJavaScript("JSON.stringify(JSON.parse(LocalBackup.export(localStorage)).entries)") as! String
        let expected = try JSONSerialization.jsonObject(with: Data(json.utf8)) as! [String: String]
        let library = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask)[0].appendingPathComponent("WebKit")
        for _ in 0..<100 {
            if let files = FileManager.default.enumerator(at: library, includingPropertiesForKeys: nil) {
                for case let file as URL in files where file.lastPathComponent == "localstorage.sqlite3" {
                    var database: OpaquePointer?
                    guard sqlite3_open_v2(file.path, &database, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
                        sqlite3_close(database)
                        continue
                    }
                    var statement: OpaquePointer?
                    var stored: [String: String] = [:]
                    if sqlite3_prepare_v2(database, "SELECT key,value FROM ItemTable", -1, &statement, nil) == SQLITE_OK {
                        while sqlite3_step(statement) == SQLITE_ROW {
                            guard let key = sqlite3_column_text(statement, 0), let bytes = sqlite3_column_blob(statement, 1) else { continue }
                            let value = Data(bytes: bytes, count: Int(sqlite3_column_bytes(statement, 1)))
                            stored[String(cString: key)] = String(data: value, encoding: .utf16LittleEndian)
                        }
                    }
                    sqlite3_finalize(statement)
                    sqlite3_close(database)
                    if !expected.isEmpty && expected.allSatisfy({ stored[$0.key] == $0.value }) { return }
                }
            }
            try await Task.sleep(for: .milliseconds(100))
        }
        XCTFail("WebKit did not flush the backup entries to durable local storage before test handoff")
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
