package app.ayeba.mbongo;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.webkit.CookieManager;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONObject;

/**
 * Notifications push FCM — argent reçu/envoyé, demandes, OTP carte.
 * Le token est envoyé au serveur avec la session Ayeba du WebView.
 */
public class MbongoMessagingService extends FirebaseMessagingService {

  static final String CHANNEL_ID = "mbongo_money";

  static void ensureChannel(android.content.Context ctx) {
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel ch = new NotificationChannel(
          CHANNEL_ID, "Mouvements d'argent", NotificationManager.IMPORTANCE_HIGH);
      ch.setDescription("Transferts, dépôts, retraits, demandes et codes de paiement Ayeba Mbongo");
      NotificationManager nm = ctx.getSystemService(NotificationManager.class);
      if (nm != null) nm.createNotificationChannel(ch);
    }
  }

  @Override
  public void onNewToken(String token) {
    super.onNewToken(token);
    getSharedPreferences("mbongo_push", MODE_PRIVATE)
        .edit().putString("fcm_token", token).apply();
    registerToken(token);
  }

  /** Envoie le token au serveur avec les cookies de session du WebView. */
  static void registerToken(final String token) {
    new Thread(() -> {
      try {
        HttpURLConnection c = (HttpURLConnection)
            new URL("https://ayeba.app/api/money/push-token").openConnection();
        c.setRequestMethod("POST");
        c.setRequestProperty("Content-Type", "application/json");
        String cookies = CookieManager.getInstance().getCookie("https://ayeba.app");
        if (cookies != null) c.setRequestProperty("Cookie", cookies);
        c.setDoOutput(true);
        c.setConnectTimeout(8000);
        c.setReadTimeout(8000);
        JSONObject body = new JSONObject();
        body.put("token", token);
        OutputStream os = c.getOutputStream();
        os.write(body.toString().getBytes("UTF-8"));
        os.close();
        c.getResponseCode();
        c.disconnect();
      } catch (Exception ignored) { /* réessaiera à la prochaine ouverture */ }
    }).start();
  }

  @Override
  public void onMessageReceived(RemoteMessage msg) {
    ensureChannel(this);
    String title = "Ayeba Mbongo";
    String body = "";
    if (msg.getNotification() != null) {
      if (msg.getNotification().getTitle() != null) title = msg.getNotification().getTitle();
      if (msg.getNotification().getBody() != null) body = msg.getNotification().getBody();
    }
    if (msg.getData().containsKey("title")) title = msg.getData().get("title");
    if (msg.getData().containsKey("body")) body = msg.getData().get("body");

    Intent open = new Intent(this, MainActivity.class)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent pi = PendingIntent.getActivity(this, 0, open,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle(title)
        .setContentText(body)
        .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
        .setAutoCancel(true)
        .setContentIntent(pi)
        .setPriority(NotificationCompat.PRIORITY_HIGH);

    NotificationManager nm = getSystemService(NotificationManager.class);
    if (nm != null) nm.notify((int) (System.currentTimeMillis() % 100000), b.build());
  }
}
