package app.ayeba.mobile;

import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.ByteArrayInputStream;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * AyebaBrowser — vraie WebView native superposee a la WebView Capacitor.
 * Le shell HTML (chrome Safari Ayeba) pilote la navigation via ce bridge :
 * progression reelle, find-in-page, UA desktop, telechargements, SSL,
 * Safe Browsing, pull-to-refresh, scroll (barres immersives), screenshots.
 * Equivalent Android du WKWebView de Safari.
 */
@CapacitorPlugin(name = "AyebaBrowser")
public class AyebaBrowserPlugin extends Plugin {

    /** Acces statique pour MainActivity (bouton retour materiel). */
    public static WebView activeWebView = null;

    private FrameLayout container;
    private SwipeRefreshLayout swipe;
    private WebView webView;
    private SslErrorHandler pendingSslHandler;
    private int lastScrollY = 0;
    private float density = 1f;

    /** Etats de navigation par onglet (historique + position de scroll). */
    private final Map<String, Bundle> tabStates = new HashMap<>();
    private String currentTabId = null;

    /** Domaines bloques facon Intelligent Tracking Prevention. */
    private static final Set<String> BLOCKED_HOSTS = new HashSet<>();

    static {
        String[] hosts = {
            "google-analytics.com", "googletagmanager.com", "doubleclick.net",
            "googlesyndication.com", "googleadservices.com", "facebook.net",
            "connect.facebook.net", "ads.twitter.com", "analytics.twitter.com",
            "scorecardresearch.com", "quantserve.com", "outbrain.com",
            "taboola.com", "criteo.com", "criteo.net", "adnxs.com",
            "rubiconproject.com", "pubmatic.com", "openx.net",
            "hotjar.com", "mouseflow.com", "fullstory.com", "luckyorange.com",
            "yandex.ru/metrica", "mc.yandex.ru", "bing.com/bat"
        };
        for (String h : hosts) BLOCKED_HOSTS.add(h);
    }

    private void emit(String event, JSObject data) {
        notifyListeners(event, data);
    }

