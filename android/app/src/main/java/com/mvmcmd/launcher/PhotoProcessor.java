package com.mvmcmd.launcher;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Rect;
import android.os.Handler;
import android.os.Looper;

import androidx.exifinterface.media.ExifInterface;

import java.io.File;
import java.io.FileOutputStream;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class PhotoProcessor {

    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();
    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static final int WORKING_LONG_EDGE = 2400;
    private static final int FINAL_LONG_EDGE = 3840;

    private PhotoProcessor() {}

    public static final class Settings {
        public final String filter;
        public final float exposure;
        public final float contrast;
        public final float saturation;
        public final float warmth;

        public Settings(String filter, float exposure, float contrast,
                        float saturation, float warmth) {
            this.filter = filter;
            this.exposure = exposure;
            this.contrast = contrast;
            this.saturation = saturation;
            this.warmth = warmth;
        }
    }

    public interface Callback {
        void onProgress(int progress, String stage);
        void onDone(File result);
        void onError(Throwable error);
    }

    public static void processAsync(File source, Settings settings, Callback callback) {
        EXECUTOR.execute(() -> {
            File result = null;
            try {
                result = process(source, settings, callback);
                File finalResult = result;
                MAIN.post(() -> callback.onDone(finalResult));
            } catch (Throwable error) {
                File failed = result;
                MAIN.post(() -> callback.onError(error));
                if (failed != null && failed.exists()) failed.delete();
            }
        });
    }

    private static File process(File source, Settings settings, Callback callback) throws Exception {
        callback.onProgress(8, "READ  ·  SOURCE");
        Bitmap sourceBitmap = decodeOrThrow(source);

        callback.onProgress(18, "ORIENT  ·  EXIF");
        Bitmap oriented = applyExifOrientation(sourceBitmap, source);
        if (oriented != sourceBitmap) sourceBitmap.recycle();

        callback.onProgress(28, "ANALYZE  ·  LIGHT");
        AutoPlan plan = analyze(oriented, settings);

        callback.onProgress(42, "TONE  ·  AUTO ADJUST");
        Bitmap toned = applyTone(oriented, plan, settings);
        if (toned != oriented) oriented.recycle();

        callback.onProgress(58, "DETAIL  ·  RECOVER");
        Bitmap detail = sharpen(toned, 0.18f + plan.detailBoost * 0.18f);
        if (detail != toned) toned.recycle();

        callback.onProgress(72, "UPSCALE  ·  RECONSTRUCT");
        int[] target = targetSize4x3(detail.getWidth(), detail.getHeight());
        Bitmap upscaled = Bitmap.createScaledBitmap(detail, target[0], target[1], true);
        if (upscaled != detail) detail.recycle();

        callback.onProgress(88, "DETAIL  ·  FINAL PASS");
        Bitmap finalBitmap = sharpen(upscaled, 0.08f + plan.detailBoost * 0.08f);
        if (finalBitmap != upscaled) upscaled.recycle();

        callback.onProgress(96, "WRITE  ·  JPEG");
        File output = new File(source.getParentFile(),
                "mvm_photo_processed_" + System.currentTimeMillis() + ".jpg");
        try (FileOutputStream out = new FileOutputStream(output)) {
            if (!finalBitmap.compress(Bitmap.CompressFormat.JPEG, 97, out)) {
                throw new IllegalStateException("JPEG encode failed");
            }
        }
        finalBitmap.recycle();

        callback.onProgress(100,
                String.format(Locale.US, "READY  ·  %dx%d", target[0], target[1]));
        return output;
    }

    private static Bitmap decodeOrThrow(File source) {
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(source.getAbsolutePath(), bounds);

        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
            throw new IllegalStateException("Invalid image");
        }

        int max = Math.max(bounds.outWidth, bounds.outHeight);
        int sample = 1;
        while (max / sample > WORKING_LONG_EDGE * 2) sample *= 2;

        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inPreferredConfig = Bitmap.Config.ARGB_8888;
        options.inSampleSize = sample;
        Bitmap bitmap = BitmapFactory.decodeFile(source.getAbsolutePath(), options);

        if (bitmap == null) throw new IllegalStateException("Decode failed");
        return cropTo4x3(bitmap);
    }

    private static Bitmap applyExifOrientation(Bitmap source, File file) throws Exception {
        ExifInterface exif = new ExifInterface(file.getAbsolutePath());
        int orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL);

        Matrix matrix = new Matrix();
        switch (orientation) {
            case ExifInterface.ORIENTATION_ROTATE_90:
                matrix.postRotate(90);
                break;
            case ExifInterface.ORIENTATION_ROTATE_180:
                matrix.postRotate(180);
                break;
            case ExifInterface.ORIENTATION_ROTATE_270:
                matrix.postRotate(270);
                break;
            case ExifInterface.ORIENTATION_FLIP_HORIZONTAL:
                matrix.setScale(-1, 1);
                break;
            case ExifInterface.ORIENTATION_FLIP_VERTICAL:
                matrix.setScale(1, -1);
                break;
            default:
                return source;
        }

        Bitmap transformed = Bitmap.createBitmap(
                source, 0, 0, source.getWidth(), source.getHeight(), matrix, true);
        return transformed == source ? source : cropTo4x3(transformed);
    }

    private static Bitmap cropTo4x3(Bitmap source) {
        int width = source.getWidth();
        int height = source.getHeight();
        float current = width / (float) Math.max(height, 1);

        if (Math.abs(current - (4f / 3f)) < 0.002f ||
                Math.abs(current - (3f / 4f)) < 0.002f) {
            return source;
        }

        int cropW;
        int cropH;
        if (current > 4f / 3f) {
            cropH = height;
            cropW = Math.round(height * 4f / 3f);
        } else {
            cropW = width;
            cropH = Math.round(width * 3f / 4f);
        }

        int left = Math.max(0, (width - cropW) / 2);
        int top = Math.max(0, (height - cropH) / 2);
        Bitmap out = Bitmap.createBitmap(source, left, top, cropW, cropH);
        return out == source ? source : out;
    }

    private static final class AutoPlan {
        final float exposure;
        final float contrast;
        final float saturation;
        final float warmth;
        final float detailBoost;

        AutoPlan(float exposure, float contrast, float saturation,
                 float warmth, float detailBoost) {
            this.exposure = exposure;
            this.contrast = contrast;
            this.saturation = saturation;
            this.warmth = warmth;
            this.detailBoost = detailBoost;
        }
    }

    private static AutoPlan analyze(Bitmap bitmap, Settings settings) {
        int w = bitmap.getWidth();
        int h = bitmap.getHeight();
        int step = Math.max(4, Math.min(w, h) / 120);

        double sum = 0;
        double sumSq = 0;
        long count = 0;
        long edges = 0;

        int[] pixels = new int[Math.max(1, ((w + step - 1) / step) *
                ((h + step - 1) / step))];
        int p = 0;

        for (int y = 0; y < h; y += step) {
            for (int x = 0; x < w; x += step) {
                int c = bitmap.getPixel(x, y);
                float r = Color.red(c) / 255f;
                float g = Color.green(c) / 255f;
                float b = Color.blue(c) / 255f;
                double lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                sum += lum;
                sumSq += lum * lum;
                count++;

                if (x + step < w && y + step < h) {
                    int c2 = bitmap.getPixel(x + step, y + step);
                    int dr = Math.abs(Color.red(c) - Color.red(c2));
                    int dg = Math.abs(Color.green(c) - Color.green(c2));
                    int db = Math.abs(Color.blue(c) - Color.blue(c2));
                    if (dr + dg + db > 90) edges++;
                }
                if (p < pixels.length) pixels[p++] = c;
            }
        }

        double mean = count == 0 ? 0.5 : sum / count;
        double variance = count == 0 ? 0 : Math.max(0, (sumSq / count) - mean * mean);
        float autoExposure = clamp((float)((0.5 - mean) * 1.35), -0.22f, 0.22f);
        float autoContrast = clamp((float)((0.13 - Math.sqrt(variance)) * 1.15), -0.12f, 0.12f);
        float autoSaturation = variance < 0.025 ? 0.07f : 0.015f;
        float autoWarmth = warmBias(pixels, p);
        float detail = clamp((float) (edges / (double)Math.max(count, 1)) * 4f, 0f, 1f);

        return new AutoPlan(
                autoExposure + settings.exposure,
                autoContrast + settings.contrast,
                autoSaturation + settings.saturation,
                autoWarmth + settings.warmth,
                detail
        );
    }

    private static float warmBias(int[] colors, int count) {
        if (count <= 0) return 0f;
        double red = 0;
        double blue = 0;
        for (int i = 0; i < count; i++) {
            red += Color.red(colors[i]);
            blue += Color.blue(colors[i]);
        }
        double delta = (red - blue) / (255.0 * count);
        return clamp((float)(-delta * 0.10), -0.05f, 0.05f);
    }

    private static Bitmap applyTone(Bitmap source, AutoPlan plan, Settings settings) {
        float exposureGain = (float)Math.pow(2.0, plan.exposure * 0.85);
        float contrast = 1f + plan.contrast * 0.75f;
        float saturation = Math.max(0.25f, 1f + plan.saturation * 0.65f);
        float warmR = 1f + plan.warmth * 1.0f;
        float warmB = 1f - plan.warmth * 1.0f;

        ColorMatrix matrix = new ColorMatrix(new float[]{
                exposureGain, 0, 0, 0, 0,
                0, exposureGain, 0, 0, 0,
                0, 0, exposureGain, 0, 0,
                0, 0, 0, 1, 0
        });

        matrix.postConcat(new ColorMatrix(new float[]{
                contrast, 0, 0, 0, 128f * (1f - contrast),
                0, contrast, 0, 0, 128f * (1f - contrast),
                0, 0, contrast, 0, 128f * (1f - contrast),
                0, 0, 0, 1, 0
        }));

        ColorMatrix sat = new ColorMatrix();
        sat.setSaturation(saturation);
        matrix.postConcat(sat);

        matrix.postConcat(new ColorMatrix(new float[]{
                warmR, 0, 0, 0, 0,
                0, 1f, 0, 0, 0,
                0, 0, warmB, 0, 0,
                0, 0, 0, 1, 0
        }));

        applyFilter(matrix, settings.filter);

        Bitmap out = Bitmap.createBitmap(
                source.getWidth(), source.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(out);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        paint.setColorFilter(new ColorMatrixColorFilter(matrix));
        canvas.drawBitmap(source, 0, 0, paint);
        return out;
    }

    private static void applyFilter(ColorMatrix matrix, String filter) {
        if ("Vivid".equals(filter)) {
            ColorMatrix m = new ColorMatrix();
            m.setSaturation(1.16f);
            matrix.postConcat(m);
        } else if ("Warm".equals(filter)) {
            matrix.postConcat(new ColorMatrix(new float[]{
                    1.08f, 0, 0, 0, 0,
                    0, 1.02f, 0, 0, 0,
                    0, 0, 0.88f, 0, 0,
                    0, 0, 0, 1, 0
            }));
        } else if ("Cool".equals(filter)) {
            matrix.postConcat(new ColorMatrix(new float[]{
                    0.92f, 0, 0, 0, 0,
                    0, 1.01f, 0, 0, 0,
                    0, 0, 1.09f, 0, 0,
                    0, 0, 0, 1, 0
            }));
        } else if ("Film".equals(filter)) {
            matrix.postConcat(new ColorMatrix(new float[]{
                    1.035f, 0, 0, 0, -4,
                    0, 0.99f, 0, 0, 1,
                    0, 0, 0.94f, 0, 4,
                    0, 0, 0, 1, 0
            }));
        } else if ("Mono".equals(filter)) {
            ColorMatrix m = new ColorMatrix();
            m.setSaturation(0f);
            matrix.postConcat(m);
        }
    }

    private static Bitmap sharpen(Bitmap source, float amount) {
        amount = clamp(amount, 0f, 0.45f);
        if (amount < 0.01f) return source;

        int w = source.getWidth();
        int h = source.getHeight();
        Bitmap out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);

        int[] src = new int[w * h];
        int[] dst = new int[w * h];
        source.getPixels(src, 0, w, 0, 0, w, h);

        for (int y = 0; y < h; y++) {
            int ym = Math.max(0, y - 1);
            int yp = Math.min(h - 1, y + 1);
            for (int x = 0; x < w; x++) {
                int xm = Math.max(0, x - 1);
                int xp = Math.min(w - 1, x + 1);
                int center = src[y * w + x];
                int cUp = src[ym * w + x];
                int cDn = src[yp * w + x];
                int cLt = src[y * w + xm];
                int cRt = src[y * w + xp];

                int r = sharpenChannel(Color.red(center), Color.red(cUp), Color.red(cDn),
                        Color.red(cLt), Color.red(cRt), amount);
                int g = sharpenChannel(Color.green(center), Color.green(cUp), Color.green(cDn),
                        Color.green(cLt), Color.green(cRt), amount);
                int b = sharpenChannel(Color.blue(center), Color.blue(cUp), Color.blue(cDn),
                        Color.blue(cLt), Color.blue(cRt), amount);
                dst[y * w + x] = Color.argb(Color.alpha(center), r, g, b);
            }
        }

        out.setPixels(dst, 0, w, 0, 0, w, h);
        return out;
    }

    private static int sharpenChannel(int center, int up, int down,
                                      int left, int right, float amount) {
        float lap = 4f * center - up - down - left - right;
        return clamp(Math.round(center + lap * amount), 0, 255);
    }

    private static int[] targetSize4x3(int width, int height) {
        boolean portrait = height > width;
        return portrait
                ? new int[]{2880, 3840}
                : new int[]{3840, 2880};
    }

    private static float clamp(float v, float lo, float hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    private static int clamp(int v, int lo, int hi) {
        return Math.max(lo, Math.min(hi, v));
    }
}
