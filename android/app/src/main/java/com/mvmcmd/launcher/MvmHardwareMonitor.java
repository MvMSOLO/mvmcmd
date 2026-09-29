package com.mvmcmd.launcher;

import android.app.ActivityManager;
import android.content.Context;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Environment;
import android.os.Debug;
import android.os.HardwarePropertiesManager;
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
    private static long[] corePrevTotal = new long[0];
    private static long[] corePrevIdle = new long[0];

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
        s.coreUsages = readCoreUsages();
        s.processMemoryMb = Debug.getPss() / 1024;

        BatteryManager bm = (BatteryManager) context.getSystemService(Context.BATTERY_SERVICE);
        s.batteryLevel = bm != null ? bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) : -1;
        if (Build.VERSION.SDK_INT >= 21 && bm != null) {
            s.currentUa = bm.getLongProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW);
            s.energyNwh = bm.getLongProperty(BatteryManager.BATTERY_PROPERTY_ENERGY_COUNTER);
            s.chargeCounterUah = bm.getLongProperty(BatteryManager.BATTERY_PROPERTY_CHARGE_COUNTER);
        }

        android.content.Intent battery = context.registerReceiver(null,
                new android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED));
        if (battery != null) {
            int rawTemp = battery.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Integer.MIN_VALUE);
            s.batteryTempC = rawTemp == Integer.MIN_VALUE ? -1 : rawTemp / 10f;
            s.voltageMv = battery.getIntExtra(BatteryManager.EXTRA_VOLTAGE, -1);
            s.batteryStatus = battery.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
            s.batteryPlugged = battery.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0);
            s.batteryHealth = battery.getIntExtra(BatteryManager.EXTRA_HEALTH, -1);
            s.batteryTechnology = battery.getStringExtra(BatteryManager.EXTRA_TECHNOLOGY);
        }
        if (s.currentUa != Long.MIN_VALUE && s.voltageMv > 0) {
            s.batteryPowerMw = Math.abs(s.currentUa) * (double) s.voltageMv / 1000000d;
        }

        List<Float> zones = readThermalZones();
        s.thermalC = zones.isEmpty() ? s.batteryTempC : Collections.max(zones);
        s.thermalZoneCount = zones.size();
        if (Build.VERSION.SDK_INT >= 24) {
            try {
                HardwarePropertiesManager hpm = (HardwarePropertiesManager) context.getSystemService(Context.HARDWARE_PROPERTIES_SERVICE);
                if (hpm != null) {
                    s.cpuTempC = maxValid(hpm.getDeviceTemperatures(HardwarePropertiesManager.DEVICE_TEMPERATURE_CPU, HardwarePropertiesManager.TEMPERATURE_CURRENT));
                    s.gpuTempC = maxValid(hpm.getDeviceTemperatures(HardwarePropertiesManager.DEVICE_TEMPERATURE_GPU, HardwarePropertiesManager.TEMPERATURE_CURRENT));
                    s.skinTempC = maxValid(hpm.getDeviceTemperatures(HardwarePropertiesManager.DEVICE_TEMPERATURE_SKIN, HardwarePropertiesManager.TEMPERATURE_CURRENT));
                    s.fanRpm = maxValid(hpm.getFanSpeeds());
                    if (s.cpuTempC >= 0) s.thermalC = Math.max(s.thermalC, s.cpuTempC);
                    if (s.gpuTempC >= 0) s.thermalC = Math.max(s.thermalC, s.gpuTempC);
                    if (s.skinTempC >= 0) s.thermalC = Math.max(s.thermalC, s.skinTempC);
                }
            } catch (Throwable ignored) {}
        }

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
        if (Build.VERSION.SDK_INT >= 29 && pm != null) {
            try { s.thermalStatus = pm.getCurrentThermalStatus(); } catch (Throwable ignored) {}
        }
        if (Build.VERSION.SDK_INT >= 30 && pm != null) {
            try { s.thermalHeadroom = pm.getThermalHeadroom(10); } catch (Throwable ignored) {}
        }
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

    private static synchronized List<Double> readCoreUsages() {
        List<long[]> samples = new ArrayList<>();
        try (BufferedReader r = new BufferedReader(new FileReader("/proc/stat"))) {
            String line;
            while ((line = r.readLine()) != null) {
                if (!line.matches("^cpu[0-9]+\\s+.*")) continue;
                String[] p = line.trim().split("\\s+");
                if (p.length < 5) continue;
                long user=Long.parseLong(p[1]), nice=Long.parseLong(p[2]), system=Long.parseLong(p[3]), idle=Long.parseLong(p[4]);
                long iowait=p.length>5?Long.parseLong(p[5]):0, irq=p.length>6?Long.parseLong(p[6]):0, softirq=p.length>7?Long.parseLong(p[7]):0, steal=p.length>8?Long.parseLong(p[8]):0;
                samples.add(new long[]{user+nice+system+idle+iowait+irq+softirq+steal, idle+iowait});
            }
        } catch (Throwable ignored) { return Collections.emptyList(); }
        if (corePrevTotal.length != samples.size()) {
            corePrevTotal=new long[samples.size()]; corePrevIdle=new long[samples.size()];
            List<Double> initial=new ArrayList<>();
            for(int i=0;i<samples.size();i++){corePrevTotal[i]=samples.get(i)[0];corePrevIdle[i]=samples.get(i)[1];initial.add(0d);} return initial;
        }
        List<Double> out=new ArrayList<>();
        for(int i=0;i<samples.size();i++){
            long dt=samples.get(i)[0]-corePrevTotal[i], di=samples.get(i)[1]-corePrevIdle[i];
            corePrevTotal[i]=samples.get(i)[0]; corePrevIdle[i]=samples.get(i)[1];
            out.add(dt<=0?0d:Math.max(0,Math.min(100,(dt-di)*100d/dt)));
        }
        return out;
    }

    private static float maxValid(float[] values) {
        if(values==null||values.length==0)return -1;
        float max=-1; for(float v:values) if(v!=HardwarePropertiesManager.UNDEFINED_TEMPERATURE&&v>=-20&&v<150) max=Math.max(max,v);
        return max;
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
        if (ua == Long.MIN_VALUE || ua == 0) return "n/a";
        return String.format(Locale.US, "%.0f mA", Math.abs(ua) / 1000d);
    }

    public static String health(int v) {
        switch(v){
            case BatteryManager.BATTERY_HEALTH_GOOD:return "GOOD"; case BatteryManager.BATTERY_HEALTH_OVERHEAT:return "OVERHEAT"; case BatteryManager.BATTERY_HEALTH_DEAD:return "DEAD"; case BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE:return "OVER_VOLTAGE"; case BatteryManager.BATTERY_HEALTH_UNSPECIFIED_FAILURE:return "FAILURE"; case BatteryManager.BATTERY_HEALTH_COLD:return "COLD"; default:return "UNKNOWN";
        }
    }

    public static String thermalStatus(int v) {
        switch(v){
            case PowerManager.THERMAL_STATUS_NONE:return "NONE"; case PowerManager.THERMAL_STATUS_LIGHT:return "LIGHT"; case PowerManager.THERMAL_STATUS_MODERATE:return "MODERATE"; case PowerManager.THERMAL_STATUS_SEVERE:return "SEVERE"; case PowerManager.THERMAL_STATUS_CRITICAL:return "CRITICAL"; case PowerManager.THERMAL_STATUS_EMERGENCY:return "EMERGENCY"; case PowerManager.THERMAL_STATUS_SHUTDOWN:return "SHUTDOWN"; default:return "UNAVAILABLE";
        }
    }

    public static String report(Context context) {
        Snapshot s=read(context); StringBuilder b=new StringBuilder();
        b.append("MVMCMD HARDWARE REPORT\nDevice: ").append(s.model).append("\nAndroid: ").append(s.android).append("\n");
        b.append("CPU: ").append(String.format(Locale.US,"%.1f",s.cpu)).append("% · cores ").append(s.cores).append("\n");
        b.append("RAM: ").append(bytes(s.ramTotal-s.ramAvail)).append(" / ").append(bytes(s.ramTotal)).append("\nProcess PSS: ").append(s.processMemoryMb).append(" MB\n");
        b.append("Battery: ").append(s.batteryLevel).append("% · ").append(health(s.batteryHealth)).append(" · ").append(current(s.currentUa)).append("\n");
        b.append("Battery temp: ").append(String.format(Locale.US,"%.1f °C",s.batteryTempC)).append("\n");
        b.append("CPU/GPU/SKIN: ").append(String.format(Locale.US,"%.1f / %.1f / %.1f °C",s.cpuTempC,s.gpuTempC,s.skinTempC)).append("\n");
        b.append("Thermal: ").append(thermalStatus(s.thermalStatus)).append(" · headroom ").append(s.thermalHeadroom<0?"n/a":String.format(Locale.US,"%.2f",s.thermalHeadroom)).append("\n");
        b.append("Power: ").append(s.batteryPowerMw<=0?"n/a":String.format(Locale.US,"%.0f mW",s.batteryPowerMw)).append("\n");
        b.append("Storage: ").append(bytes(s.storageTotal-s.storageFree)).append(" / ").append(bytes(s.storageTotal)).append("\n");
        return b.toString();
    }

    public static final class Snapshot {
        public String model = "n/a", android = "n/a", cpuFreq = "n/a";
        public int cores, batteryLevel = -1, voltageMv = -1, batteryStatus = -1, batteryPlugged;
        public int width, height, sensorCount, thermalZoneCount;
        public long ramTotal, ramAvail, storageTotal, storageFree, currentUa=Long.MIN_VALUE, energyNwh=Long.MIN_VALUE, chargeCounterUah=Long.MIN_VALUE, uptimeMs, processMemoryMb;
        public int batteryHealth=-1, thermalStatus=-1;
        public String batteryTechnology="n/a";
        public double cpu=-1, batteryPowerMw=0, thermalHeadroom=-1;
        public float batteryTempC=-1, thermalC=-1, cpuTempC=-1, gpuTempC=-1, skinTempC=-1, fanRpm=-1, refreshRate;
        public boolean powerSave;
        public List<Double> coreUsages=new ArrayList<>();
        public final List<String> sensorNames=new ArrayList<>();
    }
}
