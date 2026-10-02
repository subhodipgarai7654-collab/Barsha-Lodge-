#!/usr/bin/env bash
set -e

echo "=== STARTING BARSHA LODGE ANDROID APK BUILD ==="

BUILD_DIR="/tmp/barsha-apk-build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/src/com/barshalodge/tarapith"
mkdir -p "$BUILD_DIR/gen"
mkdir -p "$BUILD_DIR/bin"
mkdir -p "$BUILD_DIR/res/values"
mkdir -p "$BUILD_DIR/res/layout"
mkdir -p "$BUILD_DIR/res/drawable"
mkdir -p "$BUILD_DIR/res/mipmap-mdpi"
mkdir -p "$BUILD_DIR/res/mipmap-hdpi"
mkdir -p "$BUILD_DIR/res/mipmap-xhdpi"
mkdir -p "$BUILD_DIR/res/mipmap-xxhdpi"
mkdir -p "$BUILD_DIR/res/mipmap-xxxhdpi"

ANDROID_JAR="/tmp/android-13/android.jar"
BUILD_TOOLS="/tmp/build-tools/android-13"

if [ ! -f "$ANDROID_JAR" ]; then
  echo "Downloading Android 13 android.jar..."
  curl -sL https://dl.google.com/android/repository/platform-33_r01.zip -o /tmp/platform-33.zip
  unzip -q /tmp/platform-33.zip "android-13/android.jar" -d /tmp/
fi

if [ ! -f "$BUILD_TOOLS/d8" ]; then
  echo "Downloading Android Build Tools..."
  curl -sL https://dl.google.com/android/repository/build-tools_r33.0.2-linux.zip -o /tmp/build-tools.zip
  unzip -q /tmp/build-tools.zip -d /tmp/build-tools
fi

# 1. Generate AndroidManifest.xml
cat << 'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.barshalodge.tarapith"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk
        android:minSdkVersion="21"
        android:targetSdkVersion="33" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/AppTheme">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout"
            android:exported="true"
            android:label="@string/app_name"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# 2. Resource files
cat << 'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Barsha Lodge</string>
    <string name="error_offline">Please check your internet connection and try again.</string>
    <string name="retry">Retry</string>
</resources>
EOF

cat << 'EOF' > "$BUILD_DIR/res/values/colors.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="primary">#B45309</color>
    <color name="primary_dark">#1C1917</color>
    <color name="accent">#F59E0B</color>
    <color name="background">#1C1917</color>
</resources>
EOF

cat << 'EOF' > "$BUILD_DIR/res/values/styles.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="@android:style/Theme.NoTitleBar">
        <item name="android:windowBackground">@color/background</item>
    </style>
</resources>
EOF

cat << 'EOF' > "$BUILD_DIR/res/layout/activity_main.xml"
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/background">

    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

    <ProgressBar
        android:id="@+id/progressBar"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="4dp"
        android:layout_alignParentTop="true"
        android:indeterminate="false"
        android:max="100"
        android:visibility="gone" />

    <LinearLayout
        android:id="@+id/offlineLayout"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_centerInParent="true"
        android:orientation="vertical"
        android:gravity="center"
        android:padding="24dp"
        android:visibility="gone">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Barsha Lodge, Tarapith"
            android:textColor="#F59E0B"
            android:textSize="20sp"
            android:textStyle="bold"
            android:paddingBottom="12dp" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="@string/error_offline"
            android:textColor="#E7E5E4"
            android:textSize="14sp"
            android:gravity="center"
            android:paddingBottom="16dp" />

        <Button
            android:id="@+id/btnRetry"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="@string/retry"
            android:background="#B45309"
            android:textColor="#FFFFFF" />
    </LinearLayout>
</RelativeLayout>
EOF

# Copy app icons from public
cp public/pwa-192x192.png "$BUILD_DIR/res/mipmap-mdpi/ic_launcher.png"
cp public/pwa-192x192.png "$BUILD_DIR/res/mipmap-hdpi/ic_launcher.png"
cp public/pwa-192x192.png "$BUILD_DIR/res/mipmap-xhdpi/ic_launcher.png"
cp public/pwa-512x512.png "$BUILD_DIR/res/mipmap-xxhdpi/ic_launcher.png"
cp public/pwa-512x512.png "$BUILD_DIR/res/mipmap-xxxhdpi/ic_launcher.png"

# 3. MainActivity.java
cat << 'EOF' > "$BUILD_DIR/src/com/barshalodge/tarapith/MainActivity.java"
package com.barshalodge.tarapith;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;

public class MainActivity extends Activity {
    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout offlineLayout;
    private Button btnRetry;

