import SwiftUI
import WebKit

@main
struct PilotApp: App {
    var body: some Scene {
        WindowGroup {
            PilotLesson()
                .ignoresSafeArea(.container, edges: .bottom)
        }
    }
}

struct PilotLesson: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView(frame: .zero)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsLinkPreview = false
        context.coordinator.load(in: webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKDownloadDelegate, UIDocumentPickerDelegate {
        private var activeDownload: WKDownload?
        private var backupURL: URL?
        private let lessonURL = Bundle.main.url(
            forResource: "index", withExtension: "html", subdirectory: "Web"
        )

        func load(in webView: WKWebView) {
            guard let lessonURL else {
                showError(in: webView)
                return
            }
            webView.loadFileURL(lessonURL, allowingReadAccessTo: lessonURL.deletingLastPathComponent())
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
            decisionHandler(url == lessonURL || url?.absoluteString == "about:blank" ? .allow : .cancel)
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
                  let root = download.webView?.window?.rootViewController else {
                exportFailed(in: download.webView)
                return
            }
            activeDownload = nil
            let picker = UIDocumentPickerViewController(forExporting: [backupURL], asCopy: true)
            picker.directoryURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
            picker.delegate = self
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
            webView.loadHTMLString("""
                <!doctype html><html lang="ru"><meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <main style="padding:24px;font:18px system-ui"><h1>Урок не загрузился</h1>
                <p>Закройте приложение и откройте его снова.</p></main></html>
                """, baseURL: nil)
        }
    }
}
