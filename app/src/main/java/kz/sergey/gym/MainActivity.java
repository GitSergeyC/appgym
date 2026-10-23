package kz.sergey.gym;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import java.util.ArrayList;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.util.List;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.os.Handler;
import android.os.Looper;

import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;

public class MainActivity extends Activity {
    private WebView web;
    private FrameLayout rootView;

    // читает позиции со страницы чека consumer.oofd.kz после того, как её соберут скрипты
    private static final String EXTRACT =
        "(function(){try{var rows=document.querySelectorAll('app-ticket-items .row-position');if(!rows.length)return null;" +
        "var items=[];for(var i=0;i<rows.length;i++){var c=rows[i].children,a=[];for(var j=0;j<c.length;j++)a.push((c[j].innerText||c[j].textContent||'').trim());items.push(a);}" +
        "var h=document.querySelector('app-ticket-header'),seller='',ht=h?(h.innerText||h.textContent||''):'';" +
        "if(h){var ps=document.querySelectorAll('p');for(var k=0;k<ps.length;k++){if(h.compareDocumentPosition(ps[k])&4){var f=ps[k].firstChild;seller=((f&&f.textContent)||ps[k].textContent||'').trim();break;}}}" +
        "return JSON.stringify({items:items,header:ht,seller:seller});}catch(e){return null}})()";

    private void js(final String code) {
        runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    public class Bridge {
        @JavascriptInterface
        public void vibrate(long ms) {
            Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (v == null) return;
            if (android.os.Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
            else v.vibrate(ms);
        }

        @JavascriptInterface
        public void keepScreenOn(final boolean on) {
            runOnUiThread(() -> web.setKeepScreenOn(on));
        }


        private String artCacheKey = null, artCacheVal = null;

        private boolean hasMusicPerm() {
            String s = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
            return s != null && s.contains(getPackageName());
        }

        private MediaController controller() {
            MediaSessionManager m = (MediaSessionManager) getSystemService(MEDIA_SESSION_SERVICE);
            List<MediaController> list = m.getActiveSessions(new ComponentName(MainActivity.this, MusicListener.class));
            if (list == null || list.isEmpty()) return null;
            for (MediaController c : list) {
                PlaybackState ps = c.getPlaybackState();
                if (ps != null && ps.getState() == PlaybackState.STATE_PLAYING) return c;
            }
            return list.get(0);
        }

        @JavascriptInterface
        public String musicState() {
            JSONObject o = new JSONObject();
            try {
                boolean perm = hasMusicPerm();
                o.put("perm", perm);
                if (!perm) return o.toString();
                MediaController c = controller();
                o.put("has", c != null);
                if (c == null) return o.toString();
                PlaybackState ps = c.getPlaybackState();
                o.put("playing", ps != null && ps.getState() == PlaybackState.STATE_PLAYING);
                PackageManager pm = getPackageManager();
                try { o.put("app", pm.getApplicationLabel(pm.getApplicationInfo(c.getPackageName(), 0)).toString()); }
                catch (Exception ignored) { o.put("app", c.getPackageName()); }
                MediaMetadata md = c.getMetadata();
                if (md != null) {
                    String title = md.getString(MediaMetadata.METADATA_KEY_TITLE);
                    String artist = md.getString(MediaMetadata.METADATA_KEY_ARTIST);
                    if (artist == null) artist = md.getString(MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE);
                    o.put("title", title == null ? "" : title);
                    o.put("artist", artist == null ? "" : artist);
                    String key = c.getPackageName() + "|" + title;
                    if (!key.equals(artCacheKey)) {
                        artCacheKey = key;
                        artCacheVal = null;
                        Bitmap b = md.getBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART);
                        if (b == null) b = md.getBitmap(MediaMetadata.METADATA_KEY_ART);
                        if (b == null) b = md.getBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON);
                        if (b != null) {
                            Bitmap sm = Bitmap.createScaledBitmap(b, 96, 96, true);
                            ByteArrayOutputStream bo = new ByteArrayOutputStream();
                            sm.compress(Bitmap.CompressFormat.JPEG, 75, bo);
                            artCacheVal = "data:image/jpeg;base64," + Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP);
                        }
                    }
                    if (artCacheVal != null) o.put("art", artCacheVal);
                }
            } catch (Exception e) {
                try { o.put("error", String.valueOf(e.getMessage())); } catch (Exception ignored) { }
            }
            return o.toString();
        }

