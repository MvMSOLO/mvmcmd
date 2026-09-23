package com.mvmcmd.launcher;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Matrix;
import android.media.ExifInterface;

import androidx.annotation.NonNull;

import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Native, on-device camera image pipeline.
 *
 * Pipeline:
 * decode -> orientation -> multi-frame registration/median merge -> analysis
 * -> white balance -> shadow/highlight recovery -> edge-aware denoise
 * -> adaptive deblur/detail recovery -> filter/color grade
 * -> edge-guided 4K reconstruction -> JPEG.
 *
 * This is intentionally dependency-light and deterministic. It does not call
 * a remote AI service or pretend that a resize operation is a neural model.
 */
public final class PhotoProcessor {

    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();
    private static final android.os.Handler MAIN =
            new android.os.Handler(android.os.Looper.getMainLooper());

    private static final int DEFAULT_WORKING_LONG_EDGE = 2048;
    private static final int LOW_MEMORY_WORKING_LONG_EDGE = 1280;
    private static final int MID_MEMORY_WORKING_LONG_EDGE = 1536;
    private static final int FINAL_LONG_EDGE = 3840;
    private static final int MAX_BURST_FRAMES = 3;

    private PhotoProcessor() {}

    public static final class Settings {
        public final String filter;
        public final float exposure;
        public final float contrast;
        public final float saturation;
        public final float warmth;

        public Settings(
                String filter,
                float exposure,
                float contrast,
                float saturation,
                float warmth) {
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
        ArrayList<File> single = new ArrayList<>();
        single.add(source);
        processAsync(single, settings, callback);
    }

    public static void processAsync(
            List<File> sources,
            Settings settings,
            Callback callback) {
        EXECUTOR.execute(() -> {
            File result = null;
            try {
                result = process(sources, settings, callback);
                File finalResult = result;
                MAIN.post(() -> callback.onDone(finalResult));
            } catch (Throwable error) {
                File failed = result;
                MAIN.post(() -> callback.onError(error));
                if (failed != null && failed.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    failed.delete();
                }
            }
        });
    }

    private static File process(
            List<File> sources,
            Settings settings,
            Callback callback) throws Exception {

        if (sources == null || sources.isEmpty()) {
            throw new IllegalArgumentException("No image source");
        }

        ArrayList<File> usable = new ArrayList<>();
        for (File file : sources) {
            if (file != null && file.exists() && file.length() > 0) {
                usable.add(file);
            }
            if (usable.size() >= MAX_BURST_FRAMES) break;
        }
        if (usable.isEmpty()) throw new IllegalStateException("No readable image source");

        callback.onProgress(4, usable.size() > 1
                ? "BURST  ·  MULTI-FRAME ALIGN"
                : "READ  ·  SOURCE");

        ArrayList<Bitmap> frames = new ArrayList<>();
        for (int i = 0; i < usable.size(); i++) {
            callback.onProgress(
                    6 + (i * 8 / Math.max(1, usable.size())),
                    String.format(Locale.US, "FRAME  %d/%d", i + 1, usable.size()));
            frames.add(decodeWorking(usable.get(i)));
        }

        Bitmap merged;
        if (frames.size() == 1) {
            merged = frames.get(0);
        } else {
            merged = mergeBurst(frames, callback);
            for (Bitmap frame : frames) {
                if (frame != merged && !frame.isRecycled()) frame.recycle();
            }
        }

        callback.onProgress(28, "ANALYZE  ·  SCENE");
        SceneStats stats = analyzeScene(merged);

        callback.onProgress(36, "WHITE BALANCE  ·  AUTO");
        int[] pixels = new int[merged.getWidth() * merged.getHeight()];
        merged.getPixels(pixels, 0, merged.getWidth(), 0, 0,
                merged.getWidth(), merged.getHeight());

        applyAdaptiveWhiteBalance(pixels, stats, settings);
        applyShadowHighlightRecovery(
                pixels, stats, settings.exposure, settings.contrast);
        callback.onProgress(48, "DENOISE  ·  EDGE AWARE");
        edgeAwareDenoise(pixels, merged.getWidth(), merged.getHeight(), stats.noiseEstimate);

        callback.onProgress(61, "DEBLUR  ·  ADAPTIVE DETAIL");
        adaptiveDeblur(pixels, merged.getWidth(), merged.getHeight(), stats);

        callback.onProgress(69, "COLOR  ·  LOOK GRAPH");
        applyColorPipeline(pixels, settings, stats);

        Bitmap processed = Bitmap.createBitmap(
                merged.getWidth(), merged.getHeight(), Bitmap.Config.ARGB_8888);
        processed.setPixels(
                pixels, 0, merged.getWidth(), 0, 0,
                merged.getWidth(), merged.getHeight());
        if (processed != merged && !merged.isRecycled()) merged.recycle();

        callback.onProgress(76, "UPSCALE  ·  EDGE GUIDED 4K");
        int[] target = targetSize4x3(
                processed.getWidth(), processed.getHeight());
        Bitmap reconstructed = reconstruct4K(processed, target[0], target[1], stats);

        if (reconstructed != processed && !processed.isRecycled()) {
            processed.recycle();
        }

        callback.onProgress(94, "WRITE  ·  JPEG 97");
        File parent = usable.get(0).getParentFile();
        if (parent == null) parent = usable.get(0).getAbsoluteFile().getParentFile();
        File output = new File(parent,
                "mvm_photo_processed_" + System.currentTimeMillis() + ".jpg");

        try (FileOutputStream out = new FileOutputStream(output)) {
            if (!reconstructed.compress(Bitmap.CompressFormat.JPEG, 97, out)) {
                throw new IllegalStateException("JPEG encode failed");
            }
        }
        reconstructed.recycle();

        callback.onProgress(
                100,
                String.format(Locale.US, "READY  ·  %dx%d", target[0], target[1]));
        return output;
    }

