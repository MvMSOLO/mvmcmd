package com.mvmcmd.launcher;

import android.app.ActivityManager;
import android.content.Context;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;
import android.os.SystemClock;
import android.os.PowerManager;
import android.hardware.Sensor;
import android.hardware.SensorManager;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

public final class MvmHardwareMonitor {
    private static long prevTotal = -1;
    private static long prevIdle = -1;

    private MvmHardwareMonitor() {}

    public static Snapshot read(Context context) {
        Snapshot s = new Snapshot();
        ActivityManager am = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo mem = new ActivityManager.MemoryInfo();
        if (am != null) am.getMemoryInfo(mem);
        s.ramTotal = mem.totalMem;
        s.ramAvail = mem.availMem;
        s.cpu = readCpuUsage();
        s.cores = Runtime.getRuntime().availableProcessors();

        BatteryManager bm = (BatteryManager) context.getSystemService(Context.BATTERY_SERVICE);
        s.batteryLevel = bm != null ? bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) : -1;
        if (Build.VERSION.SDK_INT >= 21 && bm != null) {
            s.currentUa = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW);
            s.energyNwh = bm.getLongProperty(BatteryManager.BATTERY_PROPERTY_ENERGY_COUNTER);
        }

        android.content.Intent battery = context.registerReceiver(null,
                new android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED));
        if (battery != null) {
            int rawTemp = battery.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Integer.MIN_VALUE);
            s.batteryTempC = rawTemp == Integer.MIN_VALUE ? -1 : rawTemp / 10f;
            s.voltageMv = battery.getIntExtra(BatteryManager.EXTRA_VOLTAGE, -1);
            s.batteryStatus = battery.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
            s.batteryPlugged = battery.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0);
        }

        List<Float> zones = readThermalZones();
        s.thermalC = zones.isEmpty() ? s.batteryTempC : Collections.max(zones);
        s.thermalZoneCount = zones.size();

        StatFs stat = new StatFs(Environment.getDataDirectory().getPath());
        s.storageTotal = stat.getTotalBytes();
        s.storageFree = stat.getAvailableBytes();

        android.view.Display display = ((android.view.WindowManager) context.getSystemService(Context.WINDOW_SERVICE)).getDefaultDisplay();
        android.util.DisplayMetrics dm = context.getResources().getDisplayMetrics();
        s.width = dm.widthPixels;
        s.height = dm.heightPixels;
        s.refreshRate = display != null ? display.getRefreshRate() : 0f;

        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        s.powerSave = pm != null && pm.isPowerSaveMode();
        s.uptimeMs = SystemClock.uptimeMillis();

        SensorManager sm = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        if (sm != null) {
            List<Sensor> sensors = sm.getSensorList(Sensor.TYPE_ALL);
            s.sensorCount = sensors.size();
            for (Sensor sensor : sensors) {
                if (s.sensorNames.size() >= 10) break;
                s.sensorNames.add(sensor.getName());
            }
        }
        s.model = Build.MANUFACTURER + " " + Build.MODEL;
        s.android = Build.VERSION.RELEASE + " / API " + Build.VERSION.SDK_INT;
        s.cpuFreq = readCpuFreq();
        return s;
    }

    private static synchronized double readCpuUsage() {
        try (BufferedReader r = new BufferedReader(new FileReader("/proc/stat"))) {
            String line;
            while ((line = r.readLine()) != null) {
                if (!line.startsWith("cpu ")) continue;
                String[] p = line.trim().split("\\s+");
                long user = Long.parseLong(p[1]);
                long nice = Long.parseLong(p[2]);
                long system = Long.parseLong(p[3]);
                long idle = Long.parseLong(p[4]);
                long iowait = p.length > 5 ? Long.parseLong(p[5]) : 0;
                long irq = p.length > 6 ? Long.parseLong(p[6]) : 0;
                long softirq = p.length > 7 ? Long.parseLong(p[7]) : 0;
                long steal = p.length > 8 ? Long.parseLong(p[8]) : 0;
                long idleAll = idle + iowait;
                long total = user + nice + system + idle + iowait + irq + softirq + steal;
                if (prevTotal < 0) {
                    prevTotal = total;
                    prevIdle = idleAll;
                    return 0;
                }
                long dt = total - prevTotal;
                long di = idleAll - prevIdle;
                prevTotal = total;
                prevIdle = idleAll;
                return dt <= 0 ? 0 : Math.max(0, Math.min(100, (dt - di) * 100d / dt));
            }
        } catch (Throwable ignored) {}
        return -1;
    }

    private static String readCpuFreq() {
        String[] paths = {"/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq",
                "/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_cur_freq"};
        for (String path : paths) {
            try (BufferedReader r = new BufferedReader(new FileReader(path))) {
                long khz = Long.parseLong(r.readLine().trim());
                if (khz > 0) return String.format(Locale.US, "%.0f MHz", khz / 1000d);
            } catch (Throwable ignored) {}
        }
        return "n/a";
    }

    private static List<Float> readThermalZones() {
        List<Float> values = new ArrayList<>();
        File root = new File("/sys/class/thermal");
        File[] zones = root.listFiles((dir, name) -> name.startsWith("thermal_zone"));
        if (zones == null) return values;
        for (File zone : zones) {
            File temp = new File(zone, "temp");
            try (BufferedReader r = new BufferedReader(new FileReader(temp))) {
                float raw = Float.parseFloat(r.readLine().trim());
                float c = Math.abs(raw) > 1000 ? raw / 1000f : raw;
                if (c > -20 && c < 120) values.add(c);
            } catch (Throwable ignored) {}
        }
        return values;
    }

    public static String bytes(long bytes) {
        if (bytes < 0) return "n/a";
        if (bytes >= 1024L * 1024L * 1024L) return String.format(Locale.US, "%.1f GB", bytes / 1073741824d);
        return String.format(Locale.US, "%.0f MB", bytes / 1048576d);
    }

    public static String current(long ua) {
        if (ua == Integer.MIN_VALUE || ua == 0) return "n/a";
        return String.format(Locale.US, "%.0f mA", Math.abs(ua) / 1000d);
    }

    public static final class Snapshot {
        public String model = "n/a", android = "n/a", cpuFreq = "n/a";
        public int cores, batteryLevel = -1, voltageMv = -1, batteryStatus = -1, batteryPlugged;
        public int width, height, sensorCount, thermalZoneCount;
        public long ramTotal, ramAvail, storageTotal, storageFree, currentUa = Integer.MIN_VALUE, energyNwh = Long.MIN_VALUE, uptimeMs;
        public double cpu = -1;
        public float batteryTempC = -1, thermalC = -1, refreshRate;
        public boolean powerSave;
        public final List<String> sensorNames = new ArrayList<>();
    }
}
