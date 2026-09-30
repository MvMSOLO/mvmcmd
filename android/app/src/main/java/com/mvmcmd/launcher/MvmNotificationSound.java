package com.mvmcmd.launcher;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;

public final class MvmNotificationSound {
    private MvmNotificationSound() {}

    public static void play() {
        final int rate = 16000;
        final int count = (int)(rate * 0.42f);
        final short[] pcm = new short[count];
        for (int i = 0; i < count; i++) {
            double t = i / (double) rate;
            double env = Math.exp(-7.5 * t);
            double f = 520.0 + 720.0 * Math.min(1.0, t / 0.42);
            double sample = 0.30 * Math.sin(2 * Math.PI * f * t) * env;
            sample += 0.13 * Math.sin(2 * Math.PI * 1040 * t) * Math.exp(-12 * t);
            sample += 0.08 * Math.sin(2 * Math.PI * 1560 * t) * Math.exp(-16 * t);
            sample += 0.16 * Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-70 * t);
            pcm[i] = (short)Math.max(-32767, Math.min(32767, sample * 32767));
        }
        new Thread(() -> {
            AudioTrack track = null;
            try {
                AudioAttributes attrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                AudioFormat fmt = new AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(rate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build();
                track = new AudioTrack.Builder()
                        .setAudioAttributes(attrs)
                        .setAudioFormat(fmt)
                        .setTransferMode(AudioTrack.MODE_STATIC)
                        .setBufferSizeInBytes(pcm.length * 2)
                        .build();
                track.write(pcm, 0, pcm.length);
                track.play();
                Thread.sleep(460);
            } catch (Exception ignored) {
            } finally {
                if (track != null) {
                    try { track.stop(); } catch (Exception ignored) {}
                    track.release();
                }
            }
        }, "mvm-notify-sound").start();
    }
}
