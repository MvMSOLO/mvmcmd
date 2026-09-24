package com.mvmcmd.launcher;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MvmLauncher")
public class MvmLauncherPlugin extends Plugin {

    @PluginMethod
    public void openCamera(PluginCall call) {
        try {
            Intent intent = new Intent(getActivity(), MvmCameraActivity.class);
            getActivity().startActivity(intent);
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Unable to open camera: " + e.getMessage(), e);
        }
    }


    @PluginMethod
    public void inspectPackage(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null || !isValidPackageName(packageName)) {
            call.reject("Invalid Android package name");
            return;
        }

        PackageManager pm = getContext().getPackageManager();
        try {
            ApplicationInfo info = pm.getApplicationInfo(packageName, 0);
            PackageInfo packageInfo = pm.getPackageInfo(packageName, 0);
            Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
            JSObject result = new JSObject();
            result.put("found", true);
            result.put("packageName", packageName);
            result.put("label", String.valueOf(pm.getApplicationLabel(info)));
            result.put("enabled", info.enabled);
            result.put("launcherAvailable", launchIntent != null);
            result.put("versionName", packageInfo.versionName == null ? "" : packageInfo.versionName);
            if (android.os.Build.VERSION.SDK_INT >= 28) {
                result.put("versionCode", packageInfo.getLongVersionCode());
            } else {
                result.put("versionCode", packageInfo.versionCode);
            }
            call.resolve(result);
        } catch (PackageManager.NameNotFoundException e) {
            JSObject result = new JSObject();
            result.put("found", false);
            result.put("packageName", packageName);
            result.put("error", "NOT_INSTALLED");
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Unable to inspect package: " + e.getMessage(), e);
        }
    }

    private static boolean isValidPackageName(String packageName) {
        return packageName.matches("^[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z0-9_]+)+$");
    }

    @PluginMethod
    public void openPackage(PluginCall call) {
        String packageName = call.getString("packageName");
        String action = call.getString("action");
        String data = call.getString("data");
        String fallbackUrl = call.getString("fallbackUrl");

        if (packageName == null || !isValidPackageName(packageName)) {
            call.reject("Invalid Android package name");
            return;
        }

        PackageManager pm = getContext().getPackageManager();
        Intent launchIntent = null;

        try {
            if (action != null && !action.trim().isEmpty()) {
                launchIntent = new Intent(action);
                launchIntent.setPackage(packageName);
                if (data != null && !data.trim().isEmpty()) {
                    launchIntent.setData(Uri.parse(data));
                }
                if (Intent.ACTION_MAIN.equals(action)) {
                    launchIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                }
            } else {
                launchIntent = pm.getLaunchIntentForPackage(packageName);
                if (launchIntent == null) {
                    launchIntent = pm.getLeanbackLaunchIntentForPackage(packageName);
                }
            }
        } catch (Exception ignored) {
            launchIntent = null;
        }

        boolean installed;
        try {
            pm.getApplicationInfo(packageName, 0);
            installed = true;
        } catch (PackageManager.NameNotFoundException e) {
            installed = false;
        }

        if (launchIntent == null && installed) {
            // A catalog-specific intent can be too narrow for some apps.
            // Retry the normal launcher intent before falling back to the store/web.
            try {
                launchIntent = pm.getLaunchIntentForPackage(packageName);
                if (launchIntent == null) {
                    launchIntent = pm.getLeanbackLaunchIntentForPackage(packageName);
                }
            } catch (Exception ignored) {
                launchIntent = null;
            }
        }

        if (launchIntent == null) {
            boolean fallbackOpened = openPackageFallback(packageName, fallbackUrl);
            JSObject result = new JSObject();
            result.put("launched", false);
            result.put("installed", installed);
            result.put("fallbackOpened", fallbackOpened);
            result.put("error", installed ? "NO_LAUNCH_ACTIVITY" : "NOT_INSTALLED");
            call.resolve(result);
            return;
        }

        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getActivity().startActivity(launchIntent);
            JSObject result = new JSObject();
            result.put("launched", true);
            result.put("installed", true);
            call.resolve(result);
        } catch (ActivityNotFoundException e) {
            boolean fallbackOpened = openPackageFallback(packageName, fallbackUrl);
            JSObject result = new JSObject();
            result.put("launched", false);
            result.put("installed", installed);
            result.put("fallbackOpened", fallbackOpened);
            result.put("error", "ACTIVITY_NOT_FOUND");
            call.resolve(result);
        } catch (Exception e) {
            boolean fallbackOpened = openPackageFallback(packageName, fallbackUrl);
            JSObject result = new JSObject();
            result.put("launched", false);
            result.put("installed", installed);
            result.put("fallbackOpened", fallbackOpened);
            result.put("error", e.getClass().getSimpleName());
            call.resolve(result);
        }
    }

    private boolean openPackageFallback(String packageName, String fallbackUrl) {
        boolean opened = false;
        try {
            Intent market = new Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("market://details?id=" + Uri.encode(packageName)));
            market.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(market);
            opened = true;
        } catch (Exception ignored) {
            // Google Play may be unavailable.
        }

        if (!opened && fallbackUrl != null && !fallbackUrl.trim().isEmpty() && isSafeExternalUrl(fallbackUrl)) {
            try {
                Intent web = new Intent(Intent.ACTION_VIEW, Uri.parse(fallbackUrl));
                web.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(web);
                opened = true;
            } catch (Exception ignored) {
                // Leave the failure explicit in the returned result.
            }
        }
        return opened;
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.trim().isEmpty() || !isSafeExternalUrl(url)) {
            call.reject("Unsupported or unsafe URL");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);

            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("opened", false);
            call.resolve(result);
        }
    }

    private static boolean isSafeExternalUrl(String url) {
        Uri uri = Uri.parse(url);
        String scheme = uri.getScheme();
        return "https".equalsIgnoreCase(scheme)
                || "http".equalsIgnoreCase(scheme)
                || "tel".equalsIgnoreCase(scheme)
                || "sms".equalsIgnoreCase(scheme)
                || "mailto".equalsIgnoreCase(scheme);
    }

    @PluginMethod
    public void openStore(PluginCall call) {
        String packageName = call.getString("packageName");
        String webUrl = call.getString("webUrl");

        if (packageName == null || packageName.trim().isEmpty()) {
            call.reject("packageName is required");
            return;
        }

        boolean opened = false;

        try {
            Intent market = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + Uri.encode(packageName)));
            market.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(market);
            opened = true;
        } catch (Exception ignored) {
            // Google Play may be unavailable. Fall back to the normal HTTPS page.
        }

        if (!opened && webUrl != null && webUrl.trim().isEmpty() == false && isSafeExternalUrl(webUrl)) {
            try {
                Intent web = new Intent(Intent.ACTION_VIEW, Uri.parse(webUrl));
                web.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(web);
                opened = true;
            } catch (Exception ignored) {
                // Report failure to JavaScript.
            }
        }

        JSObject result = new JSObject();
        result.put("opened", opened);
        call.resolve(result);
    }
}
