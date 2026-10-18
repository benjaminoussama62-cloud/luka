package app.ayeba.mobile;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

	@Override
	public void onCreate(Bundle savedInstanceState) {
		registerPlugin(AyebaBrowserPlugin.class);
		super.onCreate(savedInstanceState);
	}

	@Override
	public void onBackPressed() {
		// Le navigateur natif a la priorite : retour dans l'historique de la page.
		WebView browser = AyebaBrowserPlugin.activeWebView;
		if (browser != null && browser.getVisibility() == android.view.View.VISIBLE && browser.canGoBack()) {
			browser.goBack();
			return;
		}
		WebView webView = getBridge().getWebView();
		if (webView != null && webView.canGoBack()) {
			webView.goBack();
			return;
		}
		super.onBackPressed();
	}
}