    private static Bitmap decodeWorking(File source) throws Exception {
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(source.getAbsolutePath(), bounds);

        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
            throw new IllegalStateException("Invalid image");
        }

        int max = Math.max(bounds.outWidth, bounds.outHeight);
        int workingLongEdge = chooseWorkingLongEdge();
        int sample = 1;
        while (Math.ceil(max / (double) sample) > workingLongEdge) {
            sample *= 2;
        }

        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inPreferredConfig = Bitmap.Config.ARGB_8888;
        options.inSampleSize = sample;

        Bitmap decoded = BitmapFactory.decodeFile(source.getAbsolutePath(), options);
        if (decoded == null) throw new IllegalStateException("Decode failed");

        ExifInterface exif = new ExifInterface(source.getAbsolutePath());
        int orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL);

        Bitmap oriented = applyExifOrientation(decoded, orientation);
        if (oriented != decoded && !decoded.isRecycled()) decoded.recycle();

        return cropTo4x3(oriented);
    }

    /**
     * Choose a safe working resolution from the phone's actual runtime heap.
     * Final export still reconstructs to 3840px long edge.
     */
    private static int chooseWorkingLongEdge() {
        Runtime runtime = Runtime.getRuntime();
        long maxHeap = runtime.maxMemory();
        long usedHeap = runtime.totalMemory() - runtime.freeMemory();
        long remaining = Math.max(0L, maxHeap - usedHeap);

        if (maxHeap <= 192L * 1024L * 1024L || remaining < 56L * 1024L * 1024L) {
            return LOW_MEMORY_WORKING_LONG_EDGE;
        }
        if (maxHeap <= 320L * 1024L * 1024L || remaining < 96L * 1024L * 1024L) {
            return MID_MEMORY_WORKING_LONG_EDGE;
        }
        return DEFAULT_WORKING_LONG_EDGE;
    }

    private static Bitmap applyExifOrientation(Bitmap source, int orientation) {
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
            case ExifInterface.ORIENTATION_TRANSPOSE:
                matrix.setRotate(90);
                matrix.postScale(-1, 1);
                break;
            case ExifInterface.ORIENTATION_TRANSVERSE:
                matrix.setRotate(270);
                matrix.postScale(-1, 1);
                break;
            default:
                return source;
        }

        Bitmap transformed = Bitmap.createBitmap(
                source,
                0,
                0,
                source.getWidth(),
                source.getHeight(),
                matrix,
                true);
        return transformed == source ? source : transformed;
    }

    private static Bitmap cropTo4x3(Bitmap source) {
        int width = source.getWidth();
        int height = source.getHeight();
        float ratio = width / (float) Math.max(1, height);

        if (Math.abs(ratio - (4f / 3f)) < 0.002f
                || Math.abs(ratio - (3f / 4f)) < 0.002f) {
            return source;
        }

        int cropW;
        int cropH;
        if (ratio > 4f / 3f) {
            cropH = height;
            cropW = Math.round(height * 4f / 3f);
        } else {
            cropW = width;
            cropH = Math.round(width * 3f / 4f);
        }

        int left = Math.max(0, (width - cropW) / 2);
        int top = Math.max(0, (height - cropH) / 2);
        Bitmap cropped = Bitmap.createBitmap(
                source, left, top, cropW, cropH);
        return cropped == source ? source : cropped;
    }

    private static Bitmap mergeBurst(
            List<Bitmap> frames,
            Callback callback) {
        Bitmap reference = frames.get(0);
        int width = reference.getWidth();
        int height = reference.getHeight();

        int[] ref = new int[width * height];
        reference.getPixels(ref, 0, width, 0, 0, width, height);

        int frameCount = frames.size();
        int[][] arrays = new int[frameCount][];
        arrays[0] = ref;
        int[][] shifts = new int[frameCount][2];

        for (int i = 1; i < frameCount; i++) {
            int[] data = new int[width * height];
            frames.get(i).getPixels(data, 0, width, 0, 0, width, height);
            arrays[i] = data;
            shifts[i] = estimateTranslation(ref, data, width, height);
            callback.onProgress(
                    12 + (i * 5),
                    String.format(
                            Locale.US,
                            "ALIGN  ·  FRAME %d/%d  ·  %+d,%+d",
                            i + 1, frameCount,
                            shifts[i][0], shifts[i][1]));
        }

        int[] merged = new int[width * height];
        int[] rs = new int[frameCount];
        int[] gs = new int[frameCount];
        int[] bs = new int[frameCount];

        for (int y = 0; y < height; y++) {
            int row = y * width;
            for (int x = 0; x < width; x++) {
                int usable = 0;
                for (int i = 0; i < frameCount; i++) {
                    int sx = x;
                    int sy = y;
                    if (i > 0) {
                        sx += shifts[i][0];
                        sy += shifts[i][1];
                    }
                    if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;

                    int c = arrays[i][sy * width + sx];
                    rs[usable] = Color.red(c);
                    gs[usable] = Color.green(c);
                    bs[usable] = Color.blue(c);
                    usable++;
                }

                if (usable == 0) {
                    merged[row + x] = ref[row + x];
                    continue;
                }

                sortPrefix(rs, usable);
                sortPrefix(gs, usable);
                sortPrefix(bs, usable);
                int r = rs[usable / 2];
                int g = gs[usable / 2];
                int b = bs[usable / 2];
                merged[row + x] = Color.rgb(r, g, b);
            }
        }

        Bitmap output = Bitmap.createBitmap(
                width, height, Bitmap.Config.ARGB_8888);
        output.setPixels(merged, 0, width, 0, 0, width, height);
        return output;
    }

    private static int[] estimateTranslation(
            int[] ref,
            int[] candidate,
            int width,
            int height) {
        int bestDx = 0;
        int bestDy = 0;
        long bestScore = Long.MAX_VALUE;

        int step = Math.max(8, Math.min(width, height) / 120);
        int radius = 5;
        int left = width / 5;
        int right = width - left;
        int top = height / 5;
        int bottom = height - top;

        for (int dy = -radius; dy <= radius; dy++) {
            for (int dx = -radius; dx <= radius; dx++) {
                long score = 0;
                int samples = 0;

                for (int y = top; y < bottom; y += step) {
                    int cy = y + dy;
                    if (cy < 0 || cy >= height) continue;
                    for (int x = left; x < right; x += step) {
                        int cx = x + dx;
                        if (cx < 0 || cx >= width) continue;

                        int a = ref[y * width + x];
                        int b = candidate[cy * width + cx];

                        int la = (54 * Color.red(a)
                                + 183 * Color.green(a)
                                + 19 * Color.blue(a)) >> 8;
                        int lb = (54 * Color.red(b)
                                + 183 * Color.green(b)
                                + 19 * Color.blue(b)) >> 8;

                        score += Math.abs(la - lb);
                        samples++;
                    }
                }

                if (samples > 0) {
                    long normalized = score / samples;
                    if (normalized < bestScore) {
                        bestScore = normalized;
                        bestDx = dx;
                        bestDy = dy;
                    }
                }
            }
        }

        return new int[]{bestDx, bestDy};
    }

    private static void sortPrefix(int[] values, int count) {
        for (int i = 1; i < count; i++) {
            int value = values[i];
            int j = i - 1;
            while (j >= 0 && values[j] > value) {
                values[j + 1] = values[j];
                j--;
            }
            values[j + 1] = value;
        }
    }

    private static final class SceneStats {
        final float meanLum;
        final float varianceLum;
        final float redMean;
        final float greenMean;
        final float blueMean;
        final float highlightRatio;
        final float shadowRatio;
        final float edgeDensity;
        final float noiseEstimate;

        SceneStats(
                float meanLum,
                float varianceLum,
                float redMean,
                float greenMean,
                float blueMean,
                float highlightRatio,
                float shadowRatio,
                float edgeDensity,
                float noiseEstimate) {
            this.meanLum = meanLum;
            this.varianceLum = varianceLum;
            this.redMean = redMean;
            this.greenMean = greenMean;
            this.blueMean = blueMean;
            this.highlightRatio = highlightRatio;
            this.shadowRatio = shadowRatio;
            this.edgeDensity = edgeDensity;
            this.noiseEstimate = noiseEstimate;
        }
    }

    private static SceneStats analyzeScene(Bitmap bitmap) {
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        int step = Math.max(4, Math.min(width, height) / 180);

        double lumSum = 0;
        double lumSq = 0;
        double rSum = 0;
        double gSum = 0;
        double bSum = 0;
        long count = 0;
        long highlights = 0;
        long shadows = 0;
        long edges = 0;
        double noiseAccum = 0;
        long noiseSamples = 0;

        for (int y = step; y < height - step; y += step) {
            for (int x = step; x < width - step; x += step) {
                int c = bitmap.getPixel(x, y);
                float r = Color.red(c) / 255f;
                float g = Color.green(c) / 255f;
                float b = Color.blue(c) / 255f;
                float lum = 0.2126f * r + 0.7152f * g + 0.0722f * b;

                lumSum += lum;
                lumSq += lum * lum;
                rSum += r;
                gSum += g;
                bSum += b;
                count++;

                if (lum > 0.88f) highlights++;
                if (lum < 0.14f) shadows++;

                int c2 = bitmap.getPixel(x + step, y + step);
                int dr = Math.abs(Color.red(c) - Color.red(c2));
                int dg = Math.abs(Color.green(c) - Color.green(c2));
                int db = Math.abs(Color.blue(c) - Color.blue(c2));
                int gradient = dr + dg + db;
                if (gradient > 100) edges++;

                if (gradient < 55) {
                    int c3 = bitmap.getPixel(x + step, y);
                    int c4 = bitmap.getPixel(x, y + step);
                    int dl1 = Math.abs(luminance8(c) - luminance8(c3));
                    int dl2 = Math.abs(luminance8(c) - luminance8(c4));
                    noiseAccum += (dl1 + dl2) * 0.5;
                    noiseSamples++;
                }
            }
        }

        if (count == 0) count = 1;

        float mean = (float) (lumSum / count);
        float variance = (float) Math.max(
                0,
                (lumSq / count) - mean * mean);
        float rMean = (float) (rSum / count);
        float gMean = (float) (gSum / count);
        float bMean = (float) (bSum / count);
        float highlightRatio = highlights / (float) count;
        float shadowRatio = shadows / (float) count;
        float edgeDensity = edges / (float) count;
        float noise = noiseSamples == 0
                ? 0.02f
                : Math.min(1f, (float) (noiseAccum / noiseSamples) / 22f);

        return new SceneStats(
                mean,
                variance,
                rMean,
                gMean,
                bMean,
                highlightRatio,
                shadowRatio,
                edgeDensity,
                noise);
    }

    private static void applyAdaptiveWhiteBalance(
            int[] pixels,
            SceneStats stats,
            Settings settings) {
        float avg = (stats.redMean + stats.greenMean + stats.blueMean) / 3f;
        if (avg < 0.02f) return;

        float rGain = clamp(avg / Math.max(stats.redMean, 0.04f), 0.84f, 1.18f);
        float gGain = clamp(avg / Math.max(stats.greenMean, 0.04f), 0.90f, 1.12f);
        float bGain = clamp(avg / Math.max(stats.blueMean, 0.04f), 0.84f, 1.18f);

        // User warmth sits on top of the auto gray-world correction.
        float warmthR = 1f + settings.warmth * 0.10f;
        float warmthB = 1f - settings.warmth * 0.10f;

        for (int i = 0; i < pixels.length; i++) {
            int c = pixels[i];
            int r = clamp(Math.round(Color.red(c) * rGain * warmthR), 0, 255);
            int g = clamp(Math.round(Color.green(c) * gGain), 0, 255);
            int b = clamp(Math.round(Color.blue(c) * bGain * warmthB), 0, 255);
            pixels[i] = Color.rgb(r, g, b);
        }
    }

    private static void applyShadowHighlightRecovery(
            int[] pixels,
            SceneStats stats,
            float exposure,
            float contrast) {
        float exposureGain = (float) Math.pow(2.0, exposure * 0.85);
        float shadowLift = 0.08f + stats.shadowRatio * 0.30f;
        float highlightCompress = 0.10f + stats.highlightRatio * 0.35f;
        float contrastGain = 1f + contrast * 0.35f;

        for (int i = 0; i < pixels.length; i++) {
            int c = pixels[i];
            float r = Color.red(c) / 255f;
            float g = Color.green(c) / 255f;
            float b = Color.blue(c) / 255f;
            float lum = 0.2126f * r + 0.7152f * g + 0.0722f * b;

            float mapped = lum * exposureGain;
            if (mapped < 0.45f) {
                mapped += shadowLift * (0.45f - mapped) / 0.45f;
            }
            if (mapped > 0.68f) {
                float t = (mapped - 0.68f) / 0.32f;
                mapped = 0.68f + 0.32f * (1f - (1f - t)
                        * (1f - highlightCompress));
            }

            mapped = clamp(
                    (mapped - 0.5f) * contrastGain + 0.5f,
                    0f,
                    1f);

            float scale = lum < 0.001f ? 0f : mapped / lum;
            r = clamp(r * scale, 0f, 1f);
            g = clamp(g * scale, 0f, 1f);
            b = clamp(b * scale, 0f, 1f);

            pixels[i] = Color.rgb(
                    Math.round(r * 255f),
                    Math.round(g * 255f),
                    Math.round(b * 255f));
        }
    }

    private static void edgeAwareDenoise(
            int[] pixels,
            int width,
            int height,
            float noiseEstimate) {
        if (noiseEstimate < 0.08f) return;

        int[] source = pixels.clone();
        float strength = clamp(
                0.15f + noiseEstimate * 0.55f,
                0.15f,
                0.60f);

        for (int y = 1; y < height - 1; y++) {
            int row = y * width;
            for (int x = 1; x < width - 1; x++) {
                int center = source[row + x];
                int left = source[row + x - 1];
                int right = source[row + x + 1];
                int up = source[row - width + x];
                int down = source[row + width + x];

                int centerLum = luminance8(center);
                int range = Math.max(
                        Math.max(
                                Math.abs(centerLum - luminance8(left)),
                                Math.abs(centerLum - luminance8(right))),
                        Math.max(
                                Math.abs(centerLum - luminance8(up)),
                                Math.abs(centerLum - luminance8(down))));

                // Preserve real edges; smooth mostly in flat regions.
                float blend = range > 26
                        ? strength * 0.18f
                        : strength;

                int rAvg = (Color.red(left)
                        + Color.red(right)
                        + Color.red(up)
                        + Color.red(down)) / 4;
                int gAvg = (Color.green(left)
                        + Color.green(right)
                        + Color.green(up)
                        + Color.green(down)) / 4;
                int bAvg = (Color.blue(left)
                        + Color.blue(right)
                        + Color.blue(up)
                        + Color.blue(down)) / 4;

                int r = clamp(Math.round(
                        Color.red(center) * (1f - blend)
                                + rAvg * blend), 0, 255);
                int g = clamp(Math.round(
                        Color.green(center) * (1f - blend)
                                + gAvg * blend), 0, 255);
                int b = clamp(Math.round(
                        Color.blue(center) * (1f - blend)
                                + bAvg * blend), 0, 255);

                pixels[row + x] = Color.rgb(r, g, b);
            }
        }
    }

    private static void adaptiveDeblur(
            int[] pixels,
            int width,
            int height,
            SceneStats stats) {
        int[] source = pixels.clone();
        float base = 0.05f + stats.edgeDensity * 0.26f;
        if (stats.noiseEstimate > 0.25f) base *= 0.65f;
        base = clamp(base, 0.035f, 0.20f);

        for (int y = 1; y < height - 1; y++) {
            int row = y * width;
            for (int x = 1; x < width - 1; x++) {
                int i = row + x;
                int center = source[i];

                int rLap = 4 * Color.red(center)
                        - Color.red(source[i - 1])
                        - Color.red(source[i + 1])
                        - Color.red(source[i - width])
                        - Color.red(source[i + width]);

                int gLap = 4 * Color.green(center)
                        - Color.green(source[i - 1])
                        - Color.green(source[i + 1])
                        - Color.green(source[i - width])
                        - Color.green(source[i + width]);

                int bLap = 4 * Color.blue(center)
                        - Color.blue(source[i - 1])
                        - Color.blue(source[i + 1])
                        - Color.blue(source[i - width])
                        - Color.blue(source[i + width]);

                float edge = clamp(
                        Math.abs(luminance8(source[i - 1])
                                - luminance8(source[i + 1])) / 64f,
                        0f,
                        1f);
                float amount = base * (0.55f + edge * 0.90f);

                pixels[i] = Color.rgb(
                        clamp(Math.round(
                                Color.red(center) + rLap * amount), 0, 255),
                        clamp(Math.round(
                                Color.green(center) + gLap * amount), 0, 255),
                        clamp(Math.round(
                                Color.blue(center) + bLap * amount), 0, 255));
            }
        }
    }

    private static void applyColorPipeline(
            int[] pixels,
            Settings settings,
            SceneStats stats) {
        float satGain = clamp(
                1f + settings.saturation * 0.42f
                        + (0.035f - stats.varianceLum) * 0.75f,
                0.55f,
                1.55f);

        for (int i = 0; i < pixels.length; i++) {
            int c = pixels[i];

            float r = Color.red(c) / 255f;
            float g = Color.green(c) / 255f;
            float b = Color.blue(c) / 255f;
            float lum = 0.2126f * r + 0.7152f * g + 0.0722f * b;

            if ("Vivid".equals(settings.filter)) {
                satGain *= 1.06f;
            } else if ("Warm".equals(settings.filter)) {
                r *= 1.06f;
                b *= 0.91f;
            } else if ("Cool".equals(settings.filter)) {
                r *= 0.93f;
                b *= 1.06f;
            } else if ("Film".equals(settings.filter)) {
                r = clamp(r * 1.025f - 0.012f, 0f, 1f);
                g = clamp(g * 0.995f + 0.004f, 0f, 1f);
                b = clamp(b * 0.955f + 0.014f, 0f, 1f);
            } else if ("Mono".equals(settings.filter)) {
                r = g = b = lum;
            }

            r = lum + (r - lum) * satGain;
            g = lum + (g - lum) * satGain;
            b = lum + (b - lum) * satGain;

            pixels[i] = Color.rgb(
                    clamp(Math.round(r * 255f), 0, 255),
                    clamp(Math.round(g * 255f), 0, 255),
                    clamp(Math.round(b * 255f), 0, 255));
        }
    }

    /**
     * Edge-guided reconstruction rather than a blind Bitmap.createScaledBitmap call.
     * The low-frequency image is bilinearly reconstructed and a locally estimated
     * high-frequency residual is injected only where the source has coherent edges.
     */
    private static Bitmap reconstruct4K(
            Bitmap source,
            int outWidth,
            int outHeight,
            SceneStats stats) {
        int width = source.getWidth();
        int height = source.getHeight();
        int[] src = new int[width * height];
        source.getPixels(src, 0, width, 0, 0, width, height);

        Bitmap output = Bitmap.createBitmap(
                outWidth, outHeight, Bitmap.Config.ARGB_8888);
        int[] row = new int[outWidth];

        float xScale = (width - 1f) / Math.max(1, outWidth - 1);
        float yScale = (height - 1f) / Math.max(1, outHeight - 1);
        float textureBoost = clamp(
                0.20f + stats.edgeDensity * 0.75f
                        - stats.noiseEstimate * 0.25f,
                0.12f,
                0.62f);

        for (int y = 0; y < outHeight; y++) {
            float sy = y * yScale;
            int y0 = (int) sy;
            int y1 = Math.min(height - 1, y0 + 1);
            float fy = sy - y0;

            for (int x = 0; x < outWidth; x++) {
                float sx = x * xScale;
                int x0 = (int) sx;
                int x1 = Math.min(width - 1, x0 + 1);
                float fx = sx - x0;

                int c00 = src[y0 * width + x0];
                int c10 = src[y0 * width + x1];
                int c01 = src[y1 * width + x0];
                int c11 = src[y1 * width + x1];

                float rTop = Color.red(c00) * (1f - fx)
                        + Color.red(c10) * fx;
                float rBottom = Color.red(c01) * (1f - fx)
                        + Color.red(c11) * fx;
                float gTop = Color.green(c00) * (1f - fx)
                        + Color.green(c10) * fx;
                float gBottom = Color.green(c01) * (1f - fx)
                        + Color.green(c11) * fx;
                float bTop = Color.blue(c00) * (1f - fx)
                        + Color.blue(c10) * fx;
                float bBottom = Color.blue(c01) * (1f - fx)
                        + Color.blue(c11) * fx;

                float r = rTop * (1f - fy) + rBottom * fy;
                float g = gTop * (1f - fy) + gBottom * fy;
                float b = bTop * (1f - fy) + bBottom * fy;

                int nearX = Math.min(width - 1, Math.max(0, Math.round(sx)));
                int nearY = Math.min(height - 1, Math.max(0, Math.round(sy)));
                int center = src[nearY * width + nearX];

                int left = src[nearY * width + Math.max(0, nearX - 1)];
                int right = src[nearY * width + Math.min(width - 1, nearX + 1)];
                int up = src[Math.max(0, nearY - 1) * width + nearX];
                int down = src[Math.min(height - 1, nearY + 1) * width + nearX];

                float edge = clamp(
                        Math.abs(luminance8(left) - luminance8(right)) / 70f
                                + Math.abs(luminance8(up) - luminance8(down)) / 70f,
                        0f,
                        1f);

                float localWeight = edge * textureBoost;
                r += (Color.red(center) - r) * localWeight;
                g += (Color.green(center) - g) * localWeight;
                b += (Color.blue(center) - b) * localWeight;

                row[x] = Color.rgb(
                        clamp(Math.round(r), 0, 255),
                        clamp(Math.round(g), 0, 255),
                        clamp(Math.round(b), 0, 255));
            }
            output.setPixels(row, 0, outWidth, 0, y, outWidth, 1);
        }
        return output;
    }

    private static int luminance8(int color) {
        return (54 * Color.red(color)
                + 183 * Color.green(color)
                + 19 * Color.blue(color)) >> 8;
    }

    private static int[] targetSize4x3(int width, int height) {
        boolean portrait = height > width;
        return portrait
                ? new int[]{2880, FINAL_LONG_EDGE}
                : new int[]{FINAL_LONG_EDGE, 2880};
    }

    private static int clamp(int value, int low, int high) {
        return Math.max(low, Math.min(high, value));
    }

    private static float clamp(float value, float low, float high) {
        return Math.max(low, Math.min(high, value));
    }
}
