package com.mvmcmd.launcher;

import android.content.ActivityNotFoundException;
import android.content.Intent;
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
    public void openPackage(PluginCall call) {
        String packageName = call.getString("packageName");
        String action = call.getString("action");
        String data = call.getString("data");

        if (packageName == null || packageName.trim().isEmpty()) {
            call.reject("packageName is required");
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

        if (launchIntent == null) {
            JSObject result = new JSObject();
            result.put("launched", false);
            result.put("installed", installed);
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
            JSObject result = new JSObject();
            result.put("launched", false);
            result.put("installed", installed);
            result.put("error", "ACTIVITY_NOT_FOUND");
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("launched", false);
            result.put("installed", installed);
            result.put("error", e.getClass().getSimpleName());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.trim().isEmpty()) {
            call.reject("url is required");
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

        if (!opened && webUrl != null && !webUrl.trim().isEmpty()) {
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