    private static final String APP_URL = "https://ais-pre-55lmvatnmsrph5pgbwl73z-221829813937.asia-east1.run.app";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        progressBar = findViewById(R.id.progressBar);
        offlineLayout = findViewById(R.id.offlineLayout);
        btnRetry = findViewById(R.id.btnRetry);

        setupWebView();

        btnRetry.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                offlineLayout.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
                webView.reload();
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(APP_URL);
        }
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString(settings.getUserAgentString() + " BarshaLodgeAndroidApp/1.0");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleCustomUri(url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    return handleCustomUri(request.getUrl().toString());
                }
                return false;
            }

            private boolean handleCustomUri(String url) {
                if (url == null) return false;

                // Handle WhatsApp, UPI, Call, Mail, and Maps externally
                if (url.startsWith("tel:") ||
                    url.startsWith("mailto:") ||
                    url.startsWith("whatsapp:") ||
                    url.startsWith("https://wa.me/") ||
                    url.startsWith("https://api.whatsapp.com/") ||
                    url.startsWith("upi://") ||
                    url.startsWith("geo:") ||
                    url.startsWith("https://maps.google.com/") ||
                    url.startsWith("https://www.google.com/maps/")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        return false;
                    }
                }

                // If loading barsha lodge website, keep inside webview
                if (url.contains("run.app") || url.contains("barshalodge") || url.startsWith("/")) {
                    return false;
                }

                // External browser for other links
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) {
                    webView.setVisibility(View.GONE);
                    offlineLayout.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                offlineLayout.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }
}
EOF

# 4. Generate R.java with AAPT
echo "Generating R.java with AAPT..."
aapt package -f -m \
  -J "$BUILD_DIR/gen" \
  -M "$BUILD_DIR/AndroidManifest.xml" \
  -S "$BUILD_DIR/res" \
  -I "$ANDROID_JAR"

# 5. Compile Java bytecode
echo "Compiling Java source files..."
javac -cp "$ANDROID_JAR" \
  -source 1.8 -target 1.8 \
  -d "$BUILD_DIR/bin" \
  "$BUILD_DIR/gen/com/barshalodge/tarapith/R.java" \
  "$BUILD_DIR/src/com/barshalodge/tarapith/MainActivity.java"

# 6. Dex bytecode using D8
echo "Dexing bytecode with D8..."
"$BUILD_TOOLS/d8" \
  --output "$BUILD_DIR/bin" \
  --lib "$ANDROID_JAR" \
  --min-api 21 \
  "$BUILD_DIR/bin/com/barshalodge/tarapith"/*.class

# 7. Package Resources into unaligned APK
echo "Packaging resources into APK..."
aapt package -f \
  -M "$BUILD_DIR/AndroidManifest.xml" \
  -S "$BUILD_DIR/res" \
  -I "$ANDROID_JAR" \
  -F "$BUILD_DIR/bin/unaligned.apk"

# 8. Add classes.dex into unaligned APK
echo "Adding classes.dex..."
(cd "$BUILD_DIR/bin" && aapt add unaligned.apk classes.dex)

# 9. Zipalign APK (4-byte boundary)
echo "Aligning APK with zipalign..."
zipalign -v -p -f 4 "$BUILD_DIR/bin/unaligned.apk" "$BUILD_DIR/bin/aligned.apk"

# 10. Generate Release Keystore if needed
KEYSTORE="$BUILD_DIR/barsha-release.keystore"
if [ ! -f "$KEYSTORE" ]; then
  echo "Generating signing key..."
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias barshalodge \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass barsha2026 \
    -keypass barsha2026 \
    -dname "CN=Barsha Lodge, OU=Hotel, O=Barsha Lodge, L=Tarapith, ST=West Bengal, C=IN"
fi

# 11. Sign with apksigner (v1, v2, v3 signature schemes)
mkdir -p public/downloads
mkdir -p dist/downloads

echo "Signing APK with apksigner..."
apksigner sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:barsha2026 \
  --key-pass pass:barsha2026 \
  --ks-key-alias barshalodge \
  --out "public/BarshaLodge-release.apk" \
  "$BUILD_DIR/bin/aligned.apk"

# 12. Copy to download locations
cp "public/BarshaLodge-release.apk" "public/downloads/BarshaLodge-release.apk"
if [ -d "dist" ]; then
  cp "public/BarshaLodge-release.apk" "dist/BarshaLodge-release.apk"
  cp "public/BarshaLodge-release.apk" "dist/downloads/BarshaLodge-release.apk"
fi

# 13. Verify Signature
echo "Verifying APK Signature..."
apksigner verify --verbose "public/BarshaLodge-release.apk"

echo "=== APK BUILD COMPLETED SUCCESSFULLY ==="
ls -lh "public/BarshaLodge-release.apk"
