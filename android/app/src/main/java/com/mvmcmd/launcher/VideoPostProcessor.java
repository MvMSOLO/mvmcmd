package com.mvmcmd.launcher;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.media3.common.Effect;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.effect.LanczosResample;
import androidx.media3.effect.RgbAdjustment;
import androidx.media3.transformer.Composition;
import androidx.media3.transformer.EditedMediaItem;
import androidx.media3.transformer.Effects;
import androidx.media3.transformer.ExportException;
import androidx.media3.transformer.ExportResult;
import androidx.media3.transformer.Transformer;

import com.google.common.collect.ImmutableList;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

@UnstableApi
public final class VideoPostProcessor {

    private VideoPostProcessor() {}

    public interface Callback {
        void onDone(File result);
        void onError(Throwable error);
    }

    public static void processAsync(
            Context context,
            File source,
            String filter,
            float exposure,
            float contrast,
            float saturation,
            float warmth,
            Callback callback) {
        int[] targets = {2880, 1920, 1440};
        VideoPlan plan = analyzeTemporalPlan(source, exposure, contrast, saturation, warmth);
        startExport(context, source, filter, plan, targets, 0, callback);
    }

    /**
     * Samples the beginning/middle/end of the clip and derives one temporally
     * stable correction plan. The plan is intentionally fixed for the whole
     * export so changing illumination between neighboring frames cannot cause
     * correction flicker.
     */
    private static final class VideoPlan {
        final float exposure;
        final float contrast;
        final float saturation;
        final float warmth;
        final float redGain;
        final float greenGain;
        final float blueGain;

        VideoPlan(
                float exposure,
                float contrast,
                float saturation,
                float warmth,
                float redGain,
                float greenGain,
                float blueGain) {
            this.exposure = exposure;
            this.contrast = contrast;
            this.saturation = saturation;
            this.warmth = warmth;
            this.redGain = redGain;
            this.greenGain = greenGain;
            this.blueGain = blueGain;
        }
    }

    private static VideoPlan analyzeTemporalPlan(
            File source,
            float exposure,
            float contrast,
            float saturation,
            float warmth) {
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        ArrayList<Float> lums = new ArrayList<>();
        ArrayList<Float> reds = new ArrayList<>();
        ArrayList<Float> greens = new ArrayList<>();
        ArrayList<Float> blues = new ArrayList<>();

        try {
            retriever.setDataSource(source.getAbsolutePath());
            String durationText = retriever.extractMetadata(
                    MediaMetadataRetriever.METADATA_KEY_DURATION);
            long durationMs = durationText == null ? 0L
                    : Long.parseLong(durationText);

            if (durationMs > 0) {
                int samples = durationMs < 1800L ? 3 : 7;
                for (int i = 0; i < samples; i++) {
                    long tMs = samples == 1
                            ? 0
                            : (durationMs - 1L) * i / (samples - 1L);

                    Bitmap frame;
                    if (android.os.Build.VERSION.SDK_INT >= 27) {
                        frame = retriever.getScaledFrameAtTime(
                                tMs * 1000L,
                                MediaMetadataRetriever.OPTION_CLOSEST,
                                320,
                                240);
                    } else {
                        frame = retriever.getFrameAtTime(
                                tMs * 1000L,
                                MediaMetadataRetriever.OPTION_CLOSEST);
                    }

                    if (frame == null) continue;

                    long rSum = 0L;
                    long gSum = 0L;
                    long bSum = 0L;
                    long count = 0L;
                    int step = Math.max(
                            2,
                            Math.min(frame.getWidth(), frame.getHeight()) / 48);

                    for (int y = 0; y < frame.getHeight(); y += step) {
                        for (int x = 0; x < frame.getWidth(); x += step) {
                            int color = frame.getPixel(x, y);
                            rSum += Color.red(color);
                            gSum += Color.green(color);
                            bSum += Color.blue(color);
                            count++;
                        }
                    }

                    if (count > 0) {
                        float r = rSum / (255f * count);
                        float g = gSum / (255f * count);
                        float b = bSum / (255f * count);
                        float lum = 0.2126f * r + 0.7152f * g + 0.0722f * b;
                        lums.add(lum);
                        reds.add(r);
                        greens.add(g);
                        blues.add(b);
                    }

                    frame.recycle();
                }
            }
        } catch (Throwable ignored) {
            // Native export remains available even when optional analysis fails.
        } finally {
            try {
                retriever.release();
            } catch (Exception ignored) {
                // Analysis cleanup must never block the native export fallback.
            }
        }

        if (lums.isEmpty()) {
            return new VideoPlan(
                    exposure, contrast, saturation, warmth,
                    1f, 1f, 1f);
        }

        float meanLum = mean(lums);
        float meanR = mean(reds);
        float meanG = mean(greens);
        float meanB = mean(blues);
        float gray = (meanR + meanG + meanB) / 3f;

        float autoExposure = clamp(
                (0.50f - meanLum) * 1.15f,
                -0.18f,
                0.18f);

        float stableR = clamp(
                gray / Math.max(0.05f, meanR),
                0.88f,
                1.14f);
        float stableG = clamp(
                gray / Math.max(0.05f, meanG),
                0.92f,
                1.10f);
        float stableB = clamp(
                gray / Math.max(0.05f, meanB),
                0.88f,
                1.14f);

        return new VideoPlan(
                clamp(exposure + autoExposure, -1f, 1f),
                contrast,
                saturation,
                warmth,
                stableR,
                stableG,
                stableB);
    }

