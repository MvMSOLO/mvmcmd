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
    private Button overlayButton;
    private boolean pendingOverlayStart;
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
        if(getIntent().getBooleanExtra("enableOverlay",false)) pendingOverlayStart=true;
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
        overlayButton=button("ENABLE");
        overlayButton.setOnClickListener(v -> toggleOverlay());
        overlayRow.addView(overlayButton,new LinearLayout.LayoutParams(dp(105),dp(44)));
        root.addView(overlayRow);

        LinearLayout modes = new LinearLayout(this);
        modes.setPadding(0, dp(4), 0, dp(8));
        String[] names = {"ALL", "FPS", "BATTERY", "TEMP"};
        int[] modesIds = {OVERLAY_MODE_ALL, OVERLAY_MODE_FPS, OVERLAY_MODE_BATTERY, OVERLAY_MODE_TEMP};
        for (int i = 0; i < names.length; i++) {
            Button b = button(names[i]);
            final int mode = modesIds[i];
            b.setOnClickListener(v -> {
                getSharedPreferences("mvm_hardware", MODE_PRIVATE).edit().putInt("overlay_mode", mode).apply();
                status.setText("Overlay mode: " + names[mode] + " · tap the floating chip to expand for 3s");
            });
            modes.addView(b, new LinearLayout.LayoutParams(0, dp(42), 1));
        }
        root.addView(modes);

        LinearLayout actions=new LinearLayout(this);
        Button refreshButton=button("REFRESH"); refreshButton.setOnClickListener(v->render()); actions.addView(refreshButton,new LinearLayout.LayoutParams(0,dp(42),1));
        Button copyButton=button("COPY REPORT"); copyButton.setOnClickListener(v->copyReport()); actions.addView(copyButton,new LinearLayout.LayoutParams(0,dp(42),1));
        Button shareButton=button("SHARE"); shareButton.setOnClickListener(v->shareReport()); actions.addView(shareButton,new LinearLayout.LayoutParams(0,dp(42),1));
        root.addView(actions);

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
        section("CPU / MEMORY", "CPU load: " + fmt(s.cpu) + "%\nRAM used: " + MvmHardwareMonitor.bytes(s.ramTotal-s.ramAvail) + " / " + MvmHardwareMonitor.bytes(s.ramTotal) + " · free " + MvmHardwareMonitor.bytes(s.ramAvail) + "\nCPU cores: " + s.cores + " · process PSS: " + s.processMemoryMb + " MB");
        section("PER-CORE LOAD",formatCoreLoads(s.coreUsages));
        section("BATTERY", "Level: " + (s.batteryLevel >= 0 ? s.batteryLevel + "%" : "n/a")
                + "\nBattery temp: " + temp(s.batteryTempC)
                + "  · device thermal max: " + temp(s.thermalC)
                + "\nVoltage: " + (s.voltageMv>0?s.voltageMv+" mV":"n/a") + " · current: " + MvmHardwareMonitor.current(s.currentUa)
                + "\nPower: " + (s.batteryPowerMw>0?String.format(Locale.US,"%.0f mW",s.batteryPowerMw):"n/a") + " · health: " + MvmHardwareMonitor.health(s.batteryHealth)
                + "\nCharge counter: " + (s.chargeCounterUah==Long.MIN_VALUE?"n/a":String.format(Locale.US,"%.0f mAh",s.chargeCounterUah/1000d))
                + "\nStatus: " + batteryStatus(s.batteryStatus) + " · power save: " + (s.powerSave?"ON":"OFF"));
        section("THERMAL","Overall max: "+temp(s.thermalC)+"\nCPU: "+temp(s.cpuTempC)+" · GPU: "+temp(s.gpuTempC)+" · skin: "+temp(s.skinTempC)+"\nStatus: "+MvmHardwareMonitor.thermalStatus(s.thermalStatus)+" · headroom: "+(s.thermalHeadroom<0?"n/a":String.format(Locale.US,"%.2f",s.thermalHeadroom))+"\nZones readable: "+s.thermalZoneCount+" · fan: "+(s.fanRpm<0?"n/a":String.format(Locale.US,"%.0f RPM",s.fanRpm)));
        section("STORAGE", "Internal total: " + MvmHardwareMonitor.bytes(s.storageTotal)
                + "\nFree: " + MvmHardwareMonitor.bytes(s.storageFree)
                + "\nUsed: " + MvmHardwareMonitor.bytes(s.storageTotal - s.storageFree));
        section("SENSORS", "Detected sensors: " + s.sensorCount
                + (s.sensorNames.isEmpty() ? "" : "\n" + join(s.sensorNames)));
        section("DISPLAY FPS", "Display refresh target: " + fmt(s.refreshRate) + " Hz"
                + "\nOverlay FPS is a frame-pacing measurement from Android's Choreographer, not a private per-game renderer counter.");
        status.setText("LIVE · refreshed 1s · overlay " + (Settings.canDrawOverlays(this) ? "READY" : "PERMISSION REQUIRED"));
        if(overlayButton!=null) overlayButton.setText(getSharedPreferences("mvm_hardware",MODE_PRIVATE).getBoolean("overlay_enabled",false)?"STOP":"ENABLE");
    }

    private void toggleOverlay() {
        boolean enabled=getSharedPreferences("mvm_hardware",MODE_PRIVATE).getBoolean("overlay_enabled",false);
        if(enabled){stopService(new Intent(this,MvmHardwareOverlayService.class));getSharedPreferences("mvm_hardware",MODE_PRIVATE).edit().putBoolean("overlay_enabled",false).apply();render();Toast.makeText(this,"Floating monitor OFF",Toast.LENGTH_SHORT).show();return;}
        if(!Settings.canDrawOverlays(this)){pendingOverlayStart=true;try{startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getPackageName())));}catch(Exception e){startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION));}return;}
        startOverlay();
    }

    private void startOverlay(){
        Intent service=new Intent(this,MvmHardwareOverlayService.class); if(Build.VERSION.SDK_INT>=26)startForegroundService(service);else startService(service);
        getSharedPreferences("mvm_hardware",MODE_PRIVATE).edit().putBoolean("overlay_enabled",true).apply(); pendingOverlayStart=false; render(); Toast.makeText(this,"Floating monitor ON",Toast.LENGTH_SHORT).show();
    }

    private void copyReport(){
        android.content.ClipboardManager cm=(android.content.ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE); if(cm==null)return;
        cm.setPrimaryClip(android.content.ClipData.newPlainText("MVMCMD hardware report",MvmHardwareMonitor.report(this))); Toast.makeText(this,"Report copied",Toast.LENGTH_SHORT).show();
    }

    private void shareReport(){
        Intent send=new Intent(Intent.ACTION_SEND);send.setType("text/plain");send.putExtra(Intent.EXTRA_SUBJECT,"MVMCMD hardware report");send.putExtra(Intent.EXTRA_TEXT,MvmHardwareMonitor.report(this));startActivity(Intent.createChooser(send,"Share hardware report"));
    }

    private String formatCoreLoads(java.util.List<Double> values){
        if(values==null||values.isEmpty())return "n/a"; StringBuilder b=new StringBuilder(); int n=Math.min(values.size(),16);
        for(int i=0;i<n;i++){if(i>0)b.append(" · ");b.append("C").append(i).append(" ").append(String.format(Locale.US,"%.0f%%",values.get(i)));} return b.toString();
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
        if(pendingOverlayStart && Settings.canDrawOverlays(this)) startOverlay();
        if(handler!=null){handler.removeCallbacks(refresh);handler.post(refresh);}
    }
    @Override protected void onPause() {
        if (handler != null) handler.removeCallbacks(refresh);
        super.onPause();
    }
}
