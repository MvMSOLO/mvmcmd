package com.mvmcmd.launcher;

import android.content.Context;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.media3.common.Effect;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.effect.Presentation;
import androidx.media3.effect.RgbAdjustment;
import androidx.media3.transformer.Composition;
import androidx.media3.transformer.EditedMediaItem;
import androidx.media3.transformer.Effects;
import androidx.media3.transformer.ExportException;
import androidx.media3.transformer.ExportResult;
import androidx.media3.transformer.Transformer;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
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
        int[] targets = {3840, 2560, 1920};
        startExport(context, source, filter, exposure, contrast, saturation, warmth,
                targets, 0, callback);
    }

    private static void startExport(
            Context context,
            File source,
            String filter,
            float exposure,
            float contrast,
            float saturation,
            float warmth,
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

                // Preserve the 4:3 frame and orientation. The short side is the
                // quality tier: 2880 -> 3840x2880 / 2880x3840.
                videoEffects.add(Presentation.createForShortSide(shortSide));

                float gain = (float) Math.pow(2.0, exposure * 0.70);
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
                RgbAdjustment rgb = new RgbAdjustment.Builder()
                        .setRedScale(Math.max(0f, r * sat))
                        .setGreenScale(Math.max(0f, g * sat))
                        .setBlueScale(Math.max(0f, b * sat))
                        .build();
                videoEffects.add(rgb);

                Effects effects = new Effects(
                        Collections.emptyList(),
                        videoEffects
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
                                            context, source, filter, exposure, contrast,
                                            saturation, warmth, targets, index + 1, callback);
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
                            context, source, filter, exposure, contrast,
                            saturation, warmth, targets, index + 1, callback);
                } else {
                    callback.onError(error);
                }
            }
        });
    }
}