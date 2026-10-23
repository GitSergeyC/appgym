package kz.sergey.gym;

import android.app.Notification;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONObject;

// Доступ к уведомлениям: управление музыкой и входящие операции из Kaspi.
public class MusicListener extends NotificationListenerService {
    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            String pkg = sbn.getPackageName();
            if (pkg == null || !pkg.startsWith("kz.kaspi")) return;
            Bundle ex = sbn.getNotification().extras;
            CharSequence title = ex.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence big = ex.getCharSequence(Notification.EXTRA_BIG_TEXT);
            CharSequence text = ex.getCharSequence(Notification.EXTRA_TEXT);
            String body = big != null ? big.toString() : text != null ? text.toString() : "";
            if (!body.contains("₸") && !body.matches("(?s).*\\d.*")) return;
            String t = title == null ? "" : title.toString();
            SharedPreferences sp = getSharedPreferences("kaspi", MODE_PRIVATE);
            JSONArray a = new JSONArray(sp.getString("q", "[]"));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                if (o.optString("b").equals(body) && o.optString("t").equals(t)
                        && Math.abs(o.optLong("time") - sbn.getPostTime()) < 120000) return; // то же уведомление обновилось
            }
            JSONObject o = new JSONObject();
            o.put("t", t);
            o.put("b", body);
            o.put("time", sbn.getPostTime());
            a.put(o);
            JSONArray keep = new JSONArray();
            for (int i = Math.max(0, a.length() - 200); i < a.length(); i++) keep.put(a.get(i));
            sp.edit().putString("q", keep.toString()).apply();
        } catch (Exception ignored) { }
    }
}
