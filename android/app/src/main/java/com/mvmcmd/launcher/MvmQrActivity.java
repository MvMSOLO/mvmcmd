package com.mvmcmd.launcher;

import android.Manifest;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Base64;
import android.content.pm.PackageManager;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.text.method.ScrollingMovementMethod;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;

import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MvmQrActivity extends AppCompatActivity {

    private static final int REQ_CAMERA = 811;

    private PreviewView previewView;
    private FrameLayout root;
    private ScanAuraView aura;
    private TextView status;
    private TextView flash;
    private TextView imageButton;
    private ActivityResultLauncher<String> imagePicker;
    private Camera camera;
    private ProcessCameraProvider cameraProvider;
    private ImageAnalysis imageAnalysis;
    private BarcodeScanner scanner;
    private ExecutorService analyzerExecutor;
    private boolean scanning = true;
    private FrameLayout resultCard;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs=getSharedPreferences("mvm_qr_history",MODE_PRIVATE);

        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);

        analyzerExecutor = Executors.newSingleThreadExecutor();
        imagePicker = registerForActivityResult(
                new ActivityResultContracts.GetContent(),
                this::decodeImage
        );

        buildUi();

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.CAMERA},
                    REQ_CAMERA
            );
        } else {
            startScanner();
        }
    }

    private void buildUi() {
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        previewView = new PreviewView(this);
        previewView.setImplementationMode(PreviewView.ImplementationMode.PERFORMANCE);
        previewView.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        root.addView(previewView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        aura = new ScanAuraView(this);
        root.addView(aura, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        LinearLayout top = new LinearLayout(this);
        top.setGravity(Gravity.CENTER_VERTICAL);
        top.setPadding(dp(14), dp(12), dp(14), dp(10));
        top.setBackgroundColor(0x66000000);

        TextView back = text("‹", 34, false);
        back.setGravity(Gravity.CENTER);
        back.setOnClickListener(v -> finish());
        top.addView(back, lp(48, 48));

        LinearLayout titleBox = new LinearLayout(this);
        titleBox.setOrientation(LinearLayout.VERTICAL);
        titleBox.setPadding(dp(8), 0, 0, 0);

        TextView kicker = text("MVMCMD  ·  SCAN", 9, true);
        kicker.setTextColor(0x99FFFFFF);
        kicker.setLetterSpacing(0.20f);
        TextView title = text("QR / BARCODE", 20, true);
        titleBox.addView(kicker);
        titleBox.addView(title);
        top.addView(titleBox, new LinearLayout.LayoutParams(0, dp(48), 1f));

        imageButton = text("▧", 22, true);
        imageButton.setGravity(Gravity.CENTER);
        imageButton.setContentDescription("Scan QR or barcode from image");
        imageButton.setOnClickListener(v -> openImagePicker());
        top.addView(imageButton, lp(48, 48));

        TextView history = text("◴", 21, true);
        history.setGravity(Gravity.CENTER);
        history.setContentDescription("Open scan history");
        history.setOnClickListener(v -> showHistory());
        top.addView(history, lp(48, 48));

        flash = text("ϟ", 25, true);
        flash.setGravity(Gravity.CENTER);
        flash.setContentDescription("Toggle flashlight");
        flash.setOnClickListener(v -> toggleTorch());
        top.addView(flash, lp(48, 48));

        FrameLayout.LayoutParams topLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                dp(72),
                Gravity.TOP
        );
        root.addView(top, topLp);

        status = text("ALIGN CODE INSIDE THE FRAME", 10, true);
        status.setTextColor(0xCCFFFFFF);
        status.setGravity(Gravity.CENTER);
        status.setBackground(round(0x55000000, 20));
        FrameLayout.LayoutParams statusLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                dp(34),
                Gravity.TOP | Gravity.CENTER_HORIZONTAL
        );
        statusLp.setMargins(0, dp(86), 0, 0);
        root.addView(status, statusLp);

        setContentView(root);
    }

    private void startScanner() {
        scanning = true;

        BarcodeScannerOptions options = new BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_ALL_FORMATS)
                .enableAllPotentialBarcodes()
                .build();

        ensureScanner();

        ListenableFuture<ProcessCameraProvider> future =
                ProcessCameraProvider.getInstance(this);

        future.addListener(() -> {
            try {
                cameraProvider = future.get();

                Preview preview = new Preview.Builder().build();
                imageAnalysis = new ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .setOutputImageRotationEnabled(true)
                        .build();

                imageAnalysis.setAnalyzer(analyzerExecutor, this::analyze);

                cameraProvider.unbindAll();
                camera = cameraProvider.bindToLifecycle(
                        this,
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        preview,
                        imageAnalysis
                );
                preview.setSurfaceProvider(previewView.getSurfaceProvider());
            } catch (Exception e) {
                toast("Camera configuration failed");
                finish();
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void ensureScanner() {
        if (scanner != null) return;
        BarcodeScannerOptions options = new BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_ALL_FORMATS)
                .enableAllPotentialBarcodes()
                .build();
        scanner = BarcodeScanning.getClient(options);
    }

    private void openImagePicker() {
        if (imagePicker == null) {
            toast("Image picker unavailable");
            return;
        }
        status.setText("SELECTING IMAGE…");
        status.setTextColor(0xFFBFC8D6);
        if (resultCard != null) {
            root.removeView(resultCard);
            resultCard = null;
        }
        if (aura != null) aura.setSuccess(false);
        imagePicker.launch("image/*");
    }

    private void decodeImage(Uri uri) {
        if (uri == null) {
            status.setText("ALIGN CODE INSIDE THE FRAME");
            return;
        }

        ensureScanner();
        scanning = false;
        status.setText("DECODING IMAGE…");
        status.setTextColor(0xFFBFC8D6);

        try {
            InputImage image = InputImage.fromFilePath(this, uri);
            scanner.process(image)
                    .addOnSuccessListener(this, barcodes -> {
                        Barcode best = chooseBarcode(barcodes);
                        String raw = best == null ? null : best.getRawValue();
                        if ((raw == null || raw.trim().isEmpty()) && best != null
                                && best.getDisplayValue() != null) {
                            raw = best.getDisplayValue();
                        }

                        if (best == null || raw == null || raw.trim().isEmpty()) {
                            runOnUiThread(() -> {
                                status.setText("NO CODE FOUND");
                                status.setTextColor(0xFFFFB7A8);
                                aura.setSuccess(false);
                                toast("No QR/barcode detected in this image");
                            });
                            scanning = true;
                            return;
                        }

                        final String value = raw.trim();
                        runOnUiThread(() -> showResult(best, value));
                    })
                    .addOnFailureListener(this, e -> {
                        runOnUiThread(() -> {
                            status.setText("IMAGE DECODE FAILED");
                            status.setTextColor(0xFFFFB7A8);
                            aura.setSuccess(false);
                            toast("Could not decode this image");
                        });
                        scanning = true;
                    });
        } catch (Exception e) {
            status.setText("IMAGE OPEN FAILED");
            status.setTextColor(0xFFFFB7A8);
            aura.setSuccess(false);
            scanning = true;
            toast("Could not open this image");
        }
    }

    private void analyze(ImageProxy proxy) {
        if (!scanning) {
            proxy.close();
            return;
        }

        android.media.Image mediaImage = proxy.getImage();
        if (mediaImage == null) {
            proxy.close();
            return;
        }

        InputImage image = InputImage.fromMediaImage(
                mediaImage,
                proxy.getImageInfo().getRotationDegrees()
        );

        scanner.process(image)
                .addOnSuccessListener(this, barcodes -> {
                    if (!scanning || barcodes == null || barcodes.isEmpty()) return;

                    Barcode best = chooseBarcode(barcodes);
                    if (best == null) return;
                    String raw = best.getRawValue();
                    if ((raw == null || raw.trim().isEmpty())
                            && best.getDisplayValue() != null) {
                        raw = best.getDisplayValue();
                    }
                    if (raw == null || raw.trim().isEmpty()) return;

                    final String value = raw.trim();
                    scanning = false;
                    runOnUiThread(() -> showResult(best, value));
                })
                .addOnFailureListener(this, e -> {
                    // Keep scanning. Camera stays live even if an individual frame fails.
                })
                .addOnCompleteListener(task -> proxy.close());
    }

    private Barcode chooseBarcode(List<Barcode> barcodes) {
        if (barcodes == null || barcodes.isEmpty()) return null;
        Barcode best = barcodes.get(0);
        for (Barcode code : barcodes) {
            String raw = code.getRawValue();
            if (raw != null && !raw.trim().isEmpty()) {
                return code;
            }
        }
        return best;
    }

    private void saveHistory(String format, String raw) {
        if (prefs == null || raw == null || raw.isEmpty()) return;
        String encoded = Base64.encodeToString(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8), Base64.NO_WRAP);
        String old = prefs.getString("items", "");
        String line = System.currentTimeMillis() + "|" + format + "|" + encoded;
        String[] rows = old.isEmpty() ? new String[0] : old.split("\\n");
        StringBuilder out = new StringBuilder();
        int start = Math.max(0, rows.length - 29);
        for (int i = start; i < rows.length; i++) {
            if (i > start) out.append("\\n");
            out.append(rows[i]);
        }
        if (out.length() > 0) out.append("\\n");
        out.append(line);
        prefs.edit().putString("items", out.toString()).apply();
    }

    private void showHistory() {
        LinearLayout list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setPadding(dp(8), dp(8), dp(8), dp(8));
        String rawHistory = prefs == null ? "" : prefs.getString("items", "");
        String[] rows = rawHistory.isEmpty() ? new String[0] : rawHistory.split("\\n");
        if (rows.length == 0) {
            list.addView(text("No scans yet. Results will appear here automatically.", 14, false));
        } else {
            for (int i = rows.length - 1; i >= 0; i--) {
                String[] parts = rows[i].split("\\|", 3);
                if (parts.length < 3) continue;
                final String value;
                try {
                    value = new String(Base64.decode(parts[2], Base64.NO_WRAP), java.nio.charset.StandardCharsets.UTF_8);
                } catch (Exception ignored) {
                    continue;
                }
                TextView item = text(parts[1] + "\\n" + value, 13, false);
                item.setPadding(dp(12), dp(12), dp(12), dp(12));
                item.setBackground(round(0x6614171C, 14));
                item.setOnClickListener(v -> copy(value));
                list.addView(item, new LinearLayout.LayoutParams(-1, dp(76)));
                android.widget.Space gap = new android.widget.Space(this);
                list.addView(gap, new LinearLayout.LayoutParams(1, dp(7)));
            }
        }
        ScrollView scroll = new ScrollView(this);
        scroll.addView(list);
        new android.app.AlertDialog.Builder(this)
                .setTitle("SCAN HISTORY")
                .setView(scroll)
                .setNegativeButton("CLEAR", (d, which) -> {
                    if (prefs != null) prefs.edit().remove("items").apply();
                    toast("History cleared");
                })
                .setPositiveButton("DONE", null)
                .show();
    }

    private void showResult(Barcode code, String raw) {
        saveHistory(formatName(code.getFormat()), raw);
        if (camera != null) {
            try {
                camera.getCameraControl().enableTorch(false);
            } catch (Exception ignored) {}
        }

        if (resultCard != null) root.removeView(resultCard);

        resultCard = new FrameLayout(this);
        resultCard.setBackground(round(0xF20B0D10, 28));

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(20), dp(18), dp(20), dp(16));

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView badge = text("DECODED", 10, true);
        badge.setTextColor(0xFF9CFFD8);
        badge.setGravity(Gravity.CENTER);
        badge.setBackground(round(0x189CFFD8, 40));
        badge.setPadding(dp(12), 0, dp(12), 0);
        header.addView(badge, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, dp(30)
        ));

        TextView codeFormat = text(formatName(code.getFormat()), 12, true);
        codeFormat.setTextColor(0xFFBFC4CE);
        codeFormat.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
        header.addView(codeFormat, new LinearLayout.LayoutParams(
                0, dp(30), 1f
        ));

        content.addView(header);

        TextView type = text(valueTypeName(code.getValueType()), 24, true);
        type.setPadding(0, dp(12), 0, 0);
        content.addView(type);

        String parsed = parsedDetails(code);
        if (!parsed.isEmpty()) {
            TextView parsedView = text(parsed, 12, false);
            parsedView.setTextColor(0xFFD8DADF);
            parsedView.setPadding(0, dp(8), 0, 0);
            content.addView(parsedView);
        }

        TextView checks = text(
                "CHECKS   ✓ DECODED   ✓ VALUE PRESENT   "
                        + (browserUrl(code, raw) != null ? "✓ HTTP(S) READY" : "• NO BROWSER TARGET"),
                9,
                true
        );
        checks.setTextColor(0xFF9FA7B5);
        checks.setPadding(0, dp(12), 0, dp(8));
        content.addView(checks);

        ScrollView rawScroll = new ScrollView(this);
        rawScroll.setBackground(round(0x6614171C, 14));

        TextView rawView = text(raw, 14, false);
        rawView.setTextIsSelectable(true);
        rawView.setMovementMethod(new ScrollingMovementMethod());
        rawView.setPadding(dp(14), dp(12), dp(14), dp(12));
        rawScroll.addView(rawView);

        content.addView(rawScroll, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(92)
        ));

        LinearLayout actions = new LinearLayout(this);
        actions.setGravity(Gravity.CENTER_VERTICAL);
        actions.setPadding(0, dp(12), 0, 0);

        TextView copy = action("COPY");
        copy.setOnClickListener(v -> copy(raw));

        TextView browser = action("OPEN IN BROWSER");
        String url = browserUrl(code, raw);
        browser.setEnabled(url != null);
        browser.setAlpha(url == null ? 0.35f : 1f);
        if (url != null) {
            browser.setOnClickListener(v -> openBrowser(url));
        }

        TextView again = action("SCAN AGAIN");
        again.setOnClickListener(v -> scanAgain());

        actions.addView(copy, actionLp());
        actions.addView(browser, actionLp());
        actions.addView(again, actionLp());

        content.addView(actions);

        resultCard.addView(content);
        FrameLayout.LayoutParams cardLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                dp(390),
                Gravity.BOTTOM
        );
        cardLp.setMargins(dp(12), 0, dp(12), dp(12));
        root.addView(resultCard, cardLp);

        status.setText("RESULT READY");
        status.setTextColor(0xFF9CFFD8);
        aura.setSuccess(true);
    }

    private void scanAgain() {
        if (resultCard != null) {
            root.removeView(resultCard);
            resultCard = null;
        }
        aura.setSuccess(false);
        status.setText("ALIGN CODE INSIDE THE FRAME");
        status.setTextColor(0xCCFFFFFF);
        scanning = true;
    }

    private String parsedDetails(Barcode code) {
        try {
            switch (code.getValueType()) {
                case Barcode.TYPE_URL:
                    Barcode.UrlBookmark url = code.getUrl();
                    if (url != null) {
                        StringBuilder b = new StringBuilder();
                        if (url.getTitle() != null && !url.getTitle().isEmpty()) {
                            b.append("TITLE   ").append(url.getTitle()).append("\\n");
                        }
                        if (url.getUrl() != null && !url.getUrl().isEmpty()) {
                            b.append("URL     ").append(url.getUrl());
                        }
                        return b.toString();
                    }
                    break;
                case Barcode.TYPE_WIFI:
                    Barcode.WiFi wifi = code.getWifi();
                    if (wifi != null) {
                        StringBuilder b = new StringBuilder();
                        if (wifi.getSsid() != null) b.append("SSID    ").append(wifi.getSsid()).append("\\n");
                        if (wifi.getEncryptionType() == Barcode.WiFi.TYPE_OPEN) {
                            b.append("SECURITY OPEN");
                        } else {
                            b.append("SECURITY PROTECTED");
                        }
                        return b.toString();
                    }
                    break;
                case Barcode.TYPE_PHONE:
                    if (code.getPhone() != null && code.getPhone().getNumber() != null) {
                        return "PHONE   " + code.getPhone().getNumber();
                    }
                    break;
                case Barcode.TYPE_SMS:
                    if (code.getSms() != null) {
                        StringBuilder b = new StringBuilder();
                        if (code.getSms().getPhoneNumber() != null) {
                            b.append("TO      ").append(code.getSms().getPhoneNumber()).append("\\n");
                        }
                        if (code.getSms().getMessage() != null) {
                            b.append("MESSAGE ").append(code.getSms().getMessage());
                        }
                        return b.toString();
                    }
                    break;
                case Barcode.TYPE_GEO:
                    if (code.getGeoPoint() != null) {
                        return String.format(
                                Locale.US,
                                "LAT     %.6f\\nLONG    %.6f",
                                code.getGeoPoint().getLat(),
                                code.getGeoPoint().getLng()
                        );
                    }
                    break;
                case Barcode.TYPE_EMAIL:
                    if (code.getEmail() != null && code.getEmail().getAddress() != null) {
                        return "EMAIL   " + code.getEmail().getAddress();
                    }
                    break;
                default:
                    break;
            }
        } catch (Exception ignored) {
            // Raw value remains available even when a structured parser rejects a field.
        }
        return "";
    }

    private String browserUrl(Barcode code, String raw) {
        String candidate = null;

        if (code.getValueType() == Barcode.TYPE_URL && code.getUrl() != null) {
            candidate = code.getUrl().getUrl();
        }
        if (candidate == null || candidate.trim().isEmpty()) {
            candidate = raw;
        }
        if (candidate == null) return null;

        candidate = candidate.trim();
        if (candidate.startsWith("www.")) {
            candidate = "https://" + candidate;
        }

        Uri uri;
        try {
            uri = Uri.parse(candidate);
        } catch (Exception ignored) {
            return null;
        }

        String scheme = uri.getScheme();
        if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
            return candidate;
        }
        return null;
    }

    private void openBrowser(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception e) {
            toast("No browser found for this link");
        }
    }

    private void copy(String value) {
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm != null) {
            cm.setPrimaryClip(ClipData.newPlainText("MVMCMD QR", value));
            toast("Copied");
        }
    }

    private void toggleTorch() {
        if (camera == null) return;
        try {
            boolean enabled = camera.getCameraInfo().getTorchState().getValue() != 2;
            camera.getCameraControl().enableTorch(enabled);
            flash.setText(enabled ? "ϟ ON" : "ϟ");
        } catch (Exception e) {
            toast("Flashlight unavailable");
        }
    }

    private String formatName(int format) {
        switch (format) {
            case Barcode.FORMAT_QR_CODE: return "QR CODE";
            case Barcode.FORMAT_CODE_128: return "CODE 128";
            case Barcode.FORMAT_CODE_39: return "CODE 39";
            case Barcode.FORMAT_CODE_93: return "CODE 93";
            case Barcode.FORMAT_CODABAR: return "CODABAR";
            case Barcode.FORMAT_EAN_13: return "EAN-13";
            case Barcode.FORMAT_EAN_8: return "EAN-8";
            case Barcode.FORMAT_ITF: return "ITF";
            case Barcode.FORMAT_UPC_A: return "UPC-A";
            case Barcode.FORMAT_UPC_E: return "UPC-E";
            case Barcode.FORMAT_PDF417: return "PDF417";
            case Barcode.FORMAT_AZTEC: return "AZTEC";
            case Barcode.FORMAT_DATA_MATRIX: return "DATA MATRIX";
            default: return "BARCODE";
        }
    }

    private String valueTypeName(int type) {
        switch (type) {
            case Barcode.TYPE_URL: return "Link";
            case Barcode.TYPE_WIFI: return "Wi‑Fi";
            case Barcode.TYPE_EMAIL: return "Email";
            case Barcode.TYPE_PHONE: return "Phone";
            case Barcode.TYPE_SMS: return "SMS";
            case Barcode.TYPE_GEO: return "Location";
            case Barcode.TYPE_CONTACT_INFO: return "Contact";
            case Barcode.TYPE_CALENDAR_EVENT: return "Calendar event";
            case Barcode.TYPE_DRIVER_LICENSE: return "Driver license";
            case Barcode.TYPE_ISBN: return "ISBN";
            case Barcode.TYPE_PRODUCT: return "Product";
            case Barcode.TYPE_TEXT: return "Text";
            default: return "Detected data";
        }
    }

    private TextView action(String label) {
        TextView v = text(label, 9, true);
        v.setGravity(Gravity.CENTER);
        v.setTextColor(0xFFECEAE4);
        v.setBackground(round(0x66191C22, 12));
        v.setPadding(dp(8), 0, dp(8), 0);
        return v;
    }

    private LinearLayout.LayoutParams actionLp() {
        return new LinearLayout.LayoutParams(0, dp(44), 1f);
    }

    private TextView text(String value, int size, boolean bold) {
        TextView v = new TextView(this);
        v.setText(value);
        v.setTextColor(Color.WHITE);
        v.setTextSize(size);
        v.setTypeface(Typeface.DEFAULT, bold ? Typeface.BOLD : Typeface.NORMAL);
        return v;
    }

    private GradientDrawable round(int color, int radius) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radius));
        d.setStroke(dp(1), 0x226C7480);
        return d;
    }

    private LinearLayout.LayoutParams lp(int width, int height) {
        return new LinearLayout.LayoutParams(dp(width), dp(height));
    }

    private void toast(String value) {
        Toast.makeText(this, value, Toast.LENGTH_SHORT).show();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_CAMERA) {
            if (grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startScanner();
            } else {
                toast("Camera permission is required");
                finish();
            }
        }
    }

    @Override
    protected void onDestroy() {
        if (cameraProvider != null) {
            cameraProvider.unbindAll();
        }
        if (scanner != null) {
            scanner.close();
            scanner = null;
        }
        if (analyzerExecutor != null) {
            analyzerExecutor.shutdown();
        }
        super.onDestroy();
    }

    public static final class ScanAuraView extends View {

        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        private float phase = 0f;
        private boolean success = false;

        public ScanAuraView(Context context) {
            super(context);
            setLayerType(View.LAYER_TYPE_SOFTWARE, null);
            post(frame);
        }

        private final Runnable frame = new Runnable() {
            @Override
            public void run() {
                phase += 0.035f;
                if (phase > 1f) phase -= 1f;
                invalidate();
                postDelayed(this, 16);
            }
        };

        public void setSuccess(boolean value) {
            success = value;
            invalidate();
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);

            float w = getWidth();
            float h = getHeight();

            fill.setShader(new LinearGradient(
                    0, 0, 0, h,
                    0x18000000,
                    0xA8000000,
                    Shader.TileMode.CLAMP
            ));
            canvas.drawRect(0, 0, w, h, fill);
            fill.setShader(null);

            float size = Math.min(w, h) * 0.64f;
            float left = (w - size) / 2f;
            float top = h * 0.31f;
            float right = left + size;
            float bottom = top + size;

            int glow = success ? 0xFF9CFFD8 : 0xFFBFC8D6;

            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(dp(3));
            paint.setColor(glow);
            paint.setShadowLayer(dp(success ? 18 : 12), 0, 0,
                    success ? 0xAA9CFFD8 : 0x8896A8FF);

            float c = dp(30);
            canvas.drawLine(left, top, left + c, top, paint);
            canvas.drawLine(left, top, left, top + c, paint);
            canvas.drawLine(right, top, right - c, top, paint);
            canvas.drawLine(right, top, right, top + c, paint);
            canvas.drawLine(left, bottom, left + c, bottom, paint);
            canvas.drawLine(left, bottom, left, bottom - c, paint);
            canvas.drawLine(right, bottom, right - c, bottom, paint);
            canvas.drawLine(right, bottom, right, bottom - c, paint);

            paint.clearShadowLayer();

            float y = top + (bottom - top) * phase;
            paint.setStrokeWidth(dp(2));
            paint.setColor(success ? 0xCC9CFFD8 : 0xCCB7C6FF);
            paint.setShadowLayer(dp(10), 0, 0,
                    success ? 0xAA9CFFD8 : 0x8894A7FF);
            canvas.drawLine(left + dp(12), y, right - dp(12), y, paint);
            paint.clearShadowLayer();

            paint.setStyle(Paint.Style.FILL);
            float pulse = 0.5f + 0.5f * (float) Math.sin(phase * Math.PI * 2);
            paint.setColor(success ? 0x1F9CFFD8 : 0x1A96A8FF);
            canvas.drawCircle(w / 2f, top + (bottom - top) / 2f,
                    size * (0.55f + pulse * 0.04f), paint);
        }

        private int dp(int value) {
            return Math.round(value * getResources().getDisplayMetrics().density);
        }
    }
}
