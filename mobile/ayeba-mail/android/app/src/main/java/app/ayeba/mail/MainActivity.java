package app.ayeba.mail;

import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Fond du WebView sombre dès le premier frame — aucun flash blanc
    // pendant le chargement de ayeba.app/mail.
    getBridge().getWebView().setBackgroundColor(Color.parseColor("#050507"));
  }
}
