package com.mvmcmd.launcher;

import android.app.ActivityManager;
import android.bluetooth.BluetoothAdapter;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ConfigurationInfo;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Environment;
import android.os.PowerManager;
import android.os.StatFs;
import android.view.Display;
import android.view.WindowManager;

import androidx.core.content.ContextCompat;

import android.Manifest;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.FileReader;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(name = "MvmDevice")
public class MvmDevicePlugin extends Plugin {
    @PluginMethod
    public void getDeviceSnapshot(PluginCall call) {
        try {
            call.resolve(snapshot());
        } catch (SecurityException e) {
            call.reject("Android restricted a device capability", e);
        } catch (Exception e) {
            call.reject("Unable to read device capabilities", e);
        }
    }

    private JSObject snapshot() {
        Context c = getContext();
        JSObject out = new JSObject();
        out.put("schemaVersion", 1);
        out.put("timestamp", System.currentTimeMillis());

        JSObject device = new JSObject();
        device.put("manufacturer", Build.MANUFACTURER);
        device.put("model", Build.MODEL);
        device.put("device", Build.DEVICE);
        device.put("hardware", Build.HARDWARE);
        device.put("sdk", Build.VERSION.SDK_INT);
        device.put("release", Build.VERSION.RELEASE);
        device.put("abis", new JSArray(Build.SUPPORTED_ABIS));
        out.put("device", device);

        JSObject cpu = new JSObject();
        cpu.put("cores", Runtime.getRuntime().availableProcessors());
        cpu.put("hardware", Build.HARDWARE);
        cpu.put("architecture", Build.SUPPORTED_ABIS.length > 0 ? Build.SUPPORTED_ABIS[0] : "unknown");
        Double load = readCpuLoad();
        if (load != null) cpu.put("loadPercent", load);
        out.put("cpu", cpu);

        ActivityManager am = (ActivityManager) c.getSystemService(Context.ACTIVITY_SERVICE);
        JSObject memory = new JSObject();
        if (am != null) {
            ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
            am.getMemoryInfo(mi);
            memory.put("totalBytes", mi.totalMem);
            memory.put("availableBytes", mi.availMem);
            memory.put("usedBytes", Math.max(0L, mi.totalMem - mi.availMem));
            memory.put("lowMemory", mi.lowMemory);
        }
        out.put("memory", memory);

        StatFs fs = new StatFs(Environment.getDataDirectory().getPath());
        JSObject storage = new JSObject();
        long total = fs.getTotalBytes(), free = fs.getAvailableBytes();
        storage.put("totalBytes", total);
        storage.put("availableBytes", free);
        storage.put("usedBytes", Math.max(0L, total - free));
        out.put("storage", storage);

        Intent batteryIntent = c.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        JSObject battery = new JSObject();
        if (batteryIntent != null) {
            int level = batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            int status = batteryIntent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
            int plugged = batteryIntent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0);
            if (level >= 0 && scale > 0) battery.put("percent", Math.round(level * 100f / scale));
            battery.put("charging", status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL);
            battery.put("plugged", plugged);
            int temp = batteryIntent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Integer.MIN_VALUE);
            if (temp != Integer.MIN_VALUE) battery.put("temperatureC", temp / 10.0);
            int health = batteryIntent.getIntExtra(BatteryManager.EXTRA_HEALTH, -1);
            battery.put("health", health);
        }
        out.put("battery", battery);

        PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
        JSObject thermal = new JSObject();
        if (pm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            thermal.put("status", pm.getCurrentThermalStatus());
            thermal.put("statusName", thermalStatusName(pm.getCurrentThermalStatus()));
        } else {
            thermal.put("status", -1);
            thermal.put("statusName", "unsupported");
        }
        out.put("thermal", thermal);

        WindowManager wm = (WindowManager) c.getSystemService(Context.WINDOW_SERVICE);
        JSObject display = new JSObject();
        if (wm != null) {
            Display d = wm.getDefaultDisplay();
            android.util.DisplayMetrics dm = new android.util.DisplayMetrics();
            d.getRealMetrics(dm);
            display.put("widthPx", dm.widthPixels);
            display.put("heightPx", dm.heightPixels);
            display.put("density", dm.density);
            display.put("refreshRateHz", d.getRefreshRate());
        }
        ConfigurationInfo cfg = am != null ? am.getDeviceConfigurationInfo() : null;
        if (cfg != null) display.put("glEsVersion", cfg.getGlEsVersion());
        out.put("display", display);

        ConnectivityManager cm = (ConnectivityManager) c.getSystemService(Context.CONNECTIVITY_SERVICE);
        JSObject network = new JSObject();
        if (cm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.net.Network n = cm.getActiveNetwork();
            NetworkCapabilities nc = n != null ? cm.getNetworkCapabilities(n) : null;
            network.put("connected", nc != null);
            if (nc != null) {
                network.put("wifi", nc.hasTransport(NetworkCapabilities.TRANSPORT_WIFI));
                network.put("cellular", nc.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR));
                network.put("ethernet", nc.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
                network.put("vpn", nc.hasTransport(NetworkCapabilities.TRANSPORT_VPN));
                network.put("metered", !nc.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED));
            }
        } else {
            network.put("connected", false);
        }
        out.put("network", network);

        JSObject bluetooth = new JSObject();
        if (!c.getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH)) {
            bluetooth.put("available", false);
            bluetooth.put("state", "unavailable");
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                ContextCompat.checkSelfPermission(c, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            bluetooth.put("available", true);
            bluetooth.put("state", "permission_required");
        } else {
            BluetoothAdapter ba = BluetoothAdapter.getDefaultAdapter();
            bluetooth.put("available", ba != null);
            bluetooth.put("state", ba == null ? "unavailable" : (ba.isEnabled() ? "on" : "off"));
        }
        out.put("bluetooth", bluetooth);

        AudioManager audio = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        JSObject audioOut = new JSObject();
        if (audio != null) {
            audioOut.put("mode", audio.getMode());
            audioOut.put("musicVolume", audio.getStreamVolume(AudioManager.STREAM_MUSIC));
            audioOut.put("musicMaxVolume", audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC));
            audioOut.put("ringerMode", audio.getRingerMode());
        }
        out.put("audio", audioOut);

        SensorManager sm = (SensorManager) c.getSystemService(Context.SENSOR_SERVICE);
        JSArray sensors = new JSArray();
        if (sm != null) {
            List<Sensor> list = sm.getSensorList(Sensor.TYPE_ALL);
            for (Sensor s : list) {
                JSObject item = new JSObject();
                item.put("type", s.getType());
                item.put("name", s.getName());
                item.put("vendor", s.getVendor());
                item.put("version", s.getVersion());
                item.put("powerMah", s.getPower());
                sensors.put(item);
            }
        }
        out.put("sensors", sensors);
        return out;
    }

    private Double readCpuLoad() {
        try {
            long[] a = readCpuStat();
            Thread.sleep(25);
            long[] b = readCpuStat();
            long idle = b[3] - a[3];
            long totalA = sum(a), totalB = sum(b);
            long total = totalB - totalA;
            if (total <= 0) return null;
            return Math.round((1.0 - (idle / (double) total)) * 1000.0) / 10.0;
        } catch (Exception ignored) {
            return null;
        }
    }

    private long[] readCpuStat() throws Exception {
        BufferedReader r = new BufferedReader(new FileReader("/proc/stat"));
        String line = r.readLine();
        r.close();
        if (line == null || !line.startsWith("cpu ")) throw new Exception("cpu stat unavailable");
        String[] p = line.trim().split("\\s+");
        long[] values = new long[Math.min(8, p.length - 1)];
        for (int i = 0; i < values.length; i++) values[i] = Long.parseLong(p[i + 1]);
        return values;
    }

    private long sum(long[] a) {
        long total = 0;
        for (long v : a) total += v;
        return total;
    }

    private String thermalStatusName(int status) {
        switch (status) {
            case PowerManager.THERMAL_STATUS_NONE: return "none";
            case PowerManager.THERMAL_STATUS_LIGHT: return "light";
            case PowerManager.THERMAL_STATUS_MODERATE: return "moderate";
            case PowerManager.THERMAL_STATUS_SEVERE: return "severe";
            case PowerManager.THERMAL_STATUS_CRITICAL: return "critical";
            case PowerManager.THERMAL_STATUS_EMERGENCY: return "emergency";
            case PowerManager.THERMAL_STATUS_SHUTDOWN: return "shutdown";
            default: return "unknown";
        }
    }
}