    private int px(double cssPx) {
        return (int) Math.round(cssPx * density);
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void ensureWebView() {
        if (webView != null) return;
        Context ctx = getContext();
        density = ctx.getResources().getDisplayMetrics().density;

        webView = new WebView(ctx);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportMultipleWindows(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme();
                if (scheme.equals("http") || scheme.equals("https") || scheme.equals("about") || scheme.equals("data")) {
                    return false;
                }
                // Schemes externes : telephone, mail, intent, market, whatsapp...
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(intent);
                } catch (ActivityNotFoundException ignored) {
                }
                return true;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost() == null ? "" : uri.getHost();
                String full = uri.toString();
                for (String blocked : BLOCKED_HOSTS) {
                    if (host.endsWith(blocked) || full.contains(blocked)) {
                        return new WebResourceResponse("text/plain", "utf-8",
                                new ByteArrayInputStream(new byte[0]));
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                JSObject d = new JSObject();
                d.put("url", url);
                d.put("loading", true);
                emit("nav", d);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                swipe.setRefreshing(false);
                JSObject d = new JSObject();
                d.put("url", url);
                d.put("title", view.getTitle() == null ? "" : view.getTitle());
                d.put("loading", false);
                d.put("canGoBack", view.canGoBack());
                d.put("canGoForward", view.canGoForward());
                // Pile de navigation reelle -> le shell reste synchronise.
                android.webkit.WebBackForwardList list = view.copyBackForwardList();
                JSArray historyList = new JSArray();
                for (int i = 0; i < list.getSize(); i++) {
                    android.webkit.WebHistoryItem item = list.getItemAtIndex(i);
                    historyList.put(item.getUrl());
                }
                d.put("historyList", historyList);
                d.put("historyIndex", list.getCurrentIndex());
                emit("nav", d);
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
                pendingSslHandler = handler;
                JSObject d = new JSObject();
                d.put("url", error.getUrl());
                d.put("primaryError", error.getPrimaryError());
                d.put("certificate", error.getCertificate() == null ? "" : error.getCertificate().toString());
                emit("sslError", d);
            }

            @Override
            public void onSafeBrowsingHit(WebView view, WebResourceRequest request, int threatType,
                                          android.webkit.SafeBrowsingResponse callback) {
                if (Build.VERSION.SDK_INT >= 27 && callback != null) {
                    callback.backToSafety(true);
                }
                JSObject d = new JSObject();
                d.put("url", request.getUrl().toString());
                d.put("threatType", threatType);
                d.put("mainFrame", request.isForMainFrame());
                emit("safeBrowsingHit", d);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                JSObject d = new JSObject();
                d.put("value", newProgress);
                emit("progress", d);
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture,
                                          android.os.Message resultMsg) {
                // target=_blank : capture l'URL et notifie le shell -> nouvel onglet Ayeba.
                WebView tmp = new WebView(ctx);
                tmp.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                        JSObject d = new JSObject();
                        d.put("url", r.getUrl().toString());
                        emit("newTab", d);
                        return true;
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(tmp);
                resultMsg.sendToTarget();
                return true;
            }
        });

        // Find in page (findAllAsync / findNext natifs, comme Safari).
        webView.setFindListener((activeMatchOrdinal, numberOfMatches, isDoneCounting) -> {
            JSObject d = new JSObject();
            d.put("active", activeMatchOrdinal);
            d.put("matches", numberOfMatches);
            d.put("done", isDoneCounting);
            emit("findResult", d);
        });

        // Scroll -> barres immersives (dy positif = scroll vers le bas).
        webView.getViewTreeObserver().addOnScrollChangedListener(() -> {
            int y = webView.getScrollY();
            int dy = y - lastScrollY;
            lastScrollY = y;
            if (dy != 0) {
                JSObject d = new JSObject();
                d.put("dy", dy / density);
                d.put("y", y / density);
                emit("scroll", d);
            }
        });

        // Telechargements reels via le gestionnaire systeme (notification + Downloads).
        webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            try {
                String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                req.setMimeType(mimetype);
                req.addRequestHeader("User-Agent", userAgent);
                req.setDescription(url);
                req.setTitle(filename);
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm != null) dm.enqueue(req);
                JSObject d = new JSObject();
                d.put("url", url);
                d.put("filename", filename);
                emit("download", d);
            } catch (Exception e) {
                JSObject d = new JSObject();
                d.put("url", url);
                d.put("error", e.getMessage() == null ? "download failed" : e.getMessage());
                emit("download", d);
            }
        });

        swipe = new SwipeRefreshLayout(ctx);
        swipe.addView(webView, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        swipe.setOnRefreshListener(() -> webView.reload());

        container = new FrameLayout(ctx);
        container.addView(swipe, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        container.setVisibility(View.GONE);

        ViewGroup root = getActivity().findViewById(android.R.id.content);
        root.addView(container);
        activeWebView = webView;
    }

    private void applyFrame(PluginCall call) {
        double x = call.getDouble("x", 0.0);
        double y = call.getDouble("y", 0.0);
        double w = call.getDouble("width", 0.0);
        double h = call.getDouble("height", 0.0);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(px(w), px(h));
        lp.leftMargin = px(x);
        lp.topMargin = px(y);
        container.setLayoutParams(lp);
    }

    @PluginMethod
    public void open(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            ensureWebView();
            applyFrame(call);
            String url = call.getString("url", "");
            currentTabId = call.getString("tabId");
            container.setVisibility(View.VISIBLE);
            if (!url.isEmpty() && !url.equals(webView.getUrl())) {
                webView.loadUrl(url);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void setFrame(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (container != null) applyFrame(call);
            call.resolve();
        });
    }

    @PluginMethod
    public void setHidden(PluginCall call) {
        boolean hidden = Boolean.TRUE.equals(call.getBoolean("hidden", false));
        getActivity().runOnUiThread(() -> {
            if (container != null) container.setVisibility(hidden ? View.GONE : View.VISIBLE);
            call.resolve();
        });
    }

    @PluginMethod
    public void loadUrl(PluginCall call) {
        String url = call.getString("url", "");
        getActivity().runOnUiThread(() -> {
            if (webView != null && !url.isEmpty()) webView.loadUrl(url);
            call.resolve();
        });
    }

    @PluginMethod
    public void goBack(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (webView != null && webView.canGoBack()) webView.goBack();
            call.resolve();
        });
    }

    @PluginMethod
    public void goForward(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (webView != null && webView.canGoForward()) webView.goForward();
            call.resolve();
        });
    }

    /** Saute a un index de la pile (appui long sur <- / ->). */
    @PluginMethod
    public void goToIndex(PluginCall call) {
        int index = call.getInt("index", -1);
        getActivity().runOnUiThread(() -> {
            if (webView != null && index >= 0) {
                android.webkit.WebBackForwardList list = webView.copyBackForwardList();
                webView.goBackOrForward(index - list.getCurrentIndex());
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void reload(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (webView != null) webView.reload();
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (webView != null) webView.stopLoading();
            call.resolve();
        });
    }

    @PluginMethod
    public void evaluate(PluginCall call) {
        String script = call.getString("script", "");
        getActivity().runOnUiThread(() -> {
            if (webView == null) {
                call.resolve();
                return;
            }
            webView.evaluateJavascript(script, value -> {
                JSObject d = new JSObject();
                d.put("result", value);
                call.resolve(d);
            });
        });
    }

    @PluginMethod
    public void find(PluginCall call) {
        String query = call.getString("query", "");
        boolean forward = Boolean.TRUE.equals(call.getBoolean("forward", true));
        getActivity().runOnUiThread(() -> {
            if (webView != null) {
                if (!query.isEmpty()) webView.findAllAsync(query);
                else webView.findNext(forward);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void clearFind(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (webView != null) webView.clearMatches();
            call.resolve();
        });
    }

    @PluginMethod
    public void setDesktop(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        getActivity().runOnUiThread(() -> {
            if (webView != null) {
                WebSettings s = webView.getSettings();
                s.setUserAgentString(enabled
                        ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          + "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
                        : null);
                webView.reload();
            }
            call.resolve();
        });
    }

    /** Decision SSL du shell (le handler natif attend cet appel). */
    @PluginMethod
    public void sslProceed(PluginCall call) {
        boolean proceed = Boolean.TRUE.equals(call.getBoolean("proceed", false));
        getActivity().runOnUiThread(() -> {
            if (pendingSslHandler != null) {
                if (proceed) pendingSslHandler.proceed();
                else pendingSslHandler.cancel();
                pendingSslHandler = null;
            }
            call.resolve();
        });
    }

    /** Capture la page visible -> JPEG base64 (vignettes d'onglets). */
    @PluginMethod
    public void capture(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (webView == null || webView.getWidth() == 0) {
                call.resolve();
                return;
            }
            try {
                int w = webView.getWidth();
                int h = Math.min(webView.getHeight(), w * 2);
                Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.RGB_565);
                Canvas canvas = new Canvas(bmp);
                webView.draw(canvas);
                int targetW = px(160);
                Bitmap scaled = Bitmap.createScaledBitmap(bmp, targetW, h * targetW / w, true);
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                scaled.compress(Bitmap.CompressFormat.JPEG, 70, out);
                JSObject d = new JSObject();
                d.put("data", "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP));
                call.resolve(d);
            } catch (Exception e) {
                call.reject("capture failed", e);
            }
        });
    }

    /** Sauvegarde l'etat (historique + scroll) de l'onglet courant sous `id`. */
    @PluginMethod
    public void saveTab(PluginCall call) {
        String id = call.getString("id");
        getActivity().runOnUiThread(() -> {
            if (webView != null && id != null) {
                Bundle state = new Bundle();
                webView.saveState(state);
                tabStates.put(id, state);
                currentTabId = id;
            }
            call.resolve();
        });
    }

    /** Restaure l'etat d'un onglet, ou charge `url` si aucun etat. */
    @PluginMethod
    public void restoreTab(PluginCall call) {
        String id = call.getString("id");
        String url = call.getString("url", "");
        getActivity().runOnUiThread(() -> {
            if (webView == null || id == null) {
                call.resolve();
                return;
            }
            Bundle state = tabStates.get(id);
            if (state != null) {
                webView.restoreState(state);
            } else if (!url.isEmpty() && !url.equals(webView.getUrl())) {
                webView.loadUrl(url);
            }
            currentTabId = id;
            call.resolve();
        });
    }

    @PluginMethod
    public void removeTab(PluginCall call) {
        String id = call.getString("id");
        if (id != null) tabStates.remove(id);
        call.resolve();
    }

    @PluginMethod
    public void close(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (container != null) container.setVisibility(View.GONE);
            call.resolve();
        });
    }
}
