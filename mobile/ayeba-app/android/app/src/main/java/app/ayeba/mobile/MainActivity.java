package app.ayeba.mobile;

import com.getcapacitor.BridgeActivity;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
	@Override
	public void onBackPressed() {
		WebView webView = getBridge().getWebView();
		if (webView != null && webView.canGoBack()) {
			webView.goBack();
			return;
		}
		super.onBackPressed();
	}
}
