package com.mvmcmd.launcher;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.AspectRatio;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.MeteringPoint;
import androidx.camera.core.MeteringPointFactory;
import androidx.camera.core.Preview;
import androidx.camera.core.resolutionselector.AspectRatioStrategy;
import androidx.camera.core.resolutionselector.ResolutionSelector;
import androidx.camera.video.FallbackStrategy;
import androidx.camera.video.FileOutputOptions;
import androidx.camera.video.Quality;
import androidx.camera.video.QualitySelector;
import androidx.camera.video.Recorder;
import androidx.camera.video.Recording;
import androidx.camera.video.VideoCapture;
import androidx.camera.video.VideoRecordEvent;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.util.Range;

import com.google.common.util.concurrent.ListenableFuture;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MvmCameraActivity extends AppCompatActivity {

    private static final int REQ_CAMERA = 701;
    private static final int REQ_AUDIO = 702;

    private PreviewView previewView;
    private FrameLayout previewFrame;
    private TextView flashButton;
    private TextView ratioButton;
    private TextView modePhoto;
    private TextView modeVideo;
    private TextView fpsStatus;
    private TextView processLabel;
    private TextView timerLabel;
    private ImageButton shutter;
    private ImageButton switchCamera;
    private ImageView galleryThumb;
    private ProgressBar processingBar;
    private LinearLayout adjustPanel;
    private Camera camera;
    private ProcessCameraProvider cameraProvider;
    private ImageCapture imageCapture;
    private VideoCapture<Recorder> videoCapture;
    private Recording recording;
    private ExecutorService cameraExecutor;
    private boolean videoMode = false;
    private boolean frontCamera = false;
    private boolean torchOn = false;
    private String filter = "Natural";
    private float exposure = 0f;
    private float contrast = 0f;
    private float saturation = 0f;
    private float warmth = 0f;
    private boolean prefer60 = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);

        cameraExecutor = Executors.newSingleThreadExecutor();
        buildUi();

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
        } else {
            startCamera();
        }
    }

    private void buildUi() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        previewFrame = new AspectFrameLayout(this);
        previewFrame.setBackgroundColor(Color.BLACK);

        FrameLayout.LayoutParams previewLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER
        );
        root.addView(previewFrame, previewLp);

        previewView = new PreviewView(this);
        previewView.setImplementationMode(PreviewView.ImplementationMode.PERFORMANCE);
        previewView.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        previewView.setOnTouchListener((v, e) -> {
            if (e.getAction() == MotionEvent.ACTION_UP && camera != null && !videoMode) {
                focusAt(e.getX(), e.getY());
            }
            return true;
        });
        previewFrame.addView(previewView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        LinearLayout top = new LinearLayout(this);
        top.setGravity(Gravity.CENTER_VERTICAL);
        top.setPadding(dp(16), dp(12), dp(16), dp(8));
        top.setOrientation(LinearLayout.HORIZONTAL);
        addGradientLessTopBackdrop(top);

        TextView close = iconText("×", 30);
        close.setOnClickListener(v -> finish());
        top.addView(close, squareLp(48));

        fpsStatus = label("60 FPS", 11, true);
        fpsStatus.setGravity(Gravity.CENTER);
        top.addView(fpsStatus, new LinearLayout.LayoutParams(0, dp(48), 1f));

        flashButton = iconText("⚡", 20);
        flashButton.setContentDescription("Flash");
        flashButton.setOnClickListener(v -> {
            if (camera == null || !camera.getCameraInfo().hasFlashUnit()) {
                toast("Flash not available");
                return;
            }
            torchOn = !torchOn;
            camera.getCameraControl().enableTorch(torchOn);
            flashButton.setAlpha(torchOn ? 1f : .55f);
        });
        top.addView(flashButton, squareLp(48));

        ratioButton = label("4:3", 13, true);
        ratioButton.setGravity(Gravity.CENTER);
        ratioButton.setOnClickListener(v -> toast("MVMCMD CAMERA is fixed to 4:3"));
        top.addView(ratioButton, squareLp(54));

        TextView settings = iconText("⋯", 26);
        settings.setContentDescription("Adjust");
        settings.setOnClickListener(v -> toggleAdjustPanel());
        top.addView(settings, squareLp(48));

        FrameLayout.LayoutParams topLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, dp(72), Gravity.TOP);
        root.addView(top, topLp);

        TextView hdr = label("HDR  AUTO", 10, false);
        hdr.setGravity(Gravity.CENTER);
        hdr.setPadding(dp(10), dp(7), dp(10), dp(7));
        hdr.setBackground(roundBg(0x66000000, 18));
        FrameLayout.LayoutParams hdrLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT, dp(32), Gravity.TOP | Gravity.START);
        hdrLp.setMargins(dp(18), dp(84), 0, 0);
        root.addView(hdr, hdrLp);

        HorizontalScrollView filtersScroll = new HorizontalScrollView(this);
        filtersScroll.setHorizontalScrollBarEnabled(false);
        LinearLayout filters = new LinearLayout(this);
        filters.setPadding(dp(16), 0, dp(16), 0);
        filters.setGravity(Gravity.CENTER_VERTICAL);
        String[] filterNames = {"Natural", "Vivid", "Warm", "Cool", "Film", "Mono"};
        for (String name : filterNames) {
            TextView f = label(name, 12, false);
            f.setGravity(Gravity.CENTER);
            f.setPadding(dp(14), 0, dp(14), 0);
            f.setMinWidth(dp(76));
            f.setOnClickListener(v -> {
                filter = ((TextView) v).getText().toString();
                applyLiveLook();
                refreshFilterStates(filters);
            });
            filters.addView(f, new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, dp(40)));
        }
        filtersScroll.addView(filters);
        filtersScroll.setBackgroundColor(0x33000000);

        FrameLayout.LayoutParams filterLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, dp(48), Gravity.BOTTOM);
        filterLp.setMargins(0, 0, 0, dp(222));
        root.addView(filtersScroll, filterLp);
        refreshFilterStates(filters);

        LinearLayout zoomRow = new LinearLayout(this);
        zoomRow.setGravity(Gravity.CENTER);
        float[] zooms = {0.6f, 1f, 2f, 3f, 5f};
        for (float z : zooms) {
            TextView chip = label(z + "×", 12, true);
            chip.setGravity(Gravity.CENTER);
            chip.setBackground(roundBg(0x66000000, 24));
            chip.setPadding(dp(13), 0, dp(13), 0);
            chip.setOnClickListener(v -> {
                if (camera != null) camera.getCameraControl().setZoomRatio(Float.parseFloat(
                        ((TextView) v).getText().toString().replace("×", "")));
            });
            zoomRow.addView(chip, new LinearLayout.LayoutParams(dp(62), dp(42)));
        }
        FrameLayout.LayoutParams zoomLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT, dp(44), Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        zoomLp.setMargins(0, 0, 0, dp(168));
        root.addView(zoomRow, zoomLp);

        LinearLayout bottom = new LinearLayout(this);
        bottom.setGravity(Gravity.CENTER);
        bottom.setOrientation(LinearLayout.VERTICAL);
        bottom.setPadding(dp(12), dp(6), dp(12), dp(12));

        LinearLayout modeRow = new LinearLayout(this);
        modeRow.setGravity(Gravity.CENTER);
        modePhoto = label("PHOTO", 13, true);
        modeVideo = label("VIDEO", 13, false);
        modePhoto.setPadding(dp(20), 0, dp(20), 0);
        modeVideo.setPadding(dp(20), 0, dp(20), 0);
        modePhoto.setOnClickListener(v -> setVideoMode(false));
        modeVideo.setOnClickListener(v -> setVideoMode(true));
        modeRow.addView(modePhoto);
        modeRow.addView(modeVideo);

        FrameLayout controls = new FrameLayout(this);

        galleryThumb = new ImageView(this);
        galleryThumb.setScaleType(ImageView.ScaleType.CENTER_CROP);
        galleryThumb.setBackground(roundBg(0xFF202020, 64));
        FrameLayout.LayoutParams thumbLp = new FrameLayout.LayoutParams(dp(58), dp(58), Gravity.START | Gravity.CENTER_VERTICAL);
        thumbLp.setMargins(dp(6), 0, 0, 0);
        controls.addView(galleryThumb, thumbLp);

        shutter = new ImageButton(this);
        shutter.setBackground(roundBg(Color.WHITE, 100));
        shutter.setColorFilter(Color.BLACK, PorterDuff.Mode.SRC_IN);
        shutter.setImageDrawable(circleDrawable(Color.WHITE));
        shutter.setOnClickListener(v -> {
            if (videoMode) toggleRecording();
            else capturePhoto();
        });
        FrameLayout.LayoutParams shutterLp = new FrameLayout.LayoutParams(dp(86), dp(86), Gravity.CENTER);
        controls.addView(shutter, shutterLp);

        switchCamera = new ImageButton(this);
        switchCamera.setImageResource(android.R.drawable.ic_menu_rotate);
        switchCamera.setBackground(roundBg(0x55000000, 100));
        switchCamera.setOnClickListener(v -> {
            frontCamera = !frontCamera;
            bindCamera(prefer60);
        });
        FrameLayout.LayoutParams switchLp = new FrameLayout.LayoutParams(dp(58), dp(58), Gravity.END | Gravity.CENTER_VERTICAL);
        switchLp.setMargins(0, 0, dp(6), 0);
        controls.addView(switchCamera, switchLp);

        bottom.addView(modeRow, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(42)));
        bottom.addView(controls, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(100)));

        FrameLayout.LayoutParams bottomLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, dp(150), Gravity.BOTTOM);
        root.addView(bottom, bottomLp);

        processLabel = label("", 12, true);
        processLabel.setGravity(Gravity.CENTER);
        processLabel.setVisibility(View.GONE);
        processLabel.setBackgroundColor(0xDD000000);
        root.addView(processLabel, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, dp(44), Gravity.CENTER_VERTICAL));

        processingBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        processingBar.setMax(100);
        processingBar.setVisibility(View.GONE);
        FrameLayout.LayoutParams pbLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, dp(4), Gravity.BOTTOM);
        root.addView(processingBar, pbLp);

        adjustPanel = buildAdjustPanel();
        adjustPanel.setVisibility(View.GONE);
        FrameLayout.LayoutParams adjustLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, dp(330), Gravity.BOTTOM);
        adjustLp.setMargins(dp(12), 0, dp(12), dp(154));
        root.addView(adjustPanel, adjustLp);

        timerLabel = label("", 15, true);
        timerLabel.setGravity(Gravity.CENTER);
        timerLabel.setVisibility(View.GONE);
        root.addView(timerLabel, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT, dp(42), Gravity.TOP | Gravity.CENTER_HORIZONTAL));

        setContentView(root);
    }

    private LinearLayout buildAdjustPanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(18), dp(12), dp(18), dp(14));
        panel.setBackground(roundBg(0xEE121212, 26));

        TextView title = label("ADJUST", 12, true);
        panel.addView(title, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(28)));

        addSlider(panel, "Exposure", -100, 100, 0, value -> exposure = value / 100f);
        addSlider(panel, "Contrast", -100, 100, 0, value -> contrast = value / 100f);
        addSlider(panel, "Saturation", -100, 100, 0, value -> saturation = value / 100f);
        addSlider(panel, "Warmth", -100, 100, 0, value -> warmth = value / 100f);

        return panel;
    }

    private interface SliderChange { void changed(int value); }

    private void addSlider(LinearLayout parent, String name, int min, int max, int value, SliderChange change) {
        TextView t = label(name, 11, false);
        parent.addView(t, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(24)));

        SeekBar seek = new SeekBar(this);
        seek.setMax(max - min);
        seek.setProgress(value - min);
        seek.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar s, int progress, boolean fromUser) {
                change.changed(progress + min);
                applyLiveLook();
            }
            public void onStartTrackingTouch(SeekBar s) {}
            public void onStopTrackingTouch(SeekBar s) {}
        });
        parent.addView(seek, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(34)));
    }

    private void toggleAdjustPanel() {
        adjustPanel.setVisibility(adjustPanel.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE);
    }

    private void refreshFilterStates(LinearLayout filters) {
        for (int i = 0; i < filters.getChildCount(); i++) {
            TextView child = (TextView) filters.getChildAt(i);
            boolean active = child.getText().toString().equals(filter);
            child.setTextColor(active ? Color.WHITE : 0xAACCCCCC);
            child.setBackground(active ? roundBg(0xAAFFFFFF, 18) : null);
        }
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> future = ProcessCameraProvider.getInstance(this);
        future.addListener(() -> {
            try {
                cameraProvider = future.get();
                bindCamera(true);
            } catch (Exception e) {
                showError("Camera unavailable");
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void bindCamera(boolean target60) {
        prefer60 = target60;
        if (cameraProvider == null) return;

        cameraProvider.unbindAll();

        CameraSelector selector = new CameraSelector.Builder()
                .requireLensFacing(frontCamera ? CameraSelector.LENS_FACING_FRONT : CameraSelector.LENS_FACING_BACK)
                .build();

        ResolutionSelector ratioSelector = new ResolutionSelector.Builder()
                .setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY)
                .build();

        Preview.Builder previewBuilder = new Preview.Builder()
                .setResolutionSelector(ratioSelector)
                .setTargetRotation(previewView.getDisplay() == null ? 0 : previewView.getDisplay().getRotation());

        ImageCapture.Builder imageBuilder = new ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                .setJpegQuality(98)
                .setResolutionSelector(ratioSelector)
                .setTargetRotation(previewView.getDisplay() == null ? 0 : previewView.getDisplay().getRotation());

        Recorder recorder = new Recorder.Builder()
                .setQualitySelector(
                        QualitySelector.fromOrderedList(
                                Arrays.asList(Quality.UHD, Quality.FHD, Quality.HD, Quality.SD),
                                FallbackStrategy.lowerQualityOrHigherThan(Quality.FHD)))
                .setAspectRatio(AspectRatio.RATIO_4_3)
                .build();

        VideoCapture.Builder<Recorder> videoBuilder = new VideoCapture.Builder<>(recorder)
                .setMirrorMode(VideoCapture.MIRROR_MODE_ON_FRONT_ONLY);

        if (target60) {
            Range<Integer> target = new Range<>(60, 60);
            previewBuilder.setTargetFrameRate(target);
            videoBuilder.setTargetFrameRate(target);
        }

        Preview preview = previewBuilder.build();
        imageCapture = imageBuilder.build();
        videoCapture = videoBuilder.build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());

        try {
            camera = cameraProvider.bindToLifecycle(this, selector, preview, imageCapture, videoCapture);
            boolean sixty = false;
            java.util.List<Range<Integer>> ranges = camera.getCameraInfo().getSupportedFrameRateRanges();
            for (Range<Integer> range : ranges) {
                if (range.getUpper() >= 60) {
                    sixty = true;
                    break;
                }
            }
            fpsStatus.setText(sixty ? "60 FPS" : "MAX FPS");
            applyLiveLook();
        } catch (Exception first) {
            if (target60) {
                bindCamera(false);
            } else {
                showError("Camera configuration failed");
            }
        }
    }

    private void focusAt(float x, float y) {
        MeteringPointFactory factory = previewView.getMeteringPointFactory();
        MeteringPoint point = factory.createPoint(x, y);
        camera.getCameraControl().startFocusAndMetering(
                new androidx.camera.core.FocusMeteringAction.Builder(point).build()
        );
    }

    private void applyLiveLook() {
        if (previewView == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return;
        android.graphics.ColorMatrix matrix = buildColorMatrix();
        android.graphics.ColorMatrixColorFilter filterEffect =
                new android.graphics.ColorMatrixColorFilter(matrix);
        previewView.setRenderEffect(android.view.RenderEffect.createColorFilterEffect(filterEffect));
    }

    private android.graphics.ColorMatrix buildColorMatrix() {
        float exp = (float) Math.pow(2.0, exposure * 0.7);
        float c = 1f + contrast * 0.35f;
        float sat = Math.max(0.2f, 1f + saturation * 0.55f);
        float warmR = 1f + warmth * 0.12f;
        float warmB = 1f - warmth * 0.12f;

        float[] m = new android.graphics.ColorMatrix();
        android.graphics.ColorMatrix exposureM = new android.graphics.ColorMatrix(new float[]{
                exp,0,0,0,0,
                0,exp,0,0,0,
                0,0,exp,0,0,
                0,0,0,1,0});
        m.set(exposureM);
        m.postConcat(new android.graphics.ColorMatrix(new float[]{
                c,0,0,0,128*(1-c),
                0,c,0,0,128*(1-c),
                0,0,c,0,128*(1-c),
                0,0,0,1,0
        }));
        android.graphics.ColorMatrix satM = new android.graphics.ColorMatrix();
        satM.setSaturation(sat);
        m.postConcat(satM);
        m.postConcat(new android.graphics.ColorMatrix(new float[]{
                warmR,0,0,0,0,
                0,1,0,0,0,
                0,0,warmB,0,0,
                0,0,0,1,0
        }));

        if ("Vivid".equals(filter)) {
            android.graphics.ColorMatrix v = new android.graphics.ColorMatrix();
            v.setSaturation(1.18f);
            m.postConcat(v);
        } else if ("Warm".equals(filter)) {
            m.postConcat(new android.graphics.ColorMatrix(new float[]{
                    1.08f,0,0,0,0,
                    0,1.02f,0,0,0,
                    0,0,0.88f,0,0,
                    0,0,0,1,0}));
        } else if ("Cool".equals(filter)) {
            m.postConcat(new android.graphics.ColorMatrix(new float[]{
                    0.92f,0,0,0,0,
                    0,1.01f,0,0,0,
                    0,0,1.09f,0,0,
                    0,0,0,1,0}));
        } else if ("Film".equals(filter)) {
            m.postConcat(new android.graphics.ColorMatrix(new float[]{
                    1.03f,0,0,0,-3,
                    0,0.99f,0,0,1,
                    0,0,0.94f,0,3,
                    0,0,0,1,0}));
        } else if ("Mono".equals(filter)) {
            android.graphics.ColorMatrix mono = new android.graphics.ColorMatrix();
            mono.setSaturation(0f);
            m.postConcat(mono);
        }
        return m;
    }

    private void capturePhoto() {
        if (imageCapture == null || processingBar.getVisibility() == View.VISIBLE) return;

        File temp = new File(getCacheDir(), "mvm_photo_" + System.currentTimeMillis() + ".jpg");
        ImageCapture.OutputFileOptions output =
                new ImageCapture.OutputFileOptions.Builder(temp).build();

        imageCapture.takePicture(
                output,
                ContextCompat.getMainExecutor(this),
                new ImageCapture.OnImageSavedCallback() {
                    @Override
                    public void onImageSaved(@NonNull ImageCapture.OutputFileResults outputFileResults) {
                        processLabel.setText("ENHANCING  ·  PHOTO");
                        processLabel.setVisibility(View.VISIBLE);
                        processingBar.setVisibility(View.VISIBLE);
                        processingBar.setProgress(8);
                        PhotoProcessor.Settings s = new PhotoProcessor.Settings(
                                filter, exposure, contrast, saturation, warmth);
                        PhotoProcessor.processAsync(temp, s, new PhotoProcessor.Callback() {
                            @Override public void onProgress(int progress, String stage) {
                                runOnUiThread(() -> {
                                    processingBar.setProgress(progress);
                                    processLabel.setText(stage);
                                });
                            }
                            @Override public void onDone(File result) {
                                runOnUiThread(() -> {
                                    Uri uri = publishImage(result);
                                    if (uri != null) galleryThumb.setImageURI(uri);
                                    cleanup(temp, result);
                                    processLabel.setVisibility(View.GONE);
                                    processingBar.setVisibility(View.GONE);
                                });
                            }
                            @Override public void onError(Throwable error) {
                                runOnUiThread(() -> {
                                    toast("Photo processing failed — original preserved");
                                    Uri uri = publishImage(temp);
                                    if (uri != null) galleryThumb.setImageURI(uri);
                                    processLabel.setVisibility(View.GONE);
                                    processingBar.setVisibility(View.GONE);
                                });
                            }
                        });
                    }

                    @Override
                    public void onError(@NonNull ImageCaptureException exception) {
                        toast("Capture failed");
                    }
                });
    }

    private void toggleRecording() {
        if (recording != null) {
            recording.stop();
            return;
        }

        File temp = new File(getCacheDir(), "mvm_video_" + System.currentTimeMillis() + ".mp4");
        FileOutputOptions options = new FileOutputOptions.Builder(temp).build();

        recording = videoCapture.getOutput()
                .prepareRecording(this, options)
                .start(ContextCompat.getMainExecutor(this), event -> {
                    if (event instanceof VideoRecordEvent.Start) {
                        timerLabel.setText("● REC");
                        timerLabel.setTextColor(Color.RED);
                        timerLabel.setVisibility(View.VISIBLE);
                        shutter.setColorFilter(Color.RED, PorterDuff.Mode.SRC_IN);
                    } else if (event instanceof VideoRecordEvent.Status) {
                        VideoRecordEvent.Status status = (VideoRecordEvent.Status) event;
                        long duration = status.getRecordingStats().getRecordedDurationNanos() / 1_000_000_000L;
                        timerLabel.setText(String.format(Locale.US, "● %02d:%02d", duration / 60, duration % 60));
                    } else if (event instanceof VideoRecordEvent.Finalize) {
                        VideoRecordEvent.Finalize f = (VideoRecordEvent.Finalize) event;
                        recording = null;
                        timerLabel.setVisibility(View.GONE);
                        shutter.clearColorFilter();
                        if (f.hasError()) {
                            toast("Video capture failed");
                            return;
                        }
                        processLabel.setText("ENHANCING  ·  VIDEO");
                        processLabel.setVisibility(View.VISIBLE);
                        processingBar.setVisibility(View.VISIBLE);
                        processingBar.setIndeterminate(true);
                        VideoPostProcessor.processAsync(
                                this, temp, filter, exposure, contrast, saturation, warmth,
                                new VideoPostProcessor.Callback() {
                                    @Override public void onDone(File result) {
                                        runOnUiThread(() -> {
                                            Uri uri = publishVideo(result);
                                            cleanup(temp, result);
                                            processingBar.setIndeterminate(false);
                                            processingBar.setVisibility(View.GONE);
                                            processLabel.setVisibility(View.GONE);
                                            if (uri != null) toast("Video saved to Movies/MVMCMD");
                                        });
                                    }
                                    @Override public void onError(Throwable error) {
                                        runOnUiThread(() -> {
                                            toast("Video processing failed — original preserved");
                                            Uri uri = publishVideo(temp);
                                            if (uri != null) toast("Original video saved");
                                            processingBar.setIndeterminate(false);
                                            processingBar.setVisibility(View.GONE);
                                            processLabel.setVisibility(View.GONE);
                                        });
                                    }
                                });
                    }
                });
    }

    private Uri publishImage(File file) {
        String name = "MVMCMD_" + new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date()) + ".jpg";
        ContentResolver resolver = getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, name);
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
        if (Build.VERSION.SDK_INT >= 29) {
            values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/MVMCMD");
            values.put(MediaStore.Images.Media.IS_PENDING, 1);
        }
        Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (uri == null) return null;
        try (java.io.OutputStream out = resolver.openOutputStream(uri)) {
            java.nio.file.Files.copy(file.toPath(), out);
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues done = new ContentValues();
                done.put(MediaStore.Images.Media.IS_PENDING, 0);
                resolver.update(uri, done, null, null);
            }
            return uri;
        } catch (Exception e) {
            resolver.delete(uri, null, null);
            return null;
        }
    }

    private Uri publishVideo(File file) {
        String name = "MVMCMD_" + new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date()) + ".mp4";
        ContentResolver resolver = getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Video.Media.DISPLAY_NAME, name);
        values.put(MediaStore.Video.Media.MIME_TYPE, "video/mp4");
        if (Build.VERSION.SDK_INT >= 29) {
            values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/MVMCMD");
            values.put(MediaStore.Video.Media.IS_PENDING, 1);
        }
        Uri uri = resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values);
        if (uri == null) return null;
        try (java.io.OutputStream out = resolver.openOutputStream(uri)) {
            java.nio.file.Files.copy(file.toPath(), out);
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues done = new ContentValues();
                done.put(MediaStore.Video.Media.IS_PENDING, 0);
                resolver.update(uri, done, null, null);
            }
            return uri;
        } catch (Exception e) {
            resolver.delete(uri, null, null);
            return null;
        }
    }

    private void cleanup(File temp, File result) {
        if (temp != null && temp.exists()) temp.delete();
        if (result != null && result.exists() && !result.equals(temp)) result.delete();
    }

    private void setVideoMode(boolean enabled) {
        if (recording != null) return;
        videoMode = enabled;
        modePhoto.setTextColor(enabled ? 0x88FFFFFF : Color.WHITE);
        modeVideo.setTextColor(enabled ? Color.WHITE : 0x88FFFFFF);
        modePhoto.setTypeface(Typeface.DEFAULT, enabled ? Typeface.NORMAL : Typeface.BOLD);
        modeVideo.setTypeface(Typeface.DEFAULT, enabled ? Typeface.BOLD : Typeface.NORMAL);
    }

    private TextView label(String text, int size, boolean bold) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextColor(Color.WHITE);
        t.setTextSize(size);
        t.setTypeface(Typeface.DEFAULT, bold ? Typeface.BOLD : Typeface.NORMAL);
        return t;
    }

    private TextView iconText(String text, int size) {
        TextView t = label(text, size, false);
        t.setGravity(Gravity.CENTER);
        return t;
    }

    private FrameLayout.LayoutParams squareLp(int size) {
        return new FrameLayout.LayoutParams(dp(size), dp(size));
    }

    private LinearLayout.LayoutParams weightLp(float weight) {
        return new LinearLayout.LayoutParams(0, dp(48), weight);
    }

    private void addGradientLessTopBackdrop(LinearLayout top) {
        top.setBackgroundColor(0x44000000);
    }

    private android.graphics.drawable.Drawable roundBg(int color, int radius) {
        android.graphics.drawable.GradientDrawable d = new android.graphics.drawable.GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radius));
        return d;
    }

    private android.graphics.drawable.Drawable circleDrawable(int color) {
        android.graphics.drawable.GradientDrawable d = new android.graphics.drawable.GradientDrawable();
        d.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        d.setColor(color);
        d.setStroke(dp(4), 0xFFFFFFFF);
        return d;
    }

    private void showError(String message) {
        toast(message);
        finish();
    }

    private void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_CAMERA && grantResults.length > 0 &&
                grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startCamera();
        } else {
            toast("Camera permission is required");
            finish();
        }
    }

    @Override
    protected void onDestroy() {
        if (recording != null) {
            recording.stop();
            recording = null;
        }
        if (cameraExecutor != null) cameraExecutor.shutdown();
        super.onDestroy();
    }

    public static final class AspectFrameLayout extends FrameLayout {
        public AspectFrameLayout(Context context) { super(context); }
        @Override protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
            int width = MeasureSpec.getSize(widthMeasureSpec);
            int height = MeasureSpec.getSize(heightMeasureSpec);
            int desiredH = Math.round(width * 4f / 3f);
            if (height > 0 && desiredH > height) {
                width = Math.round(height * 3f / 4f);
                desiredH = height;
            }
            setMeasuredDimension(width, desiredH);
            int childW = MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY);
            int childH = MeasureSpec.makeMeasureSpec(desiredH, MeasureSpec.EXACTLY);
            for (int i = 0; i < getChildCount(); i++) {
                getChildAt(i).measure(childW, childH);
            }
        }
    }
}