    private static float mean(List<Float> values) {
        float sum = 0f;
        for (Float value : values) sum += value;
        return sum / Math.max(1, values.size());
    }

    private static void startExport(
            Context context,
            File source,
            String filter,
            VideoPlan plan,
            int[] targets,
            int index,
            Callback callback) {

        final int shortSide = targets[index];
        File output = new File(
                source.getParentFile(),
                "mvm_video_processed_" + shortSide + "_" + System.currentTimeMillis() + ".mp4"
        );

        Handler main = new Handler(Looper.getMainLooper());
        main.post(() -> {
            try {
                List<Effect> videoEffects = new ArrayList<>();

                // True GPU Lanczos reconstruction. For the native 4:3 camera,
                // 3840x2880 is the 4K-class tier; lower tiers are real fallbacks.
                videoEffects.add(
                        int targetWidth = shortSide * 4 / 3;
                videoEffects.add(
                        LanczosResample.scaleToFitWithFlexibleOrientation(
                                targetWidth, shortSide));

                float gain = (float) Math.pow(2.0, plan.exposure * 0.70);
                float r = gain * plan.redGain
                        * (1f + plan.warmth * 0.12f);
                float g = gain * plan.greenGain
                        * (1f + plan.contrast * 0.04f);
                float b = gain * plan.blueGain
                        * (1f - plan.warmth * 0.12f);

                if ("Vivid".equals(filter)) {
                    r *= 1.08f;
                    g *= 1.08f;
                    b *= 1.08f;
                } else if ("Warm".equals(filter)) {
                    r *= 1.08f;
                    b *= 0.88f;
                } else if ("Cool".equals(filter)) {
                    r *= 0.92f;
                    b *= 1.09f;
                } else if ("Film".equals(filter)) {
                    r *= 1.03f;
                    g *= 0.99f;
                    b *= 0.94f;
                } else if ("Mono".equals(filter)) {
                    r = 0.2126f * gain;
                    g = 0.7152f * gain;
                    b = 0.0722f * gain;
                }

                float sat = Math.max(
                        0.85f, 1f + plan.saturation * 0.35f);
                RgbAdjustment rgb = new RgbAdjustment.Builder()
                        .setRedScale(Math.max(0f, r * sat))
                        .setGreenScale(Math.max(0f, g * sat))
                        .setBlueScale(Math.max(0f, b * sat))
                        .build();
                videoEffects.add(rgb);

                Effects effects = new Effects(
                        ImmutableList.of(),
                        ImmutableList.copyOf(videoEffects)
                );

                MediaItem mediaItem = MediaItem.fromUri(Uri.fromFile(source));
                EditedMediaItem editedMediaItem = new EditedMediaItem.Builder(mediaItem)
                        .setEffects(effects)
                        .build();

                Transformer transformer = new Transformer.Builder(context)
                        .setVideoMimeType(MimeTypes.VIDEO_H264)
                        .addListener(new Transformer.Listener() {
                            @Override
                            public void onCompleted(
                                    @NonNull Composition composition,
                                    @NonNull ExportResult result) {
                                callback.onDone(output);
                            }

                            @Override
                            public void onError(
                                    @NonNull Composition composition,
                                    @NonNull ExportResult result,
                                    @NonNull ExportException exception) {
                                if (output.exists()) output.delete();

                                if (index + 1 < targets.length) {
                                    startExport(
                                            context, source, filter, plan,
                                            targets, index + 1, callback);
                                } else {
                                    callback.onError(exception);
                                }
                            }
                        })
                        .build();

                transformer.start(editedMediaItem, output.getAbsolutePath());
            } catch (Throwable error) {
                if (output.exists()) output.delete();

                if (index + 1 < targets.length) {
                    startExport(
                            context, source, filter, plan,
                            targets, index + 1, callback);
                } else {
                    callback.onError(error);
                }
            }
        });
    }
    private static float clamp(float value, float low, float high) {
        return Math.max(low, Math.min(high, value));
    }

}