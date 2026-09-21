package com.architektkariery.qryby;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String GAME_URL =
            "https://architektkariery.com/qryby-game.html?app=android-beta-012";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(11, 7, 20));
        getWindow().setNavigationBarColor(Color.rgb(11, 7, 20));

        try {
            webView = new WebView(this);
            webView.setBackgroundColor(Color.rgb(11, 7, 20));

            WebSettings s = webView.getSettings();
            s.setJavaScriptEnabled(true);
            s.setDomStorageEnabled(true);
            s.setDatabaseEnabled(true);
            s.setMediaPlaybackRequiresUserGesture(false);

            webView.setWebChromeClient(new WebChromeClient());
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    return false;
                }

                @Override
                public void onReceivedError(
                        WebView view,
                        WebResourceRequest request,
                        WebResourceError error) {
                    super.onReceivedError(view, request, error);
                }
            });

            setContentView(webView);
            webView.loadUrl(GAME_URL);
        } catch (Throwable t) {
            TextView error = new TextView(this);
            error.setBackgroundColor(Color.rgb(11, 7, 20));
            error.setTextColor(Color.rgb(243, 217, 133));
            error.setTextSize(18);
            error.setPadding(32, 64, 32, 32);
            error.setText("QRyby 0.1.2\n\nNie udało się uruchomić Android WebView.\n\n" +
                    t.getClass().getSimpleName() + ": " + String.valueOf(t.getMessage()));
            setContentView(error);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            try { webView.destroy(); } catch (Throwable ignored) {}
        }
        super.onDestroy();
    }
}
