package com.architektkariery.qryby;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String GAME_URL = "https://architektkariery.com/qryby-game.html?app=android&v=2";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        hideSystemBars();

        try {
            webView = new WebView(this);
            webView.setBackgroundColor(Color.rgb(11, 7, 20));
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setLoadWithOverviewMode(false);
            settings.setUseWideViewPort(true);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);

            webView.setWebChromeClient(new WebChromeClient());
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    String host = uri.getHost();
                    if (host != null && (host.equals("architektkariery.com") || host.endsWith(".architektkariery.com"))) {
                        return false;
                    }
                    String scheme = uri.getScheme();
                    if ("http".equals(scheme) || "https".equals(scheme)) {
                        try {
                            startActivity(new Intent(Intent.ACTION_VIEW, uri));
                            return true;
                        } catch (Exception ignored) {}
                    }
                    return false;
                }
            });

            setContentView(webView);
            webView.loadUrl(GAME_URL);
        } catch (Throwable t) {
            Toast.makeText(this, "Nie udało się uruchomić silnika QRyb. Otwieram wersję online.", Toast.LENGTH_LONG).show();
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://architektkariery.com/qryby-game.html")));
            } catch (Exception ignored) {}
            finish();
        }
    }

    private void hideSystemBars() {
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            moveTaskToBack(true);
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            try {
                webView.stopLoading();
                webView.loadUrl("about:blank");
                webView.removeAllViews();
                webView.destroy();
            } catch (Exception ignored) {}
        }
        super.onDestroy();
    }
}
