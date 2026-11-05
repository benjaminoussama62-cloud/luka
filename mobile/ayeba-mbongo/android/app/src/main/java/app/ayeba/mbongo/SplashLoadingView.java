package app.ayeba.mbongo;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PathMeasure;
import android.graphics.RectF;
import android.graphics.Shader;
import android.view.View;
import android.view.animation.LinearInterpolator;

// Écran de chargement : cadre arrondi + enveloppe dégradée (couleurs du store)
// + une ligne lumineuse qui court le long du cadre. Fond transparent — la
// vue flotte sur l'écran noir, identique au rendu souhaité.
public class SplashLoadingView extends View {
  private final Paint framePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint runnerPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint envPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Path framePath = new Path();
  private final Path segPath = new Path();
  private final Path envBox = new Path();
  private final Path envFlap = new Path();
  private PathMeasure measure;
  private float perimeter;
  private float head;
  private final ValueAnimator anim;

  public SplashLoadingView(Context context) {
    super(context);
    framePaint.setStyle(Paint.Style.STROKE);
    framePaint.setColor(0x5900B4FF);
    runnerPaint.setStyle(Paint.Style.STROKE);
    runnerPaint.setStrokeCap(Paint.Cap.ROUND);
    envPaint.setStyle(Paint.Style.STROKE);
    envPaint.setStrokeCap(Paint.Cap.ROUND);
    envPaint.setStrokeJoin(Paint.Join.ROUND);
    anim = ValueAnimator.ofFloat(0f, 1f);
    anim.setDuration(1700);
    anim.setInterpolator(new LinearInterpolator());
    anim.setRepeatCount(ValueAnimator.INFINITE);
    anim.addUpdateListener(a -> {
      head = perimeter * (Float) a.getAnimatedValue();
      invalidate();
    });
    anim.start();
  }

  @Override
  protected void onSizeChanged(int w, int h, int oldw, int oldh) {
    super.onSizeChanged(w, h, oldw, oldh);
    float s = w / 512f;
    // Contour arrondi (anneau 22..490, rayon 92) — le cadre que la ligne trace
    framePath.reset();
    framePath.addRoundRect(new RectF(22 * s, 22 * s, 490 * s, 490 * s), 92 * s, 92 * s, Path.Direction.CW);
    framePaint.setStrokeWidth(6 * s);
    measure = new PathMeasure(framePath, true);
    perimeter = measure.getLength();
    // Enveloppe : corps 104..408 x 158..354 r30 + chevron — le dégradé cyan->orange
    // est appliqué SUR L'ENVELOPPE (son bounding box), comme l'icône du store.
    envBox.reset();
    // Portefeuille : corps 96..416 x 152..360 r34 + encart carte 276..416 x 212..308 r24
    envBox.addRoundRect(new RectF(96 * s, 152 * s, 416 * s, 360 * s), 34 * s, 34 * s, Path.Direction.CW);
    envFlap.reset();
    envFlap.addRoundRect(new RectF(276 * s, 212 * s, 416 * s, 308 * s), 24 * s, 24 * s, Path.Direction.CW);
    // bouton rond : petit cercle plein dessiné comme contour (envPaint = STROKE)
    envFlap.addCircle(352 * s, 260 * s, 14 * s, Path.Direction.CW);
    envPaint.setShader(new LinearGradient(
        96 * s + 0.2f * 320 * s, 152 * s + 0.1f * 208 * s,
        96 * s + 0.8f * 320 * s, 152 * s + 0.9f * 208 * s,
        new int[] { 0xFF7DF0FF, 0xFF00B4FF, 0xFFE85D04 },
        new float[] { 0f, 0.45f, 1f }, Shader.TileMode.CLAMP));
    envPaint.setStrokeWidth(24 * s);
    // Ligne qui trace le cadre : même dégradé que l'enveloppe
    runnerPaint.setShader(new LinearGradient(0, 0, w, h,
        new int[] { 0xFF7DF0FF, 0xFF00B4FF, 0xFFE85D04 },
        new float[] { 0f, 0.45f, 1f }, Shader.TileMode.CLAMP));
    runnerPaint.setStrokeWidth(10 * s);
  }

  @Override
  protected void onDraw(Canvas canvas) {
    super.onDraw(canvas);
    if (measure == null) return;
    canvas.drawPath(framePath, framePaint);
    canvas.drawPath(envBox, envPaint);
    canvas.drawPath(envFlap, envPaint);
    // Segment lumineux qui court le long du cadre (~24% du périmètre)
    float segLen = perimeter * 0.24f;
    segPath.reset();
    if (head + segLen <= perimeter) {
      measure.getSegment(head, head + segLen, segPath, true);
    } else {
      measure.getSegment(head, perimeter, segPath, true);
      measure.getSegment(0, head + segLen - perimeter, segPath, true);
    }
    canvas.drawPath(segPath, runnerPaint);
  }

  @Override
  protected void onDetachedFromWindow() {
    anim.cancel();
    super.onDetachedFromWindow();
  }
}
