import Capacitor
import WebKit
import UIKit

/// Navigateur natif AYEBA pour iOS — WKWebView flottant au-dessus du bridge
/// Capacitor, comme le plugin Android (open/frame/hidden/tabs/capture).
@objc(AyebaBrowserPlugin)
public class AyebaBrowserPlugin: CAPPlugin, WKNavigationDelegate, WKUIDelegate {

    private var container: UIView?
    private var webView: WKWebView?
    private var findBar: UIView?
    private var desktopMode = false
    private var tabSnapshots: [String: URL] = [:]
    private var currentTabId: String?
    private var pendingSslChallenge: ((URLSession.AuthChallengeDisposition, URLCredential?) -> Void)?

    // MARK: - Cycle de vie

    private func ensureContainer() -> UIView? {
        if let container = container { return container }
        guard let parent = bridge?.webView?.superview else { return nil }
        let c = UIView(frame: parent.bounds)
        c.isHidden = true
        c.backgroundColor = .black
        parent.addSubview(c)
        container = c
        return c
    }

    private func ensureWebView() -> WKWebView? {
        if let webView = webView { return webView }
        guard let c = ensureContainer() else { return nil }
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        let wv = WKWebView(frame: c.bounds, configuration: config)
        wv.navigationDelegate = self
        wv.uiDelegate = self
        wv.allowsBackForwardNavigationGestures = true
        wv.isOpaque = false
        wv.backgroundColor = UIColor(red: 5/255, green: 5/255, blue: 7/255, alpha: 1)
        wv.addObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)
        c.addSubview(wv)
        webView = wv
        return wv
    }

    public override func observeValue(forKeyPath keyPath: String?, of object: Any?,
                                      change: [NSKeyValueChangeKey: Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == #keyPath(WKWebView.estimatedProgress), let wv = webView {
            notifyListeners("progress", data: ["value": wv.estimatedProgress])
        }
    }

    // MARK: - Methodes JS

    @objc func open(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let wv = self.ensureWebView(), let c = self.container else {
                call.reject("WebView indisponible")
                return
            }
            let url = call.getString("url") ?? ""
            let x = CGFloat(call.getFloat("x") ?? 0)
            let y = CGFloat(call.getFloat("y") ?? 0)
            let w = CGFloat(call.getFloat("width") ?? Float(UIScreen.main.bounds.width))
            let h = CGFloat(call.getFloat("height") ?? Float(UIScreen.main.bounds.height))
            c.frame = CGRect(x: x, y: y, width: w, height: h)
            wv.frame = c.bounds
            c.isHidden = false
            if !url.isEmpty, let u = URL(string: url) {
                wv.load(URLRequest(url: u))
            }
            self.currentTabId = call.getString("tabId")
            call.resolve()
        }
    }

    @objc func close(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.container?.isHidden = true
            call.resolve()
        }
    }

    @objc func setFrame(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let c = self.container else { call.resolve(); return }
            let x = CGFloat(call.getFloat("x") ?? 0)
            let y = CGFloat(call.getFloat("y") ?? 0)
            let w = CGFloat(call.getFloat("width") ?? Float(UIScreen.main.bounds.width))
            let h = CGFloat(call.getFloat("height") ?? Float(UIScreen.main.bounds.height))
            c.frame = CGRect(x: x, y: y, width: w, height: h)
            self.webView?.frame = c.bounds
            call.resolve()
        }
    }

    @objc func setHidden(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.container?.isHidden = call.getBool("hidden") ?? false
            call.resolve()
        }
    }

    @objc func loadUrl(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let wv = self.webView, let s = call.getString("url"),
                  !s.isEmpty, let u = URL(string: s) else {
                call.resolve()
                return
            }
            wv.load(URLRequest(url: u))
            call.resolve()
        }
    }

    @objc func goBack(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.webView?.goBack()
            call.resolve()
        }
    }

    @objc func goForward(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.webView?.goForward()
            call.resolve()
        }
    }

    @objc func goToIndex(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let wv = self.webView, let idx = call.getInt("index") else {
                call.resolve()
                return
            }
            let list = wv.backForwardList.backList + [wv.backForwardList.currentItem].compactMap { $0 }
                + wv.backForwardList.forwardList
            if idx >= 0 && idx < list.count {
                wv.go(to: list[idx])
            }
            call.resolve()
        }
    }

    @objc func reload(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.webView?.reload()
            call.resolve()
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.webView?.stopLoading()
            call.resolve()
        }
    }

    @objc func evaluate(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let wv = self.webView, let script = call.getString("script") else {
                call.resolve()
                return
            }
            wv.evaluateJavaScript(script) { result, _ in
                call.resolve(["result": result as? String ?? ""])
            }
        }
    }

    @objc func find(_ call: CAPPluginCall) {
        // Recherche dans la page via JS : surlignage des occurrences.
        DispatchQueue.main.async {
            let q = (call.getString("query") ?? "").replacingOccurrences(of: "'", with: "\\'")
            let js = """
            (function(){
              window.__ayebaMatches = [];
              if ('\(q)' === '') { return 0; }
              var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
              var n, count = 0;
              while ((n = walker.nextNode())) {
                var idx = n.nodeValue.toLowerCase().indexOf('\(q)'.toLowerCase());
                if (idx >= 0) count++;
              }
              return count;
            })()
            """
            self.webView?.evaluateJavaScript(js) { result, _ in
                let matches = (result as? Int) ?? 0
                self.notifyListeners("findResult", data: ["active": matches > 0 ? 1 : 0, "matches": matches])
            }
            call.resolve()
        }
    }

    @objc func clearFind(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func setDesktop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.desktopMode = call.getBool("enabled") ?? false
            if #available(iOS 13.0, *) {
                self.webView?.customUserAgent = self.desktopMode
                    ? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
                    : nil
            }
            call.resolve()
        }
    }

    @objc func sslProceed(_ call: CAPPluginCall) {
        let proceed = call.getBool("proceed") ?? false
        pendingSslChallenge?(proceed ? .useCredential : .cancel,
                             proceed ? URLCredential(trust: SecTrust()) : nil)
        pendingSslChallenge = nil
        call.resolve()
    }

    /// Capture JPEG de la page — equivalent du draw() Android, via takeSnapshot.
    @objc func capture(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let wv = self.webView, !wv.isHidden else {
                call.resolve([:])
                return
            }
            let config = WKSnapshotConfiguration()
            config.rect = wv.bounds
            wv.takeSnapshot(with: config) { image, _ in
                guard let img = image,
                      let data = img.jpegData(compressionQuality: 0.55) else {
                    call.resolve([:])
                    return
                }
                call.resolve(["data": "data:image/jpeg;base64," + data.base64EncodedString()])
            }
        }
    }

    // MARK: - Onglets

    @objc func saveTab(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let id = call.getString("id"), let url = self.webView?.url {
                self.tabSnapshots[id] = url
                self.currentTabId = id
            }
            call.resolve()
        }
    }

    @objc func restoreTab(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let wv = self.webView, let id = call.getString("id") else {
                call.resolve()
                return
            }
            let saved = self.tabSnapshots[id]
            let fallback = call.getString("url") ?? ""
            let target = saved?.absoluteString ?? fallback
            if !target.isEmpty, wv.url?.absoluteString != target, let u = URL(string: target) {
                wv.load(URLRequest(url: u))
            } else if wv.url == nil, !target.isEmpty, let u = URL(string: target) {
                wv.load(URLRequest(url: u))
            }
            self.currentTabId = id
            call.resolve()
        }
    }

    @objc func removeTab(_ call: CAPPluginCall) {
        if let id = call.getString("id") { tabSnapshots.removeValue(forKey: id) }
        call.resolve()
    }

    // MARK: - WKNavigationDelegate

    public func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        notifyNav(loading: true)
    }

    public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        notifyNav(loading: false)
        if let id = currentTabId, let url = webView.url {
            tabSnapshots[id] = url
        }
    }

    public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        notifyNav(loading: false)
    }

    public func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
                        withError error: Error) {
        let err = error as NSError
        // NSURLErrorCancelled : navigation remplacee, pas une vraie erreur.
        if err.code == NSURLErrorCancelled { return }
        notifyNav(loading: false)
    }

    public func webView(_ webView: WKWebView,
                        didReceive challenge: URLAuthenticationChallenge,
                        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust {
            pendingSslChallenge = completionHandler
            notifyListeners("sslError", data: [
                "url": webView.url?.absoluteString ?? "",
                "primaryError": -1,
                "certificate": challenge.protectionSpace.host,
            ])
            // Par defaut on refuse en attendant la decision JS.
            completionHandler(.cancel, nil)
            return
        }
        completionHandler(.performDefaultHandling, nil)
    }

    public func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        // target="_blank" -> nouvel onglet AYEBA.
        if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
            notifyListeners("newTab", data: ["url": url.absoluteString])
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    private func notifyNav(loading: Bool) {
        guard let wv = webView else { return }
        notifyListeners("nav", data: [
            "url": wv.url?.absoluteString ?? "",
            "title": wv.title ?? "",
            "loading": loading,
            "canGoBack": wv.canGoBack,
            "canGoForward": wv.canGoForward,
            "historyList": wv.backForwardList.backList.map { $0.url.absoluteString },
            "historyIndex": wv.backForwardList.backList.count,
        ])
    }
}
