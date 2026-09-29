package com.mvmcmd.launcher;

import android.Manifest;
import android.app.AlertDialog;
import android.app.WallpaperManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.core.resolutionselector.AspectRatioStrategy;
import androidx.camera.core.resolutionselector.ResolutionSelector;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.barcode.Barcode;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.objects.DetectedObject;
import com.google.mlkit.vision.objects.ObjectDetection;
import com.google.mlkit.vision.objects.ObjectDetector;
import com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public final class MvmVisionActivity extends AppCompatActivity {
    private static final int REQ_CAMERA = 781;

    private PreviewView previewView;
    private TextView detectionLabel;
    private TextView detailLabel;
    private Button modeButton;

    private ImageCapture imageCapture;
    private ProcessCameraProvider cameraProvider;
    private ExecutorService analysisExecutor;

    private BarcodeScanner barcodeScanner;
    private TextRecognizer textRecognizer;
    private ObjectDetector objectDetector;
    private final AtomicBoolean analyzing = new AtomicBoolean(false);

    private enum Mode {
        AUTO, SCAN, EXTRACT, IDENTIFY, CLEAN
    }

    private Mode mode = Mode.AUTO;
    private String liveKind = "READY";
    private String liveDetail = "Point the camera at something.";

    private Uri lastImageUri;
    private Uri lastPdfUri;
    private String lastOcr = "";

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);

        analysisExecutor = Executors.newSingleThreadExecutor();

        barcodeScanner = BarcodeScanning.getClient(
                new BarcodeScannerOptions.Builder()
                        .setBarcodeFormats(Barcode.FORMAT_ALL_FORMATS)
                        .build()
        );
        textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        objectDetector = ObjectDetection.getClient(
                new ObjectDetectorOptions.Builder()
                        .setDetectorMode(ObjectDetectorOptions.STREAM_MODE)
                        .enableMultipleObjects()
                        .enableClassification()
                        .build()
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
            startCamera();
        }
    }

    private void buildUi() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        previewView = new PreviewView(this);
        previewView.setImplementationMode(PreviewView.ImplementationMode.PERFORMANCE);
        previewView.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        root.addView(
                previewView,
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                )
        );

        LinearLayout top = new LinearLayout(this);
        top.setGravity(Gravity.CENTER_VERTICAL);
        top.setPadding(dp(12), dp(10), dp(12), dp(8));

        Button close = new Button(this);
        close.setText("×");
        close.setTextSize(26);
        close.setOnClickListener(v -> finish());
        top.addView(close, size(56, 48));

        TextView title = label("MVM VISION", 15, true);
        title.setGravity(Gravity.CENTER);
        top.addView(title, new LinearLayout.LayoutParams(0, dp(48), 1f));

        modeButton = new Button(this);
        modeButton.setText("AUTO");
        modeButton.setOnClickListener(v -> cycleMode());
        top.addView(modeButton, size(98, 48));

        root.addView(
                top,
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        dp(70),
                        Gravity.TOP
                )
        );

        LinearLayout status = new LinearLayout(this);
        status.setOrientation(LinearLayout.VERTICAL);
        status.setPadding(dp(14), dp(10), dp(14), dp(10));
        status.setBackgroundColor(0x99000000);

        detectionLabel = label("READY", 13, true);
        detailLabel = label("Point the camera at something.", 11, false);
        status.addView(detectionLabel, new LinearLayout.LayoutParams(-1, dp(28)));
        status.addView(detailLabel, new LinearLayout.LayoutParams(-1, dp(28)));

        FrameLayout.LayoutParams statusLp =
                new FrameLayout.LayoutParams(-1, dp(74), Gravity.TOP);
        statusLp.setMargins(0, dp(74), 0, 0);
        root.addView(status, statusLp);

        root.addView(
                new VisionFrame(this),
                new FrameLayout.LayoutParams(dp(300), dp(220), Gravity.CENTER)
        );

        LinearLayout bottom = new LinearLayout(this);
        bottom.setOrientation(LinearLayout.VERTICAL);
        bottom.setGravity(Gravity.CENTER);
        bottom.setPadding(dp(12), dp(6), dp(12), dp(16));

        TextView hint = label("MAGIC CAPTURE", 11, true);
        hint.setGravity(Gravity.CENTER);
        bottom.addView(hint, new LinearLayout.LayoutParams(-1, dp(28)));

        LinearLayout actions = new LinearLayout(this);
        actions.setGravity(Gravity.CENTER);

        Button result = new Button(this);
        result.setText("RESULT");
        result.setOnClickListener(v -> showResultActions());
        actions.addView(result, size(92, 54));

        ImageButton shutter = new ImageButton(this);
        shutter.setImageDrawable(circleDrawable(Color.WHITE));
        shutter.setBackground(circleDrawable(0x33000000));
        shutter.setOnClickListener(v -> capturePhoto());
        actions.addView(shutter, new LinearLayout.LayoutParams(dp(90), dp(90)));

        Button share = new Button(this);
        share.setText("SHARE");
        share.setOnClickListener(v -> shareLast());
        actions.addView(share, size(92, 54));

        bottom.addView(actions, new LinearLayout.LayoutParams(-1, dp(100)));
        root.addView(
                bottom,
                new FrameLayout.LayoutParams(-1, dp(138), Gravity.BOTTOM)
        );

        setContentView(root);
    }

    private void startCamera() {
        com.google.common.util.concurrent.ListenableFuture<ProcessCameraProvider> future =
                ProcessCameraProvider.getInstance(this);

        future.addListener(() -> {
            try {
                cameraProvider = future.get();
                bindCamera();
            } catch (Exception e) {
                showError("Vision camera unavailable");
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void bindCamera() {
        if (cameraProvider == null) return;

        cameraProvider.unbindAll();

        ResolutionSelector ratio =
                new ResolutionSelector.Builder()
                        .setAspectRatioStrategy(
                                AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY
                        )
                        .build();

        Preview preview =
                new Preview.Builder()
                        .setResolutionSelector(ratio)
                        .build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());

        imageCapture =
                new ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                        .setJpegQuality(96)
                        .setResolutionSelector(ratio)
                        .build();

        ImageAnalysis analysis =
                new ImageAnalysis.Builder()
                        .setResolutionSelector(ratio)
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build();
        analysis.setAnalyzer(analysisExecutor, this::analyzeFrame);

        try {
            cameraProvider.bindToLifecycle(
                    this,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    imageCapture,
                    analysis
            );
        } catch (Exception e) {
            showError("Unable to bind Vision camera");
        }
    }

    private void analyzeFrame(@NonNull ImageProxy proxy) {
        if (!analyzing.compareAndSet(false, true)) {
            proxy.close();
            return;
        }

        if (proxy.getImage() == null) {
            analyzing.set(false);
            proxy.close();
            return;
        }

        setDetection("ANALYZING", "MVM Vision is reading the frame…");

        InputImage image =
                InputImage.fromMediaImage(
                        proxy.getImage(),
                        proxy.getImageInfo().getRotationDegrees()
                );

        AtomicBoolean qrFound = new AtomicBoolean(false);
        AtomicBoolean textFound = new AtomicBoolean(false);
        AtomicBoolean objectFound = new AtomicBoolean(false);

        com.google.android.gms.tasks.Task<java.util.List<Barcode>> barcodeTask =
                barcodeScanner.process(image);
        com.google.android.gms.tasks.Task<com.google.mlkit.vision.text.Text> textTask =
                textRecognizer.process(image);
        com.google.android.gms.tasks.Task<java.util.List<DetectedObject>> objectTask =
                objectDetector.process(image);

        barcodeTask.addOnSuccessListener(barcodes -> {
            if (barcodes.isEmpty()) return;
            Barcode code = barcodes.get(0);
            String raw = code.getRawValue();
            qrFound.set(true);
            setDetection(
                    "QR / BARCODE",
                    raw == null || raw.isBlank() ? "Code detected" : raw
            );
        });

        textTask.addOnSuccessListener(text -> {
            String raw = text.getText() == null ? "" : text.getText().trim();
            if (raw.isEmpty() || qrFound.get()) return;
            textFound.set(true);
            setDetection("TEXT", shorten(raw.replace('\n', ' ')));
        });

        objectTask.addOnSuccessListener(objects -> {
            if (objects.isEmpty() || qrFound.get() || textFound.get()) return;
            objectFound.set(true);
            DetectedObject object = objects.get(0);
            String kind = "Object";
            if (!object.getLabels().isEmpty()) {
                kind = object.getLabels().get(0).getText();
            }
            setDetection("OBJECT", kind);
        });

        Tasks.whenAllComplete(barcodeTask, textTask, objectTask)
                .addOnCompleteListener(task -> {
                    analyzing.set(false);
                    proxy.close();
                    if (!qrFound.get() && !textFound.get() && !objectFound.get()) {
                        setDetection("READY", "Point the camera at something.");
                    }
                });
    }

    private void setDetection(String kind, String detail) {
        liveKind = kind;
        liveDetail = detail;
        runOnUiThread(() -> {
            if (detectionLabel != null) detectionLabel.setText(kind);
            if (detailLabel != null) detailLabel.setText(detail);
        });
    }

    private void capturePhoto() {
        if (imageCapture == null) return;

        File temp =
                new File(
                        getCacheDir(),
                        "mvm_vision_" + System.currentTimeMillis() + ".jpg"
                );

        imageCapture.takePicture(
                new ImageCapture.OutputFileOptions.Builder(temp).build(),
                ContextCompat.getMainExecutor(this),
                new ImageCapture.OnImageSavedCallback() {
                    @Override
                    public void onImageSaved(
                            @NonNull ImageCapture.OutputFileResults output
                    ) {
                        processCapture(temp);
                    }

                    @Override
                    public void onError(@NonNull ImageCaptureException exception) {
                        toast("Vision capture failed");
                    }
                }
        );
    }

    private void processCapture(File temp) {
        Bitmap bitmap = BitmapFactory.decodeFile(temp.getAbsolutePath());
        if (bitmap == null) {
            toast("Captured image unreadable");
            return;
        }

        lastImageUri = publishImage(temp);
        lastPdfUri = null;
        lastOcr = "";

        textRecognizer.process(InputImage.fromBitmap(bitmap, 0))
                .addOnSuccessListener(text -> {
                    lastOcr = text.getText() == null ? "" : text.getText().trim();

                    if (mode == Mode.SCAN || (mode == Mode.AUTO && !lastOcr.isEmpty())) {
                        lastPdfUri = publishPdf(bitmap);
                    }

                    if (mode == Mode.CLEAN) {
                        Bitmap enhanced = enhance(bitmap);
                        File enhancedFile =
                                new File(
                                        getCacheDir(),
                                        "mvm_vision_enhanced_" + System.currentTimeMillis() + ".jpg"
                                );

                        try (FileOutputStream out =
                                     new FileOutputStream(enhancedFile)) {
                            enhanced.compress(
                                    Bitmap.CompressFormat.JPEG,
                                    96,
                                    out
                            );
                            lastImageUri = publishImage(enhancedFile);
                        } catch (Exception ignored) {
                        } finally {
                            enhanced.recycle();
                        }
                    }

                    runOnUiThread(this::showResultActions);
                    temp.delete();
                    bitmap.recycle();
                })
                .addOnFailureListener(error -> {
                    runOnUiThread(this::showResultActions);
                    temp.delete();
                    bitmap.recycle();
                });
    }

    private void showResultActions() {
        if (lastImageUri == null) {
            toast("No Vision result available");
            return;
        }

        String[] actions = {
                "VIEW",
                "COPY OCR",
                "OPEN PDF",
                "SET WALLPAPER",
                "SHARE"
        };

        new AlertDialog.Builder(this)
                .setTitle("MVM VISION")
                .setMessage(buildResultMessage())
                .setItems(actions, (dialog, which) -> {
                    switch (which) {
                        case 0:
                            openUri(lastImageUri, "image/jpeg");
                            break;
                        case 1:
                            copyOcr();
                            break;
                        case 2:
                            if (lastPdfUri != null) {
                                openUri(lastPdfUri, "application/pdf");
                            } else {
                                toast("No PDF for this capture");
                            }
                            break;
                        case 3:
                            setWallpaper();
                            break;
                        case 4:
                            shareLast();
                            break;
                        default:
                            break;
                    }
                })
                .show();
    }

    private String buildResultMessage() {
        StringBuilder b = new StringBuilder();
        b.append(liveKind).append('\n').append(liveDetail);
        if (!lastOcr.isEmpty()) {
            b.append("\n\nOCR\n").append(shorten(lastOcr));
        }
        if (lastPdfUri != null) {
            b.append("\n\nPDF READY");
        }
        b.append("\n\nMODE: ").append(mode.name());
        return b.toString();
    }

    private void copyOcr() {
        if (lastOcr.isEmpty()) {
            toast("No OCR text found");
            return;
        }

        android.content.ClipboardManager clipboard =
                (android.content.ClipboardManager) getSystemService(
                        CLIPBOARD_SERVICE
                );

        clipboard.setPrimaryClip(
                android.content.ClipData.newPlainText(
                        "MVMCMD OCR",
                        lastOcr
                )
        );
        toast("OCR copied");
    }

    private void setWallpaper() {
        if (lastImageUri == null) return;

        try (java.io.InputStream in =
                     getContentResolver().openInputStream(lastImageUri)) {
            if (in == null) throw new IOException("stream");

            WallpaperManager manager = WallpaperManager.getInstance(this);
            if (Build.VERSION.SDK_INT >= 24) {
                manager.setStream(
                        in,
                        null,
                        true,
                        WallpaperManager.FLAG_SYSTEM | WallpaperManager.FLAG_LOCK
                );
            } else {
                manager.setStream(in);
            }
            toast("Wallpaper applied");
        } catch (Exception e) {
            toast("Wallpaper unavailable");
        }
    }

    private void shareLast() {
        if (lastImageUri == null) return;

        try {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("image/jpeg");
            send.putExtra(Intent.EXTRA_STREAM, lastImageUri);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(
                    Intent.createChooser(send, "Share Vision capture")
            );
        } catch (Exception e) {
            toast("No share target available");
        }
    }

    private void openUri(Uri uri, String type) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, type);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(intent);
        } catch (Exception e) {
            toast("No viewer available");
        }
    }

    private Uri publishImage(File file) {
        String name =
                "MVMCMD_VISION_" +
                new SimpleDateFormat(
                        "yyyyMMdd_HHmmss",
                        Locale.US
                ).format(new Date()) +
                ".jpg";

        ContentResolver resolver = getContentResolver();
        ContentValues values = new ContentValues();
        values.put(
                MediaStore.Images.Media.DISPLAY_NAME,
                name
        );
        values.put(
                MediaStore.Images.Media.MIME_TYPE,
                "image/jpeg"
        );

        if (Build.VERSION.SDK_INT >= 29) {
            values.put(
                    MediaStore.Images.Media.RELATIVE_PATH,
                    Environment.DIRECTORY_PICTURES + "/MVMCMD Vision"
            );
            values.put(
                    MediaStore.Images.Media.IS_PENDING,
                    1
            );
        }

        Uri uri =
                resolver.insert(
                        MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                        values
                );

        if (uri == null) return null;

        try (
                FileInputStream in = new FileInputStream(file);
                java.io.OutputStream out = resolver.openOutputStream(uri)
        ) {
            if (out == null) throw new IOException("output");

            byte[] buffer = new byte[65536];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }

            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues done = new ContentValues();
                done.put(
                        MediaStore.Images.Media.IS_PENDING,
                        0
                );
                resolver.update(
                        uri,
                        done,
                        null,
                        null
                );
            }

            return uri;
        } catch (Exception e) {
            resolver.delete(uri, null, null);
            return null;
        }
    }

    private Uri publishPdf(Bitmap bitmap) {
        String name =
                "MVMCMD_VISION_" +
                new SimpleDateFormat(
                        "yyyyMMdd_HHmmss",
                        Locale.US
                ).format(new Date()) +
                ".pdf";

        ContentResolver resolver = getContentResolver();
        ContentValues values = new ContentValues();
        values.put(
                MediaStore.Files.FileColumns.DISPLAY_NAME,
                name
        );
        values.put(
                MediaStore.Files.FileColumns.MIME_TYPE,
                "application/pdf"
        );

        if (Build.VERSION.SDK_INT >= 29) {
            values.put(
                    MediaStore.Files.FileColumns.RELATIVE_PATH,
                    Environment.DIRECTORY_DOCUMENTS + "/MVMCMD Vision"
            );
            values.put(
                    MediaStore.Files.FileColumns.IS_PENDING,
                    1
            );
        }

        Uri uri =
                resolver.insert(
                        MediaStore.Files.getContentUri("external"),
                        values
                );

        if (uri == null) return null;

        PdfDocument document = new PdfDocument();
        PdfDocument.Page page =
                document.startPage(
                        new PdfDocument.PageInfo.Builder(
                                bitmap.getWidth(),
                                bitmap.getHeight(),
                                1
                        ).create()
                );

        page.getCanvas().drawBitmap(
                bitmap,
                null,
                new android.graphics.Rect(
                        0,
                        0,
                        bitmap.getWidth(),
                        bitmap.getHeight()
                ),
                new Paint(
                        Paint.ANTI_ALIAS_FLAG |
                        Paint.FILTER_BITMAP_FLAG
                )
        );
        document.finishPage(page);

        try (java.io.OutputStream out = resolver.openOutputStream(uri)) {
            if (out == null) throw new IOException("output");
            document.writeTo(out);

            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues done = new ContentValues();
                done.put(
                        MediaStore.Files.FileColumns.IS_PENDING,
                        0
                );
                resolver.update(uri, done, null, null);
            }

            return uri;
        } catch (Exception e) {
            resolver.delete(uri, null, null);
            return null;
        } finally {
            document.close();
        }
    }

    private Bitmap enhance(Bitmap source) {
        Bitmap output =
                Bitmap.createBitmap(
                        source.getWidth(),
                        source.getHeight(),
                        Bitmap.Config.ARGB_8888
                );

        Canvas canvas = new Canvas(output);

        android.graphics.ColorMatrix matrix =
                new android.graphics.ColorMatrix(
                        new float[]{
                                1.10f, 0, 0, 0, -10,
                                0, 1.10f, 0, 0, -10,
                                0, 0, 1.10f, 0, -10,
                                0, 0, 0, 1, 0
                        }
                );

        Paint paint =
                new Paint(
                        Paint.ANTI_ALIAS_FLAG |
                        Paint.FILTER_BITMAP_FLAG
                );
        paint.setColorFilter(
                new android.graphics.ColorMatrixColorFilter(matrix)
        );

        canvas.drawBitmap(source, 0, 0, paint);
        return output;
    }

    private void cycleMode() {
        Mode[] modes = Mode.values();
        mode = modes[(mode.ordinal() + 1) % modes.length];
        modeButton.setText(mode.name());
        liveKind = "READY";
        liveDetail = "Mode: " + mode.name();
        setDetection(liveKind, liveDetail);
    }

    private TextView label(String text, int size, boolean bold) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(Color.WHITE);
        view.setTextSize(size);
        view.setTypeface(
                Typeface.DEFAULT,
                bold ? Typeface.BOLD : Typeface.NORMAL
        );
        return view;
    }

    private LinearLayout.LayoutParams size(int width, int height) {
        return new LinearLayout.LayoutParams(
                dp(width),
                dp(height)
        );
    }

    private android.graphics.drawable.Drawable circleDrawable(int color) {
        android.graphics.drawable.GradientDrawable drawable =
                new android.graphics.drawable.GradientDrawable();
        drawable.setShape(
                android.graphics.drawable.GradientDrawable.OVAL
        );
        drawable.setColor(color);
        drawable.setStroke(dp(4), Color.WHITE);
        return drawable;
    }

    private String shorten(String value) {
        String clean = value.replaceAll("\\s+", " ").trim();
        return clean.length() > 160
                ? clean.substring(0, 160) + "…"
                : clean;
    }

    private void showError(String message) {
        toast(message);
        finish();
    }

    private void toast(String message) {
        Toast.makeText(
                this,
                message,
                Toast.LENGTH_SHORT
        ).show();
    }

    private int dp(int value) {
        return Math.round(
                value * getResources().getDisplayMetrics().density
        );
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(
                requestCode,
                permissions,
                grantResults
        );

        if (requestCode == REQ_CAMERA) {
            if (
                    grantResults.length > 0 &&
                    grantResults[0] == PackageManager.PERMISSION_GRANTED
            ) {
                startCamera();
            } else {
                finish();
            }
        }
    }

    @Override
    protected void onDestroy() {
        if (cameraProvider != null) {
            cameraProvider.unbindAll();
        }
        if (analysisExecutor != null) {
            analysisExecutor.shutdown();
        }
        if (barcodeScanner != null) {
            barcodeScanner.close();
        }
        if (textRecognizer != null) {
            textRecognizer.close();
        }
        if (objectDetector != null) {
            objectDetector.close();
        }
        super.onDestroy();
    }

    private static final class VisionFrame extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        VisionFrame(android.content.Context context) {
            super(context);
        }

        @Override
        protected void onDraw(Canvas canvas) {
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(3f);
            paint.setColor(0xAAFFFFFF);

            float density =
                    getResources().getDisplayMetrics().density;

            canvas.drawRoundRect(
                    8 * density,
                    8 * density,
                    getWidth() - 8 * density,
                    getHeight() - 8 * density,
                    24 * density,
                    24 * density,
                    paint
            );
        }
    }
}
