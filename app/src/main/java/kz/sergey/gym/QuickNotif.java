package kz.sergey.gym;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

// Уведомление-виджет «+ Доход / + Расход / Чек QR» с итогом дня.
// В начале нового дня (после «конца дня») текст обновляется сам, даже если приложение закрыто.
public class QuickNotif extends BroadcastReceiver {
    static PendingIntent quickIntent(Context c, String k, int code) {
        Intent i = new Intent(c, MainActivity.class).putExtra("quick", k)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(c, code, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static void post(Context c, String text) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (android.os.Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel("quick") == null) {
            NotificationChannel ch = new NotificationChannel("quick", "Быстрый ввод денег", NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        Notification.Builder b = android.os.Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, "quick") : new Notification.Builder(c);
        b.setSmallIcon(R.drawable.ic_stat).setContentTitle("Зал · деньги").setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setOngoing(true).setShowWhen(false).setOnlyAlertOnce(true)
                .setContentIntent(quickIntent(c, "money", 10))
                .addAction(new Notification.Action.Builder(null, "+ Доход", quickIntent(c, "inc", 11)).build())
                .addAction(new Notification.Action.Builder(null, "+ Расход", quickIntent(c, "exp", 12)).build())
                .addAction(new Notification.Action.Builder(null, "Чек QR", quickIntent(c, "qr", 13)).build());
        nm.notify(7, b.build());
    }

    static void schedule(Context c, String next, long at) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent i = new Intent(c, QuickNotif.class);
        if (next != null) i.putExtra("text", next);
        PendingIntent pi = PendingIntent.getBroadcast(c, 21, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        am.cancel(pi);
        if (next != null && at > System.currentTimeMillis()) am.set(AlarmManager.RTC, at, pi);
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        String t = intent.getStringExtra("text");
        if (t == null) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        // обновляем, только если виджет ещё висит (пользователь его не выключал)
        if (nm != null && android.os.Build.VERSION.SDK_INT >= 23) {
            boolean shown = false;
            for (android.service.notification.StatusBarNotification s : nm.getActiveNotifications()) if (s.getId() == 7) shown = true;
            if (!shown) return;
        }
        post(c, t);
    }
}
