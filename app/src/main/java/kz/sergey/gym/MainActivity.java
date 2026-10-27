package kz.sergey.gym;

import android.app.Activity;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.media.ExifInterface;
import android.provider.MediaStore;
import androidx.core.content.FileProvider;
import com.googlecode.tesseract.android.TessBaseAPI;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.pm.PackageManager;
import android.content.ComponentName;
import android.content.Intent;
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
    private String pendingQuick = null, pendingNotif = null;
    private boolean pageReady = false;
    private Uri camUri = null;

    // словари tesseract из assets → в папку приложения (один раз)
    private String tessDir() throws Exception {
        File dir = new File(getFilesDir(), "tessdata");
        if (!dir.exists()) dir.mkdirs();
        for (String n : new String[]{"rus.traineddata", "eng.traineddata"}) {
            File f = new File(dir, n);
            if (f.exists() && f.length() > 0) continue;
            try (InputStream in = getAssets().open("tessdata/" + n); OutputStream out = new FileOutputStream(f)) {
                byte[] buf = new byte[65536];
                int r;
                while ((r = in.read(buf)) > 0) out.write(buf, 0, r);
            }
        }
        return getFilesDir().getAbsolutePath();
    }

    private Bitmap loadForOcr(Uri u) throws Exception { return contrast(loadRotated(u)); }

    // Вырезаем светлый лист чека из фона (стол, рука) и делаем ч/б с локальным порогом:
    // текстура дерева и тени перестают мешать распознаванию.
    private Bitmap binarize(Bitmap b) {
        int W = b.getWidth(), H = b.getHeight();
        int[] px = new int[W * H];
        b.getPixels(px, 0, W, 0, 0, W, H);
        int[] hist = new int[256];
        int[] lum = new int[W * H];
        for (int i = 0; i < px.length; i++) {
            int c = px[i], l = (((c >> 16) & 255) * 299 + ((c >> 8) & 255) * 587 + (c & 255) * 114) / 1000;
            lum[i] = l; hist[l]++;
        }
        int acc = 0, p90 = 255;
        for (int v = 0; v < 256; v++) { acc += hist[v]; if (acc >= px.length * 0.9) { p90 = v; break; } }
        int thr = (int) (p90 * 0.85);
        int x0 = W, x1 = -1, y0 = H, y1 = -1;
        for (int y = 0; y < H; y++) { int n = 0; for (int x = 0; x < W; x++) if (lum[y * W + x] > thr) n++; if (n > W * 0.25) { if (y < y0) y0 = y; y1 = y; } }
        for (int x = 0; x < W; x++) { int n = 0; for (int y = 0; y < H; y++) if (lum[y * W + x] > thr) n++; if (n > H * 0.25) { if (x < x0) x0 = x; x1 = x; } }
        if (x1 - x0 < W * 0.2 || y1 - y0 < H * 0.2) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; }
        Bitmap crop = Bitmap.createBitmap(b, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
        int w = 1000, h = Math.max(1, Math.round(crop.getHeight() * 1000f / crop.getWidth()));
        Bitmap sc = Bitmap.createScaledBitmap(crop, w, h, true);
        int[] q = new int[w * h];
        sc.getPixels(q, 0, w, 0, 0, w, h);
        int[] L = new int[w * h];
        for (int i = 0; i < q.length; i++) { int c = q[i]; L[i] = (((c >> 16) & 255) * 299 + ((c >> 8) & 255) * 587 + (c & 255) * 114) / 1000; }
        long[] ii = new long[(w + 1) * (h + 1)];
        for (int y = 0; y < h; y++) { long row = 0; for (int x = 0; x < w; x++) { row += L[y * w + x]; ii[(y + 1) * (w + 1) + x + 1] = ii[y * (w + 1) + x + 1] + row; } }
        int r = 25;
        for (int y = 0; y < h; y++) {
            int ya = Math.max(0, y - r), yb = Math.min(h, y + r + 1);
            for (int x = 0; x < w; x++) {
                int xa = Math.max(0, x - r), xb = Math.min(w, x + r + 1);
                long sum = ii[yb * (w + 1) + xb] - ii[ya * (w + 1) + xb] - ii[yb * (w + 1) + xa] + ii[ya * (w + 1) + xa];
                long mean = sum / ((long) (yb - ya) * (xb - xa));
                q[y * w + x] = L[y * w + x] < mean - 12 ? 0xFF000000 : 0xFFFFFFFF;
            }
        }
        Bitmap out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        out.setPixels(q, 0, w, 0, 0, w, h);
        return out;
    }

    private Bitmap loadRotated(Uri u) throws Exception {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        try (InputStream in = getContentResolver().openInputStream(u)) { BitmapFactory.decodeStream(in, null, o); }
        int max = Math.max(o.outWidth, o.outHeight), sample = 1;
        while (max / sample > 3000) sample *= 2;
        BitmapFactory.Options o2 = new BitmapFactory.Options();
        o2.inSampleSize = sample;
        Bitmap b;
        try (InputStream in = getContentResolver().openInputStream(u)) { b = BitmapFactory.decodeStream(in, null, o2); }
        int rot = 0;
        try (InputStream in = getContentResolver().openInputStream(u)) {
            int or = new ExifInterface(in).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
            rot = or == ExifInterface.ORIENTATION_ROTATE_90 ? 90 : or == ExifInterface.ORIENTATION_ROTATE_180 ? 180 : or == ExifInterface.ORIENTATION_ROTATE_270 ? 270 : 0;
        } catch (Exception ignored) { }
        if (rot != 0) {
            Matrix m = new Matrix();
            m.postRotate(rot);
            b = Bitmap.createBitmap(b, 0, 0, b.getWidth(), b.getHeight(), m, true);
        }
        return b;
    }

    private Bitmap contrast(Bitmap b) {
        // серый и контраст: термобумага бледная
        Bitmap g = Bitmap.createBitmap(b.getWidth(), b.getHeight(), Bitmap.Config.ARGB_8888);
        ColorMatrix cm = new ColorMatrix();
        cm.setSaturation(0);
        float c = 1.6f, t = -0.3f * 255;
        ColorMatrix con = new ColorMatrix(new float[]{c,0,0,0,t, 0,c,0,0,t, 0,0,c,0,t, 0,0,0,1,0});
        cm.postConcat(con);
        Paint p = new Paint();
        p.setColorFilter(new ColorMatrixColorFilter(cm));
        new Canvas(g).drawBitmap(b, 0, 0, p);
        return g;
    }

    private void runOcr(final Uri u) {
        js("window.onOcrStart&&onOcrStart()");
        new Thread(() -> {
            String text = null;
            TessBaseAPI tess = new TessBaseAPI();
            try {
                Bitmap raw = loadRotated(u);
                Bitmap bin = binarize(raw), con = contrast(raw);
                if (tess.init(tessDir(), "rus+eng")) {
                    // три прохода: ч/б вырезанный чек «колонкой» и «блоком» + прежний серый; JS выберет лучший и сверит суммы
                    StringBuilder sb = new StringBuilder();
                    Object[][] runs = {{bin, TessBaseAPI.PageSegMode.PSM_SINGLE_COLUMN}, {bin, TessBaseAPI.PageSegMode.PSM_SINGLE_BLOCK}, {con, TessBaseAPI.PageSegMode.PSM_SINGLE_COLUMN}};
                    for (Object[] r : runs) {
                        tess.setPageSegMode((Integer) r[1]);
                        tess.setImage((Bitmap) r[0]);
                        String t = tess.getUTF8Text();
                        if (sb.length() > 0) sb.append("\n=====\n");
                        sb.append(t == null ? "" : t);
                    }
                    text = sb.toString();
                }
            } catch (Throwable e) {
                text = null;
            } finally {
                try { tess.recycle(); } catch (Throwable ignored) { }
            }
            js("window.onOcr&&onOcr(" + (text == null ? "null" : JSONObject.quote(text)) + ")");
        }).start();
    }

    private void postNotif(String text) { QuickNotif.post(this, text); }

    // «Поделиться» из других приложений: текст (заметка со списком покупок) или фото чека
    private void handleShare(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        String type = intent.getType();
        intent.setAction(null);
        if (type != null && type.startsWith("image/")) {
            Uri u = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (u != null) runOcr(u);
            return;
        }
        String t = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (t != null && !t.trim().isEmpty()) js("window.onShareText&&onShareText(" + JSONObject.quote(t) + ")");
    }

    private void handleQuick(Intent intent) {
        if (intent == null) return;
        String k = intent.getStringExtra("quick");
        if (k == null) return;
        intent.removeExtra("quick");
        if (pageReady) js("window.onQuick&&onQuick(" + JSONObject.quote(k) + ")");
        else pendingQuick = k;
    }

    // читает позиции со страницы чека consumer.oofd.kz после того, как её соберут скрипты
    private static final String EXTRACT =
        "(function(){try{var rows=document.querySelectorAll('app-ticket-items .row-position');if(!rows.length)rows=document.querySelectorAll('.row-position,[class*=ticket-item],[class*=position-row]');if(!rows.length)return null;" +
        "var items=[];for(var i=0;i<rows.length;i++){var c=rows[i].children,a=[];for(var j=0;j<c.length;j++)a.push((c[j].innerText||c[j].textContent||'').trim());items.push(a);}" +
        "var h=document.querySelector('app-ticket-header'),seller='',ht=h?(h.innerText||h.textContent||''):'';" +
        "if(h){var ps=document.querySelectorAll('p');for(var k=0;k<ps.length;k++){if(h.compareDocumentPosition(ps[k])&4){var f=ps[k].firstChild;seller=((f&&f.textContent)||ps[k].textContent||'').trim();break;}}}" +
        "return JSON.stringify({items:items,header:ht,seller:seller});}catch(e){return null}})()";

    private static final String BODY = "(function(){try{return (document.body.innerText||'').slice(0,4000)}catch(e){return ''}})()";

    private final java.util.ArrayList<String> pendingJs = new java.util.ArrayList<>();
    private void js(final String code) {
        runOnUiThread(() -> {
            if (!pageReady) { pendingJs.add(code); return; }   // страница ещё грузится (например, после камеры приложение перезапустилось)
            web.evaluateJavascript(code, null);
        });
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
        public void notify(final String text) {
            runOnUiThread(() -> {
                if (android.os.Build.VERSION.SDK_INT >= 33
                        && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                    pendingNotif = text;
                    requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 6);
                    return;
                }
                postNotif(text);
            });
        }

        // текст сейчас + текст, который подставится сам в начале следующего дня (после «конца дня», 4:00)
        @JavascriptInterface
        public void notify2(final String text, final String next, final double at) {
            notify(text);
            QuickNotif.schedule(MainActivity.this, next, (long) at);
        }

        @JavascriptInterface
        public void notifyOff() {
            QuickNotif.schedule(MainActivity.this, null, 0);
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(7);
        }

        @JavascriptInterface
        public void photo(final String src) {
            runOnUiThread(() -> {
                try {
                    if ("gal".equals(src)) {
                        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                        i.setType("image/*");
                        startActivityForResult(Intent.createChooser(i, "Фото чека"), 92);
                    } else {
                        File f = new File(getCacheDir(), "receipt.jpg");
                        camUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".files", f);
                        getSharedPreferences("zal", MODE_PRIVATE).edit().putString("camUri", camUri.toString()).apply();
                        Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                        i.putExtra(MediaStore.EXTRA_OUTPUT, camUri);
                        i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivityForResult(i, 91);
                    }
                } catch (Exception e) {
                    js("window.wToast&&wToast('Камера недоступна')");
                }
            });
        }

        @JavascriptInterface
        public String version() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return ""; }
        }

        @JavascriptInterface
        public boolean listenerOn() { return hasMusicPerm(); }

        // забрать накопленные уведомления Kaspi и очистить очередь
        @JavascriptInterface
        public String kaspiInbox() {
            android.content.SharedPreferences sp = getSharedPreferences("kaspi", MODE_PRIVATE);
            String q = sp.getString("q", "[]");
            sp.edit().putString("q", "[]").apply();
            return q;
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
                            if (ok) {
                                done[0] = true;
                                js("window.onReceipt&&onReceipt(" + v + "," + JSONObject.quote(url) + ")");
                                rootView.removeView(w);
                                w.destroy();
                            } else if (tries[0] >= 25) {
                                done[0] = true;
                                // позиций нет — отдаём текст страницы: по нему видно «чек не найден» и т.п.
                                w.evaluateJavascript(BODY, body -> {
                                    js("window.onReceipt&&onReceipt(null," + JSONObject.quote(url) + "," + (body == null ? "\"\"" : body) + ")");
                                    rootView.removeView(w);
                                    w.destroy();
                                });
                            } else {
                                h.postDelayed(this, 1000);
                            }
                        });
                    }
                }, 2500);
            });
        }

        @JavascriptInterface
        public void openUrl(final String url) {
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) { }
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
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                if (!pendingJs.isEmpty()) {
                    final ArrayList<String> q = new ArrayList<>(pendingJs);
                    pendingJs.clear();
                    view.postDelayed(() -> { for (String c : q) view.evaluateJavascript(c, null); }, 700);
                }
                if (pendingQuick != null) {
                    final String k = pendingQuick;
                    pendingQuick = null;
                    view.postDelayed(() -> js("window.onQuick&&onQuick(" + JSONObject.quote(k) + ")"), 400);
                }
            }
        });
        handleQuick(getIntent());
        handleShare(getIntent());
        rootView = new FrameLayout(this);
        rootView.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(rootView);
        if (state != null) web.restoreState(state);
        else web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleQuick(intent);
        handleShare(intent);
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        super.onRequestPermissionsResult(req, perms, res);
        if (req == 6 && res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED && pendingNotif != null) postNotif(pendingNotif);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == 77) js("window.onStepsPerm&&onStepsPerm()");
        if (req == 91 && camUri == null) {   // приложение могли выгрузить, пока открыта камера
            String cu = getSharedPreferences("zal", MODE_PRIVATE).getString("camUri", null);
            if (cu != null) camUri = Uri.parse(cu);
        }
        if (req == 91 && res == RESULT_OK && camUri != null) runOcr(camUri);
        else if (req == 92 && res == RESULT_OK && data != null && data.getData() != null) runOcr(data.getData());
        else if (req == 91 || req == 92) js("window.onPhotoCancel&&onPhotoCancel(" + (res == RESULT_OK) + ")");
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
