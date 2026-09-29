package com.mvmcmd.launcher;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.Locale;

public final class MvmHardwareMonitorActivity extends Activity {
    private static final int OVERLAY_MODE_ALL = 0;
    private static final int OVERLAY_MODE_FPS = 1;
    private static final int OVERLAY_MODE_BATTERY = 2;
    private static final int OVERLAY_MODE_TEMP = 3;

    private LinearLayout content;
    private TextView status;
    private android.os.Handler handler;
    private final Runnable refresh = new Runnable() {
        @Override public void run() {
            render();
            handler.postDelayed(this, 1000);
        }
    };

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        handler = new android.os.Handler(getMainLooper());
        buildUi();
        render();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(8, 9, 11));
        root.setPadding(dp(16), dp(12), dp(16), dp(12));

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = text("TEMPERATURE  /  HARDWARE", 18, true);
        header.addView(title, new LinearLayout.LayoutParams(0, dp(48), 1));
        Button close = button("×");
        close.setOnClickListener(v -> finish());
        header.addView(close, new LinearLayout.LayoutParams(dp(48), dp(48)));
        root.addView(header);

        status = text("", 11, false);
        root.addView(status, new LinearLayout.LayoutParams(-1, dp(30)));

        LinearLayout overlayRow = new LinearLayout(this);
        overlayRow.setGravity(Gravity.CENTER_VERTICAL);
        TextView label = text("FLOATING OVERLAY", 11, true);
        overlayRow.addView(label, new LinearLayout.LayoutParams(0, dp(48), 1));
        Button overlay = button("ENABLE");
        overlay.setOnClickListener(v -> toggleOverlay());
        overlayRow.addView(overlay, new LinearLayout.LayoutParams(dp(105), dp(44)));
        root.addView(overlayRow);

        LinearLayout modes = new LinearLayout(this);
        modes.setPadding(0, dp(4), 0, dp(8));
        String[] names = {"ALL", "FPS", "BATTERY", "TEMP"};
        int[] modesIds = {OVERLAY_MODE_ALL, OVERLAY_MODE_FPS, OVERLAY_MODE_BATTERY, OVERLAY_MODE_TEMP};
        for (int i = 0; i < names.length; i++) {
            Button b = button(names[i]);
            final int mode = modesIds[i];
            b.setOnClickListener(v -> {
                getPreferences(MODE_PRIVATE).edit().putInt("overlay_mode", mode).apply();
                status.setText("Overlay mode: " + names[mode] + " · tap the floating chip to expand for 3s");
            });
            modes.addView(b, new LinearLayout.LayoutParams(0, dp(42), 1));
        }
        root.addView(modes);

        ScrollView scroll = new ScrollView(this);
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(content);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
    }

    private void render() {
        MvmHardwareMonitor.Snapshot s = MvmHardwareMonitor.read(this);
        content.removeAllViews();
        section("DEVICE", "Model: " + s.model + "\nAndroid: " + s.android
                + "\nDisplay: " + s.width + " × " + s.height + " @ " + fmt(s.refreshRate) + " Hz"
                + "\nCores: " + s.cores + "  ·  CPU freq: " + s.cpuFreq
                + "\nUptime: " + formatUptime(s.uptimeMs));
        section("CPU / MEMORY", "CPU load: " + fmt(s.cpu) + "%"
                + "\nRAM used: " + MvmHardwareMonitor.bytes(s.ramTotal - s.ramAvail)
                + " / " + MvmHardwareMonitor.bytes(s.ramTotal)
                + "  · free " + MvmHardwareMonitor.bytes(s.ramAvail)
                + "\nCPU cores: " + s.cores);
        section("BATTERY", "Level: " + (s.batteryLevel >= 0 ? s.batteryLevel + "%" : "n/a")
                + "\nBattery temp: " + temp(s.batteryTempC)
                + "  · device thermal max: " + temp(s.thermalC)
                + "\nVoltage: " + (s.voltageMv > 0 ? s.voltageMv + " mV" : "n/a")
                + "  · current: " + MvmHardwareMonitor.current(s.currentUa)
                + "\nStatus: " + batteryStatus(s.batteryStatus) + "  · power save: " + (s.powerSave ? "ON" : "OFF"));
        section("THERMAL", "Thermal zones readable: " + s.thermalZoneCount
                + "\nReported device temperature: " + temp(s.thermalC)
                + "\nBattery sensor temperature: " + temp(s.batteryTempC)
                + "\nNote: Android does not expose one universal CPU-temperature API; MVMCMD uses readable thermal zones and battery temperature.");
        section("STORAGE", "Internal total: " + MvmHardwareMonitor.bytes(s.storageTotal)
                + "\nFree: " + MvmHardwareMonitor.bytes(s.storageFree)
                + "\nUsed: " + MvmHardwareMonitor.bytes(s.storageTotal - s.storageFree));
        section("SENSORS", "Detected sensors: " + s.sensorCount
                + (s.sensorNames.isEmpty() ? "" : "\n" + join(s.sensorNames)));
        section("DISPLAY FPS", "Display refresh target: " + fmt(s.refreshRate) + " Hz"
                + "\nOverlay FPS is a frame-pacing measurement from Android's Choreographer, not a private per-game renderer counter.");
        status.setText("LIVE · refreshed every 1s · overlay " + (Settings.canDrawOverlays(this) ? "READY" : "PERMISSION REQUIRED"));
    }

    private void toggleOverlay() {
        if (!Settings.canDrawOverlays(this)) {
            try {
                Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getPackageName()));
                startActivity(i);
            } catch (Exception e) {
                startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION));
            }
            return;
        }
        Intent service = new Intent(this, MvmHardwareOverlayService.class);
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(service); else startService(service);
        Toast.makeText(this, "Floating monitor ON", Toast.LENGTH_SHORT).show();
    }

    private void section(String title, String body) {
        TextView t = text(title + "\n" + body, 12, false);
        t.setTextColor(Color.WHITE);
        t.setPadding(dp(14), dp(12), dp(14), dp(12));
        t.setBackground(round(0xFF111317, dp(12)));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.setMargins(0, 0, 0, dp(8));
        content.addView(t, lp);
    }

    private TextView text(String value, int size, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextColor(Color.WHITE);
        t.setTextSize(size);
        t.setTypeface(Typeface.MONOSPACE, bold ? Typeface.BOLD : Typeface.NORMAL);
        return t;
    }

    private Button button(String label) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(10);
        b.setTextColor(Color.WHITE);
        b.setAllCaps(false);
        return b;
    }

    private android.graphics.drawable.Drawable round(int color, float radius) {
        android.graphics.drawable.GradientDrawable d = new android.graphics.drawable.GradientDrawable();
        d.setColor(color); d.setCornerRadius(radius); return d;
    }

    private String temp(float v) { return v < -10 ? "n/a" : String.format(Locale.US, "%.1f °C", v); }
    private String fmt(double v) { return v < 0 ? "n/a" : String.format(Locale.US, "%.1f", v); }
    private String batteryStatus(int v) {
        if (v == android.os.BatteryManager.BATTERY_STATUS_CHARGING) return "CHARGING";
        if (v == android.os.BatteryManager.BATTERY_STATUS_FULL) return "FULL";
        if (v == android.os.BatteryManager.BATTERY_STATUS_DISCHARGING) return "DISCHARGING";
        return "UNKNOWN";
    }
    private String join(java.util.List<String> values) {
        StringBuilder b = new StringBuilder();
        for (String v : values) b.append("• ").append(v).append("\n");
        return b.toString().trim();
    }
    private String formatUptime(long ms) {
        long sec = ms / 1000, min = sec / 60, h = min / 60;
        return String.format(Locale.US, "%02d:%02d:%02d", h, min % 60, sec % 60);
    }
    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    @Override protected void onResume() {
        super.onResume();
        if (handler != null) { handler.removeCallbacks(refresh); handler.post(refresh); }
    }
    @Override protected void onPause() {
        if (handler != null) handler.removeCallbacks(refresh);
        super.onPause();
    }
}
