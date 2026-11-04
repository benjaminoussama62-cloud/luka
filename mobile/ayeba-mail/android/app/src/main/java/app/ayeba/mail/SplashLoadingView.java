package app.ayeba.mail;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PathMeasure;
import android.graphics.RectF;
import android.graphics.Shader;
import android.view.View;
import android.view.animation.LinearInterpolator;

// Vue de chargement : enveloppe statique au centre + une ligne lumineuse
// qui court le long du cadre arrondi (comme un tracé qui dessine le carré).
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
    framePaint.setColor(0x2E00B4FF);
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
    // Cadre (repère de l'icône 512 : anneau 22..490, rayon 92)
    framePath.reset();
    framePath.addRoundRect(new RectF(22 * s, 22 * s, 490 * s, 490 * s), 92 * s, 92 * s, Path.Direction.CW);
    measure = new PathMeasure(framePath, true);
    perimeter = measure.getLength();
    // Enveloppe : corps 104..408 x 158..354 r30 + chevron
    envBox.reset();
    envBox.addRoundRect(new RectF(104 * s, 158 * s, 408 * s, 354 * s), 30 * s, 30 * s, Path.Direction.CW);
    envFlap.reset();
    envFlap.moveTo(118 * s, 182 * s);
    envFlap.lineTo(256 * s, 296 * s);
    envFlap.lineTo(394 * s, 182 * s);
    // Dégradés cyan -> bleu -> orange (diagonale, comme le logo)
    Shader grad = new LinearGradient(0, 0, w, h,
        new int[] { 0xFF7DF0FF, 0xFF00B4FF, 0xFFE85D04 },
        new float[] { 0f, 0.45f, 1f }, Shader.TileMode.CLAMP);
    envPaint.setShader(grad);
    runnerPaint.setShader(grad);
    framePaint.setStrokeWidth(6 * s);
    runnerPaint.setStrokeWidth(14 * s);
    envPaint.setStrokeWidth(24 * s);
  }

  @Override
  protected void onDraw(Canvas canvas) {
    super.onDraw(canvas);
    if (measure == null) return;
    canvas.drawPath(framePath, framePaint);
    canvas.drawPath(envBox, envPaint);
    canvas.drawPath(envFlap, envPaint);
    // Segment de ligne qui court le long du cadre (~26% du périmètre)
    float segLen = perimeter * 0.26f;
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
