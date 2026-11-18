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

    final class Coordinator: NSObject, WKNavigationDelegate {
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
            decisionHandler(url == lessonURL || url?.absoluteString == "about:blank" ? .allow : .cancel)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            showError(in: webView)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
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
