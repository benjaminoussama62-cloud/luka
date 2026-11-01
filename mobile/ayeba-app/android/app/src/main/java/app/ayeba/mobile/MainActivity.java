package app.ayeba.mobile;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

	@Override
	public void onCreate(Bundle savedInstanceState) {
		registerPlugin(AyebaBrowserPlugin.class);
		super.onCreate(savedInstanceState);
		// Immersif façon navigateur : contenu bord à bord, barres système
		// assorties au fond AYEBA (jamais de blanc en haut ni en bas).
		android.view.Window w = getWindow();
		w.setStatusBarColor(0xFF050507);
		w.setNavigationBarColor(0xFF050507);
		WindowCompat.setDecorFitsSystemWindows(w, false);
		WindowInsetsControllerCompat c = WindowCompat.getInsetsController(w, w.getDecorView());
		if (c != null) {
			c.setAppearanceLightStatusBars(false);
			c.setAppearanceLightNavigationBars(false);
		}
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
