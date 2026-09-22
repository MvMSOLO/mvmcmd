package com.mvmcmd.launcher;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.effect.Effects;
import androidx.media3.effect.Presentation;
import androidx.media3.effect.RgbAdjustment;
import androidx.media3.transformer.Composition;
import androidx.media3.transformer.EditedMediaItem;
import androidx.media3.transformer.ExportException;
import androidx.media3.transformer.ExportResult;
import androidx.media3.transformer.Transformer;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class VideoPostProcessor {

    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

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

        File output = new File(source.getParentFile(),
                "mvm_video_processed_" + System.currentTimeMillis() + ".mp4");

        EXECUTOR.execute(() -> {
            try {
                List<androidx.media3.common.Effect> videoEffects = new ArrayList<>();
                videoEffects.add(
                        Presentation.createForWidthAndHeight(
                                3840, 2880, Presentation.LAYOUT_SCALE_TO_FIT));

                RgbAdjustment.Builder rgb = new RgbAdjustment.Builder();
                float gain = (float)Math.pow(2.0, exposure * 0.70);
                float r = gain * (1f + warmth * 0.12f);
                float g = gain * (1f + contrast * 0.04f);
                float b = gain * (1f - warmth * 0.12f);

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

                float sat = Math.max(0.85f, 1f + saturation * 0.35f);
                rgb.setRedScale(r * sat)
                        .setGreenScale(g * sat)
                        .setBlueScale(b * sat)
                        .setAlphaScale(1f);
                videoEffects.add(rgb.build());

                Effects effects = new Effects(
                        Collections.emptyList(),
                        videoEffects);

                MediaItem mediaItem = MediaItem.fromUri(android.net.Uri.fromFile(source));
                EditedMediaItem edited = new EditedMediaItem.Builder(mediaItem)
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
                                callback.onError(exception);
                            }
                        })
                        .build();

                transformer.start(edited, output.getAbsolutePath());
            } catch (Throwable error) {
                if (output.exists()) output.delete();
                callback.onError(error);
            }
        });
    }

}
