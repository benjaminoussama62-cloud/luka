package app.ayeba.mbongo;

import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Fond du WebView sombre dès le premier frame — aucun flash blanc
    // pendant le chargement de ayeba.app/mbongo.
    getBridge().getWebView().setBackgroundColor(Color.parseColor("#050507"));

    // Écran de chargement natif : cadre lumineux animé autour de l'enveloppe
    // + « Ayeba Mbongo » en dessous, fondu sortant quand le webmail est prêt.
    FrameLayout root = findViewById(android.R.id.content);
    FrameLayout overlay = new FrameLayout(this);
    overlay.setBackgroundColor(Color.parseColor("#050507"));

    LinearLayout column = new LinearLayout(this);
    column.setOrientation(LinearLayout.VERTICAL);
    column.setGravity(Gravity.CENTER);
    FrameLayout.LayoutParams colLp = new FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.WRAP_CONTENT,
        FrameLayout.LayoutParams.WRAP_CONTENT,
        Gravity.CENTER);
    overlay.addView(column, colLp);

    int box = dp(150);
    column.addView(new SplashLoadingView(this), new LinearLayout.LayoutParams(box, box));

    TextView brand = new TextView(this);
    brand.setText("Ayeba Mbongo");
    brand.setTextColor(Color.parseColor("#E8EAF0"));
    brand.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
    brand.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
    brand.setLetterSpacing(0.04f);
    LinearLayout.LayoutParams brandLp = new LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        LinearLayout.LayoutParams.WRAP_CONTENT);
    brandLp.topMargin = dp(24);
    column.addView(brand, brandLp);

    root.addView(overlay,
        new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT));

    // Le webmail charge derrière : fondu sortant après le délai (fond déjà sombre).
    overlay.postDelayed(() -> overlay.animate()
        .alpha(0f)
        .setDuration(450)
        .withEndAction(() -> root.removeView(overlay))
        .start(), 2400);
  }

  private int dp(float v) {
    return (int) TypedValue.applyDimension(
        TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
  }
}
