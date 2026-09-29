package com.mvmcmd.launcher;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.view.Choreographer;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.app.ServiceCompat;
import androidx.core.app.NotificationCompat;
import android.content.pm.ServiceInfo;

import java.util.Locale;

public final class MvmHardwareOverlayService extends Service {
    private static final int NOTIFICATION_ID = 4127;
    private WindowManager wm;
    private LinearLayout panel;
    private TextView collapsed;
    private TextView expanded;
    private WindowManager.LayoutParams params;
    private Handler handler;
    private Runnable refreshTask;
    private Runnable collapseTask;
    private int frames;
    private long fpsWindowStart;
    private double fps;
    private float downX, downY;
    private int startX, startY;
    private boolean moved;

    @Override public void onCreate() {
        super.onCreate();
        handler = new Handler(getMainLooper());
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        fpsWindowStart = System.currentTimeMillis();
        startAsForeground();
        buildOverlay();
        startMonitoring();
    }

    private void buildOverlay() {
        panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(8), dp(6), dp(8), dp(6));
        panel.setBackground(round(0xCC0B0D10, dp(12)));
        collapsed = text("F 60  B 100  T --", 10, true);
        expanded = text("", 10, false);
        expanded.setVisibility(View.GONE);
        panel.addView(collapsed);
        panel.addView(expanded);

        params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                Build.VERSION.SDK_INT >= 26
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        android.content.SharedPreferences prefs=getSharedPreferences("mvm_hardware",MODE_PRIVATE); params.x=prefs.getInt("overlay_x",dp(12)); params.y=prefs.getInt("overlay_y",dp(180));

        panel.setOnTouchListener((v, e) -> {
            switch (e.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    downX = e.getRawX(); downY = e.getRawY();
                    startX = params.x; startY = params.y; moved = false;
                    return true;
                case MotionEvent.ACTION_MOVE:
                    int dx = (int) (e.getRawX() - downX);
                    int dy = (int) (e.getRawY() - downY);
                    if (Math.abs(dx) + Math.abs(dy) > dp(8)) moved = true;
                    params.x = startX + dx; params.y = startY + dy;
                    try { wm.updateViewLayout(panel, params); } catch (Exception ignored) {}
                    return true;
                case MotionEvent.ACTION_UP:
                    getSharedPreferences("mvm_hardware",MODE_PRIVATE).edit().putInt("overlay_x",params.x).putInt("overlay_y",params.y).apply();
                    if(!moved)revealForThreeSeconds();
                    return true;
                default: return true;
            }
        });

        try { wm.addView(panel, params); } catch (Exception e) { stopSelf(); }
    }

    private void startMonitoring() {
        refreshTask = new Runnable() {
            @Override public void run() {
                updateUi();
                handler.postDelayed(this, 1000);
            }
        };
        handler.post(refreshTask);
        Choreographer.getInstance().postFrameCallback(frameCallback);
    }

    private final Choreographer.FrameCallback frameCallback = new Choreographer.FrameCallback() {
        @Override public void doFrame(long frameTimeNanos) {
            frames++;
            long now = System.currentTimeMillis();
            if (now - fpsWindowStart >= 1000) {
                fps = frames * 1000d / (now - fpsWindowStart);
                frames = 0; fpsWindowStart = now;
            }
            Choreographer.getInstance().postFrameCallback(this);
        }
    };

    private void updateUi() {
        MvmHardwareMonitor.Snapshot s = MvmHardwareMonitor.read(this);
        int mode = getSharedPreferences("mvm_hardware", MODE_PRIVATE).getInt("overlay_mode", 0);
        String f = fps > 0 ? String.format(Locale.US, "%.0f", fps) : "--";
        String b = s.batteryLevel >= 0 ? s.batteryLevel + "%" : "--";
        String t = s.thermalC > -10 ? String.format(Locale.US, "%.1f°", s.thermalC) : "--";
        if (mode == 1) collapsed.setText("FPS " + f);
        else if (mode == 2) collapsed.setText("BAT " + b);
        else if (mode == 3) collapsed.setText("TEMP " + t);
        else collapsed.setText("FPS " + f + "  ·  BAT " + b + "  ·  TEMP " + t);
        expanded.setText("CPU "+fmt(s.cpu)+"% · RAM "+MvmHardwareMonitor.bytes(s.ramTotal-s.ramAvail)+"/"+MvmHardwareMonitor.bytes(s.ramTotal)+"\nTEMP "+t+" · THERMAL "+MvmHardwareMonitor.thermalStatus(s.thermalStatus)+" · HEAD "+(s.thermalHeadroom<0?"--":String.format(Locale.US,"%.2f",s.thermalHeadroom))+"\nBAT "+b+" · POWER "+(s.batteryPowerMw>0?String.format(Locale.US,"%.0f mW",s.batteryPowerMw):"--")+"\n"+s.model+" · "+s.android);
    }

    private void revealForThreeSeconds() {
        expanded.setVisibility(View.VISIBLE);
        panel.setAlpha(1f);
        if (collapseTask != null) handler.removeCallbacks(collapseTask);
        collapseTask = () -> {
            expanded.setVisibility(View.GONE);
            panel.setAlpha(0.38f);
        };
        handler.postDelayed(collapseTask, 3000);
    }

    @Override public int onStartCommand(Intent intent,int flags,int startId){return START_NOT_STICKY;}

    private void startAsForeground() {
        String channelId = "mvm_hardware";
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(channelId, "MVMCMD Hardware Monitor", NotificationManager.IMPORTANCE_LOW);
            nm.createNotificationChannel(ch);
        }
        Intent open = new Intent(this, MvmHardwareMonitorActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        Notification n = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(com.mvmcmd.launcher.R.drawable.mvmcmd_logo)
                .setContentTitle("MVMCMD Hardware Monitor")
                .setContentText("FPS · battery · temperature overlay is active")
                .setContentIntent(pi)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
        if (Build.VERSION.SDK_INT >= 34) {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, n);
        }
    }

    @Override public void onDestroy() {
        if (handler != null) {
            handler.removeCallbacks(refreshTask);
            handler.removeCallbacks(collapseTask);
        }
        try { Choreographer.getInstance().removeFrameCallback(frameCallback); } catch (Exception ignored) {}
        if (panel != null) try { wm.removeView(panel); } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    private TextView text(String value, int size, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value); t.setTextColor(Color.WHITE); t.setTextSize(size);
        t.setTypeface(android.graphics.Typeface.MONOSPACE, bold ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
        return t;
    }
    private android.graphics.drawable.Drawable round(int color, float radius) {
        android.graphics.drawable.GradientDrawable d = new android.graphics.drawable.GradientDrawable();
        d.setColor(color); d.setCornerRadius(radius); return d;
    }
    private String fmt(double v) { return v < 0 ? "--" : String.format(Locale.US, "%.0f", v); }
    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }
}
