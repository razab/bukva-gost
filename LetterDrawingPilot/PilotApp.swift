import SwiftUI
import WebKit

@main
struct PilotApp: App {
    var body: some Scene {
        WindowGroup {
            NativeWorkspace()
        }
    }
}

struct PilotLesson: UIViewRepresentable {
    let controller: Coordinator
    func makeUIView(context: Context) -> WKWebView {
        controller.webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        controller
    }

    @MainActor final class Coordinator: NSObject, ObservableObject, WKNavigationDelegate, WKDownloadDelegate, UIDocumentPickerDelegate, WKScriptMessageHandler {
        let webView = WKWebView(frame: .zero)
        @Published var state = NativeSnapshot.empty
        @Published var lessons: [LessonItem] = []
        @Published var sheet: NativeSheet?
        @Published var result: NativeResult?
        @Published var error: String?
        var controlsUnavailable: Bool { state.preferences.isEmpty || state.writing }
        private var pending: (() -> Void)?
        private var lastSheet: NativeSheet?
        private var activeDownload: WKDownload?
        private var backupURL: URL?
        private let fragment: String?
        private let lessonURL = Bundle.main.url(
            forResource: "index", withExtension: "html", subdirectory: "Web"
        )

        init(fragment: String? = nil) {
            self.fragment = fragment
            super.init()
            webView.navigationDelegate = self
            webView.scrollView.contentInsetAdjustmentBehavior = .never
            webView.allowsLinkPreview = false
            webView.isOpaque = false
            webView.backgroundColor = UIColor(red: 1, green: 0.996, blue: 0.98, alpha: 1)
            webView.scrollView.pinchGestureRecognizer?.isEnabled = false
            webView.configuration.userContentController.add(WeakLessonHandler(self), name: "nativeLesson")
            load(in: webView)
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, message.webView === webView,
                  let body = message.body as? [String: Any],
                  let data = try? JSONSerialization.data(withJSONObject: body) else { return }
            do {
                if body["kind"] as? String == "result" {
                    result = try JSONDecoder().decode(NativeResult.self, from: data)
                    present(.result)
                } else {
                    let snapshot = try JSONDecoder().decode(NativeSnapshot.self, from: data)
                    if let catalog = snapshot.lessons { lessons = catalog }
                    state = snapshot
                }
            } catch { self.error = "Не удалось обновить интерфейс: " + error.localizedDescription }
        }

        func command(_ action: String, _ payload: [String: Any] = [:]) {
            guard !state.preferences.isEmpty else { return }
            Task {
                do { _ = try await webView.callAsyncJavaScript("return await NativeApp.command(action, payload)", arguments: ["action": action, "payload": payload], in: nil, contentWorld: .page) }
                catch { self.error = "Не удалось выполнить действие: " + error.localizedDescription }
            }
        }

        func present(_ destination: NativeSheet) {
            guard !state.writing, !state.preferences.isEmpty else { return }
            command("sync")
            lastSheet = destination
            sheet = destination
        }

        func afterDismiss(_ action: @escaping () -> Void) {
            if sheet == nil { action() } else { pending = action; sheet = nil }
        }

        func didDismiss() {
            if lastSheet == .editor { command("editorClosed") }
            lastSheet = nil
            let action = pending
            pending = nil
            action?()
        }

        func importBackup(_ url: URL) {
            Task {
                let access = url.startAccessingSecurityScopedResource()
                defer { if access { url.stopAccessingSecurityScopedResource() } }
                do {
                    let text = try await Task.detached { () throws -> String in
                        let maximum = 12 * 1024 * 1024
                        if (try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0) > maximum { throw CocoaError(.fileReadTooLarge) }
                        let data = try Data(contentsOf: url)
                        guard data.count <= maximum, let text = String(data: data, encoding: .utf8) else { throw CocoaError(.fileReadCorruptFile) }
                        return text
                    }.value
                    command("import", ["text": text, "name": url.lastPathComponent])
                } catch { self.error = "Не удалось открыть копию: " + error.localizedDescription }
            }
        }

        func load(in webView: WKWebView) {
            guard let lessonURL else {
                showError(in: webView)
                return
            }
            var destination = URLComponents(url: lessonURL, resolvingAgainstBaseURL: false)!
            destination.fragment = fragment
            webView.loadFileURL(destination.url!, allowingReadAccessTo: lessonURL.deletingLastPathComponent())
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            let url = navigationAction.request.url
            if navigationAction.shouldPerformDownload && url?.scheme == "blob" {
                decisionHandler(.download)
                return
            }
            var document = url.flatMap { URLComponents(url: $0, resolvingAgainstBaseURL: false) }
            document?.fragment = nil
            decisionHandler(document?.url == lessonURL || url?.absoluteString == "about:blank" ? .allow : .cancel)
        }

        func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
            guard activeDownload == nil, backupURL == nil else {
                download.cancel { _ in }
                return
            }
            activeDownload = download
            download.delegate = self
        }

        func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                      suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
            do {
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                let name = (suggestedFilename as NSString).lastPathComponent
                let file = directory.appendingPathComponent(name.hasSuffix(".json") ? name : "bukvy-po-gost.json")
                backupURL = file
                completionHandler(file)
            } catch {
                completionHandler(nil)
                exportFailed(in: download.webView)
            }
        }

        func downloadDidFinish(_ download: WKDownload) {
            guard activeDownload === download, let backupURL,
                  var root = download.webView?.window?.rootViewController else {
                exportFailed(in: download.webView)
                return
            }
            activeDownload = nil
            let picker = UIDocumentPickerViewController(forExporting: [backupURL], asCopy: true)
            picker.directoryURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
            picker.delegate = self
            while let presented = root.presentedViewController { root = presented }
            root.present(picker, animated: true)
        }

        func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
            guard activeDownload === download else { return }
            exportFailed(in: download.webView)
        }

        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { clearExport() }

        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { clearExport() }

        private func clearExport() {
            if let backupURL { try? FileManager.default.removeItem(at: backupURL.deletingLastPathComponent()) }
            backupURL = nil
            activeDownload = nil
        }

        private func exportFailed(in webView: WKWebView?) {
            clearExport()
            error = "Не удалось сохранить копию. Работы остались на устройстве."
            webView?.evaluateJavaScript("document.querySelector('#backup-summary').textContent='Не удалось сохранить копию. Работы остались на устройстве.';")
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            guard (error as NSError).code != NSURLErrorCancelled else { return }
            showError(in: webView)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            guard (error as NSError).code != NSURLErrorCancelled else { return }
            showError(in: webView)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            load(in: webView)
        }

        private func showError(in webView: WKWebView) {
            error = "Урок не загрузился. Закройте приложение и откройте его снова."
            webView.loadHTMLString("""
                <!doctype html><html lang="ru"><meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <main style="padding:24px;font:18px system-ui"><h1>Урок не загрузился</h1>
                <p>Закройте приложение и откройте его снова.</p></main></html>
                """, baseURL: nil)
        }
    }
}

@MainActor private final class WeakLessonHandler: NSObject, WKScriptMessageHandler {
    weak var target: PilotLesson.Coordinator?
    init(_ target: PilotLesson.Coordinator) { self.target = target }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}
