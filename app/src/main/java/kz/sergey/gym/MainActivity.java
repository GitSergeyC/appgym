package kz.sergey.gym;

import android.app.Activity;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

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
        setContentView(web);
        if (state != null) web.restoreState(state);
        else web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }

    @Override
    protected void onPause() { super.onPause(); web.evaluateJavascript("window.saveNow&&saveNow()", null); }
}