        @JavascriptInterface
        public void musicCmd(String cmd) {
            try {
                if (!hasMusicPerm()) return;
                MediaController c = controller();
                if (c == null) return;
                MediaController.TransportControls t = c.getTransportControls();
                PlaybackState ps = c.getPlaybackState();
                boolean playing = ps != null && ps.getState() == PlaybackState.STATE_PLAYING;
                switch (cmd) {
                    case "toggle": if (playing) t.pause(); else t.play(); break;
                    case "next": t.skipToNext(); break;
                    case "prev": t.skipToPrevious(); break;
                }
            } catch (Exception ignored) { }
        }

        @JavascriptInterface
        public void openMusicPermission() {
            runOnUiThread(() -> {
                try { startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)); }
                catch (Exception e) { startActivity(new Intent(Settings.ACTION_SETTINGS)); }
            });
        }

        @JavascriptInterface
        public void openApp(final String pkg) {
            runOnUiThread(() -> {
                Intent i = getPackageManager().getLaunchIntentForPackage(pkg);
                if (i == null) {
                    i = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + pkg));
                }
                try { startActivity(i); } catch (Exception e) {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + pkg)));
                }
            });
        }


        @JavascriptInterface
        public void steps(final String date) {
            StepsHelper.read(MainActivity.this, date, (d, n) -> js("onSteps(" + JSONObject.quote(d) + "," + n + ")"));
        }

        @JavascriptInterface
        public void scanQR() {
            runOnUiThread(() -> {
                try {
                    GmsBarcodeScannerOptions opts = new GmsBarcodeScannerOptions.Builder()
                            .setBarcodeFormats(Barcode.FORMAT_QR_CODE).build();
                    GmsBarcodeScanning.getClient(MainActivity.this, opts).startScan()
                            .addOnSuccessListener(b -> {
                                String v = b.getRawValue();
                                if (v != null) js("window.onQR&&onQR(" + JSONObject.quote(v) + ")");
                            })
                            .addOnFailureListener(e -> js("window.wToast&&wToast('Сканер не запустился')"));
                } catch (Exception e) {
                    js("window.wToast&&wToast('Сканер не запустился')");
                }
            });
        }

        @JavascriptInterface
        public void fetchReceipt(final String url) {
            runOnUiThread(() -> {
                final WebView w = new WebView(MainActivity.this);
                w.getSettings().setJavaScriptEnabled(true);
                w.getSettings().setDomStorageEnabled(true);
                w.setWebViewClient(new WebViewClient());
                w.setAlpha(0f);
                rootView.addView(w, 0, new FrameLayout.LayoutParams(400, 800)); // под основным экраном, касания не перехватывает
                String u = url.startsWith("http://") ? "https://" + url.substring(7) : url;
                w.loadUrl(u);
                final Handler h = new Handler(Looper.getMainLooper());
                final int[] tries = {0};
                final boolean[] done = {false};
                h.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        if (done[0]) return;
                        tries[0]++;
                        w.evaluateJavascript(EXTRACT, v -> {
                            if (done[0]) return;
                            boolean ok = v != null && !v.equals("null") && v.length() > 4;
                            if (ok || tries[0] >= 25) {
                                done[0] = true;
                                js("window.onReceipt&&onReceipt(" + (ok ? v : "null") + "," + JSONObject.quote(url) + ")");
                                rootView.removeView(w);
                                w.destroy();
                            } else {
                                h.postDelayed(this, 1000);
                            }
                        });
                    }
                }, 2500);
            });
        }

        @JavascriptInterface
        public void voice() {
            runOnUiThread(() -> {
                Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ru-RU");
                i.putExtra(RecognizerIntent.EXTRA_PROMPT, "Например: пиво 900, чипсы 600");
                try { startActivityForResult(i, 88); }
                catch (Exception e) { js("window.onVoice&&onVoice(null)"); }
            });
        }

        @JavascriptInterface
        public void stepsConnect() {
            runOnUiThread(() -> {
                try {
                    if (StepsHelper.status(MainActivity.this) == 3) {
                        startActivityForResult(StepsHelper.permissionIntent(MainActivity.this), 77);
                        return;
                    }
                } catch (Exception ignored) { }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding")));
                } catch (Exception e) {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")));
                }
            });
        }

        @JavascriptInterface
        public void scan() {
            runOnUiThread(() -> {
                try {
                    GmsBarcodeScannerOptions opts = new GmsBarcodeScannerOptions.Builder()
                            .setBarcodeFormats(Barcode.FORMAT_EAN_13, Barcode.FORMAT_EAN_8,
                                    Barcode.FORMAT_UPC_A, Barcode.FORMAT_UPC_E, Barcode.FORMAT_CODE_128)
                            .build();
                    GmsBarcodeScanner scanner = GmsBarcodeScanning.getClient(MainActivity.this, opts);
                    scanner.startScan()
                            .addOnSuccessListener(b -> {
                                String v = b.getRawValue();
                                if (v != null) js("onScan(" + JSONObject.quote(v) + ")");
                            })
                            .addOnFailureListener(e -> js("onScanError(" + JSONObject.quote(String.valueOf(e.getMessage())) + ")"));
                } catch (Exception e) {
                    js("onScanError(" + JSONObject.quote(String.valueOf(e.getMessage())) + ")");
                }
            });
        }

        @JavascriptInterface
        public void lookup(final String code) {
            new Thread(() -> {
                String body = null;
                HttpURLConnection c = null;
                try {
                    URL u = new URL("https://world.openfoodfacts.org/api/v2/product/" + URLEncoder.encode(code, "UTF-8")
                            + ".json?fields=product_name,product_name_ru,nutriments");
                    c = (HttpURLConnection) u.openConnection();
                    c.setConnectTimeout(10000);
                    c.setReadTimeout(15000);
                    c.setRequestProperty("User-Agent", "ZalTracker/1.1 (Android; personal use)");
                    int status = c.getResponseCode();
                    java.io.InputStream in = status < 400 ? c.getInputStream() : c.getErrorStream();
                    if (in != null) {
                        StringBuilder sb = new StringBuilder();
                        BufferedReader r = new BufferedReader(new InputStreamReader(in, "UTF-8"));
                        String line;
                        while ((line = r.readLine()) != null) sb.append(line);
                        r.close();
                        body = sb.toString();
                    }
                    if (status >= 500) body = null;
                } catch (Exception e) {
                    body = null;
                } finally {
                    if (c != null) c.disconnect();
                }
                js("onLookup(" + JSONObject.quote(code) + "," + (body == null ? "null" : JSONObject.quote(body)) + ")");
            }).start();
        }
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        web.addJavascriptInterface(new Bridge(), "Android");
        rootView = new FrameLayout(this);
        rootView.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(rootView);
        if (state != null) web.restoreState(state);
        else web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == 77) js("window.onStepsPerm&&onStepsPerm()");
        if (req == 88 && res == RESULT_OK && data != null) {
            ArrayList<String> r = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (r != null && !r.isEmpty()) js("window.onVoice&&onVoice(" + JSONObject.quote(r.get(0)) + ")");
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) js("window.onAppResume&&onAppResume()");
    }

    @Override
    protected void onPause() { super.onPause(); web.evaluateJavascript("window.saveNow&&saveNow()", null); }
}
