package com.mvmcmd.launcher;

import android.app.AppOpsManager;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.provider.ContactsContract;
import android.service.notification.NotificationListenerService;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(
    name = "MvmLauncher",
    permissions = {
        @Permission(alias = "camera", strings = { "android.permission.CAMERA" }),
        @Permission(alias = "microphone", strings = { "android.permission.RECORD_AUDIO" }),
        @Permission(alias = "contacts", strings = { "android.permission.READ_CONTACTS" }),
        @Permission(alias = "notifications", strings = { "android.permission.POST_NOTIFICATIONS" })
    }
)
public class MvmLauncherPlugin extends Plugin {
    private static final String PREFS = "mvmcmd_capabilities";
    private static final String[] IDS = {
        "camera",
        "microphone",
        "notifications",
        "notification_listener",
        "contacts",
        "overlay",
        "usage_access"
    };

    @PluginMethod
    public void checkCapabilities(PluginCall call) {
        String requested = call.getString("capabilityId");
        JSArray result = new JSArray();
        if (requested != null && !requested.trim().isEmpty()) {
            result.put(snapshotFor(requested.trim()));
        } else {
            for (String id : IDS) result.put(snapshotFor(id));
        }
        JSObject out = new JSObject();
        out.put("capabilities", result);
        out.put("checkedAt", System.currentTimeMillis());
        call.resolve(out);
    }

    @PluginMethod
    public void requestCapability(PluginCall call) {
        String id = call.getString("capabilityId");
        String decision = call.getString("decision", "allow");
        if (id == null || !containsId(id)) {
            call.reject("Unknown capability");
            return;
        }

        persistDecision(id, "skip".equals(decision) ? "skip" : "allow");

        if ("skip".equals(decision)) {
            JSObject out = snapshotFor(id);
            out.put("needsSettings", false);
            call.resolve(out);
            return;
        }

        if (isRuntimeAlias(id)) {
            String alias = aliasFor(id);
            if ("granted".equalsIgnoreCase(String.valueOf(getPermissionState(alias)))) {
                call.resolve(snapshotFor(id));
                return;
            }
            requestPermissionForAlias(alias, call, "capabilityPermissionCallback");
            return;
        }

        if (isSpecial(id)) {
            boolean opened = openSettingsFor(id);
            JSObject out = snapshotFor(id);
            out.put("needsSettings", opened && !"ready".equals(out.optString("state")));
            if (!opened) {
                out.put("state", "unavailable");
                out.put("detail", "System settings screen is unavailable.");
            }
            call.resolve(out);
            return;
        }

        call.resolve(snapshotFor(id));
    }

    @PermissionCallback
    private void capabilityPermissionCallback(PluginCall call) {
        String id = call.getString("capabilityId");
        if (id == null || !containsId(id)) {
            call.reject("Capability request lost its id");
            return;
        }
        call.resolve(snapshotFor(id));
    }

    @PluginMethod
    public void setCapabilityDecision(PluginCall call) {
        String id = call.getString("capabilityId");
        String decision = call.getString("decision");
        if (id == null || !containsId(id)) {
            call.reject("Unknown capability");
            return;
        }
        if (!"allow".equals(decision) && !"skip".equals(decision)) {
            call.reject("Decision must be allow or skip");
            return;
        }
        persistDecision(id, decision);
        call.resolve(snapshotFor(id));
    }

    private boolean containsId(String id) {
        return Arrays.asList(IDS).contains(id);
    }

    private boolean isRuntimeAlias(String id) {
        return "camera".equals(id)
            || "microphone".equals(id)
            || "contacts".equals(id)
            || "notifications".equals(id);
    }

    private String aliasFor(String id) {
        if ("notifications".equals(id)) return "notifications";
        return id;
    }

    private boolean isSpecial(String id) {
        return "notification_listener".equals(id)
            || "overlay".equals(id)
            || "usage_access".equals(id);
    }

    private JSObject snapshotFor(String id) {
        String state = "error";
        String detail = null;

        try {
            switch (id) {
                case "camera":
                    if (!getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
                        state = "unavailable";
                        detail = "No camera hardware was reported by Android.";
                    } else if (!hasRuntimePermission("camera")) {
                        state = "denied";
                        detail = "Camera permission is not granted.";
                    } else {
                        state = "ready";
                    }
                    break;

                case "microphone":
                    if (!getPackageManager().hasSystemFeature(PackageManager.FEATURE_MICROPHONE)) {
                        state = "unavailable";
                        detail = "No microphone hardware was reported by Android.";
                    } else if (!hasRuntimePermission("microphone")) {
                        state = "denied";
                        detail = "Microphone permission is not granted.";
                    } else {
                        state = "ready";
                    }
                    break;

                case "contacts":
                    state = hasRuntimePermission("contacts") ? "ready" : "denied";
                    if ("denied".equals(state)) detail = "Contacts permission is not granted.";
                    break;

                case "notifications":
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasRuntimePermission("notifications")) {
                        state = "denied";
                        detail = "Notification permission is not granted.";
                    } else if (!NotificationManagerCompat.from(getContext()).areNotificationsEnabled()) {
                        state = "denied";
                        detail = "App notifications are disabled in Android settings.";
                    } else {
                        state = "ready";
                    }
                    break;

                case "notification_listener":
                    if (isNotificationListenerEnabled()) {
                        state = "ready";
                    } else {
                        state = "restricted";
                        detail = "Notification listener access must be enabled in Android Settings.";
                    }
                    break;

                case "overlay":
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                        state = "unavailable";
                        detail = "Overlay access is not supported on this Android version.";
                    } else if (Settings.canDrawOverlays(getContext())) {
                        state = "ready";
                    } else {
                        state = "restricted";
                        detail = "Display-over-other-apps access is not enabled.";
                    }
                    break;

                case "usage_access":
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
                        state = "unavailable";
                        detail = "Usage access is not supported on this Android version.";
                    } else if (hasUsageAccess()) {
                        state = "ready";
                    } else {
                        state = "restricted";
                        detail = "Usage access must be enabled in Android Settings.";
                    }
                    break;

                default:
                    state = "unavailable";
                    detail = "Capability is not implemented on this platform.";
            }
        } catch (SecurityException e) {
            state = "restricted";
            detail = "Android restricted access to this capability.";
        } catch (Exception e) {
            state = "error";
            detail = e.getClass().getSimpleName();
        }

        SharedPreferences prefs = getPrefs();
        String decision = prefs.getString(decisionKey(id), "unset");
        long checkedAt = System.currentTimeMillis();
        prefs.edit()
            .putString(stateKey(id), state)
            .putLong(checkedKey(id), checkedAt)
            .apply();

        JSObject out = new JSObject();
        out.put("id", id);
        out.put("state", state);
        out.put("decision", decision);
        out.put("checkedAt", checkedAt);
        if (detail != null) out.put("detail", detail);
        return out;
    }

    private boolean hasRuntimePermission(String alias) {
        String state = String.valueOf(getPermissionState(alias));
        return "granted".equalsIgnoreCase(state);
    }

    private boolean isNotificationListenerEnabled() {
        String enabled = Settings.Secure.getString(
            getContext().getContentResolver(),
            "enabled_notification_listeners"
        );
        if (enabled == null || enabled.isEmpty()) return false;

        ComponentName service = new ComponentName(getContext(), MvmNotificationListenerService.class);
        String expected = service.flattenToString();
        for (String value : enabled.split(":")) {
            if (expected.equals(value)) return true;
        }
        return false;
    }

    private boolean hasUsageAccess() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return false;
        AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null) return false;
        int mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            getContext().getPackageName()
        );
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private boolean openSettingsFor(String id) {
        Intent intent;
        try {
            switch (id) {
                case "overlay":
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false;
                    intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
                        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                    }
                    break;

                case "usage_access":
                    intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
                    break;

                case "notification_listener":
                    intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
                    break;

                default:
                    return false;
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            return true;
        } catch (ActivityNotFoundException e) {
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private void persistDecision(String id, String decision) {
        getPrefs().edit().putString(decisionKey(id), decision).apply();
    }

    private SharedPreferences getPrefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private String decisionKey(String id) { return id + ".decision"; }
    private String stateKey(String id) { return id + ".state"; }
    private String checkedKey(String id) { return id + ".checkedAt"; }

    private PackageManager getPackageManager() {
        return getContext().getPackageManager();
    }

    @PluginMethod
    public void openCamera(PluginCall call) {
        try {
            Intent intent = new Intent(getActivity(), MvmCameraActivity.class);
            getActivity().startActivity(intent);
            JSObject result = new JSObject(); result.put("opened", true); call.resolve(result);
        } catch (Exception e) { call.reject("Unable to open camera: " + e.getMessage(), e); }
    }

    @PluginMethod
    public void openQr(PluginCall call) {
        try {
            Intent intent = new Intent(getActivity(), MvmQrActivity.class);
            getActivity().startActivity(intent);
            JSObject result = new JSObject(); result.put("opened", true); call.resolve(result);
        } catch (Exception e) { call.reject("Unable to open QR scanner: " + e.getMessage(), e); }
    }

    @PluginMethod
    public void openWallpaper(PluginCall call) {
        try {
            Intent intent = new Intent(getActivity(), MvmWallpaperActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            getActivity().startActivity(intent);
            JSObject result = new JSObject(); result.put("opened", true); call.resolve(result);
        } catch (Exception e) { call.reject("Unable to open wallpaper gallery: " + e.getMessage(), e); }
    }

    @PluginMethod
    public void openEnglish(PluginCall call) {
        try {
            Intent intent = new Intent(getActivity(), MvmEnglishStudioActivity.class);
            intent.setPackage(getContext().getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            getActivity().runOnUiThread(() -> {
                try {
                    getActivity().startActivity(intent);
                    JSObject r=new JSObject(); r.put("opened",true); call.resolve(r);
                } catch(Exception e) { call.reject("Unable to open English Studio: "+e.getMessage(),e); }
            });
        } catch(Exception e) { call.reject("Unable to open English Studio: "+e.getMessage(),e); }
    }

    @PluginMethod
    public void openNotifications(PluginCall call) {
        try {
            Intent intent = new Intent(getActivity(), MvmNotificationCenterActivity.class);
            intent.setPackage(getContext().getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            getActivity().runOnUiThread(() -> {
                try {
                    getActivity().startActivity(intent);
                } catch (Exception e) {
                    call.reject("Unable to open notification center: " + e.getMessage(), e); return;
                }
                JSObject result = new JSObject(); result.put("opened", true); call.resolve(result);
            });
        } catch (ActivityNotFoundException e) { call.reject("Notification center activity is unavailable", e);
        } catch (Exception e) { call.reject("Unable to open notification center: " + e.getMessage(), e); }
    }

    @PluginMethod
    public void openPackage(PluginCall call) {
        String packageName = call.getString("packageName"), action = call.getString("action"), data = call.getString("data");
        if (packageName == null || packageName.trim().isEmpty()) { call.reject("packageName is required"); return; }
        PackageManager pm = getContext().getPackageManager(); Intent launchIntent = null;
        try {
            if (action != null && !action.trim().isEmpty()) {
                launchIntent = new Intent(action); launchIntent.setPackage(packageName);
                if (data != null && !data.trim().isEmpty()) launchIntent.setData(Uri.parse(data));
                if (Intent.ACTION_MAIN.equals(action)) launchIntent.addCategory(Intent.CATEGORY_LAUNCHER);
            } else {
                launchIntent = pm.getLaunchIntentForPackage(packageName);
                if (launchIntent == null) launchIntent = pm.getLeanbackLaunchIntentForPackage(packageName);
            }
        } catch (Exception ignored) { launchIntent = null; }
        boolean installed;
        try { pm.getApplicationInfo(packageName, 0); installed = true; }
        catch (PackageManager.NameNotFoundException e) { installed = false; }
        if (launchIntent == null) {
            JSObject result = new JSObject(); result.put("launched", false); result.put("installed", installed);
            result.put("error", installed ? "NO_LAUNCH_ACTIVITY" : "NOT_INSTALLED"); call.resolve(result); return;
        }
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getActivity().startActivity(launchIntent);
            JSObject result = new JSObject(); result.put("launched", true); result.put("installed", true); call.resolve(result);
        } catch (ActivityNotFoundException e) {
            JSObject result = new JSObject(); result.put("launched", false); result.put("installed", installed); result.put("error", "ACTIVITY_NOT_FOUND"); call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject(); result.put("launched", false); result.put("installed", installed); result.put("error", e.getClass().getSimpleName()); call.resolve(result);
        }
    }

    @PluginMethod
    public void openIncomingFile(PluginCall call) {
        String rawUri = call.getString("uri");
        String mime = call.getString("mimeType");
        if (rawUri == null || rawUri.trim().isEmpty()) { call.reject("A scoped content URI is required"); return; }
        Uri uri;
        try { uri = Uri.parse(rawUri); } catch (Exception e) { call.reject("Invalid file URI", e); return; }
        String lower = rawUri.toLowerCase(java.util.Locale.ROOT);
        if (!"content".equalsIgnoreCase(uri.getScheme()) || uri.getAuthority() == null
                || uri.getAuthority().equalsIgnoreCase(getContext().getPackageName() + ".fileprovider")
                || lower.contains("/data/") || lower.contains("/proc/") || lower.contains("/sys/")) {
            call.reject("Only external scoped content URIs can be opened"); return;
        }
        String safeType = mime;
        if (safeType == null || !safeType.matches("(?i)^[a-z0-9!#    @PluginMethod
    public void openUrl(PluginCall call) {^_.+-]+/[a-z0-9!#    @PluginMethod
    public void openUrl(PluginCall call) {^_.+*-]+$")) {
            safeType = getContext().getContentResolver().getType(uri);
        }
        if (safeType == null || safeType.trim().isEmpty()) safeType = "*/*";
        try {
            Intent view = new Intent(Intent.ACTION_VIEW);
            view.setDataAndType(uri, safeType);
            view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(Intent.createChooser(view, "Open with"));
            JSObject result = new JSObject();
            result.put("opened", true);
            result.put("reason", "system chooser started; external file handling is not verified");
            call.resolve(result);
        } catch (ActivityNotFoundException e) {
            JSObject result = new JSObject(); result.put("opened", false);
            result.put("reason", "no application can handle this file type"); call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject(); result.put("opened", false);
            result.put("reason", e.getClass().getSimpleName()); call.resolve(result);
        }
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.trim().isEmpty()) { call.reject("url is required"); return; }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url)); intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent); JSObject result = new JSObject(); result.put("opened", true); call.resolve(result);
        } catch (Exception e) { JSObject result = new JSObject(); result.put("opened", false); call.resolve(result); }
    }

    @PluginMethod
    public void openStore(PluginCall call) {
        String packageName = call.getString("packageName"), webUrl = call.getString("webUrl");
        if (packageName == null || packageName.trim().isEmpty()) { call.reject("packageName is required"); return; }
        boolean opened=false;
        try { Intent market=new Intent(Intent.ACTION_VIEW,Uri.parse("market://details?id="+Uri.encode(packageName)));market.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);getActivity().startActivity(market);opened=true; } catch(Exception ignored){}
        if(!opened&&webUrl!=null&&!webUrl.trim().isEmpty()) {
            try { Intent web=new Intent(Intent.ACTION_VIEW,Uri.parse(webUrl));web.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);getActivity().startActivity(web);opened=true; } catch(Exception ignored){}
        }
        JSObject result=new JSObject();result.put("opened",opened);call.resolve(result);
    }

    @PluginMethod
    public void share(PluginCall call) {
        String text = call.getString("text");
        String mime = call.getString("mime", "text/plain");
        boolean chooser = call.getBoolean("chooser", true);
        String fileUri = call.getString("fileUri");
        if ((text == null || text.trim().isEmpty()) && (fileUri == null || fileUri.trim().isEmpty())) {
            call.reject("share needs text or an explicit file grant");
            return;
        }
        if (fileUri != null && (fileUri.startsWith("file:") || fileUri.startsWith("/") || fileUri.contains("/data/"))) {
            JSObject blocked = new JSObject();
            blocked.put("started", false);
            blocked.put("reason", "private file share requires an explicit scoped grant");
            call.resolve(blocked);
            return;
        }
        try {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mime == null || mime.trim().isEmpty() ? "text/plain" : mime);
            if (text != null) send.putExtra(Intent.EXTRA_TEXT, text);
            if (fileUri != null && fileUri.startsWith("content:")) {
                send.putExtra(Intent.EXTRA_STREAM, Uri.parse(fileUri));
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }
            Intent outbound = chooser ? Intent.createChooser(send, "MVMCMD") : send;
            outbound.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(outbound);
            JSObject result = new JSObject();
            result.put("started", true);
            result.put("method", chooser ? "chooser" : "share");
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("started", false);
            result.put("reason", e.getClass().getSimpleName());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void lookupContact(PluginCall call) {
        String query = call.getString("query");
        if (query == null || query.trim().isEmpty()) { call.reject("query is required"); return; }
        if (androidx.core.content.ContextCompat.checkSelfPermission(getContext(), android.Manifest.permission.READ_CONTACTS)
                != PackageManager.PERMISSION_GRANTED) {
            call.reject("READ_CONTACTS permission is required");
            return;
        }
        String q = query.trim();
        android.database.Cursor cursor = null;
        try {
            Uri uri = ContactsContract.CommonDataKinds.Phone.CONTENT_URI;
            String selection = ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ? OR "
                    + ContactsContract.CommonDataKinds.Phone.NUMBER + " LIKE ?";
            String pattern = "%" + q + "%";
            cursor = getContext().getContentResolver().query(
                    uri,
                    new String[] {
                        ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                        ContactsContract.CommonDataKinds.Phone.NUMBER
                    },
                    selection,
                    new String[] { pattern, pattern },
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " COLLATE NOCASE ASC"
            );
            JSObject result = new JSObject();
            if (cursor != null && cursor.moveToFirst()) {
                result.put("found", true);
                result.put("name", cursor.getString(0));
                result.put("phone", cursor.getString(1));
            } else {
                result.put("found", false);
            }
            call.resolve(result);
        } catch (SecurityException e) {
            call.reject("Contacts access is restricted", e);
        } catch (Exception e) {
            call.reject("Contact lookup failed", e);
        } finally {
            if (cursor != null) cursor.close();
        }
    }

    @PluginMethod
    public void openDialer(PluginCall call) {
        String phone = call.getString("phone");
        if (phone == null || phone.trim().isEmpty()) { call.reject("phone is required"); return; }
        try {
            Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(phone.trim())));
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
    public void openSmsComposer(PluginCall call) {
        String phone = call.getString("phone");
        String body = call.getString("body");
        if (phone == null || phone.trim().isEmpty()) { call.reject("phone is required"); return; }
        if (body == null || body.trim().isEmpty()) { call.reject("body is required"); return; }
        try {
            Intent intent = new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:" + Uri.encode(phone.trim())));
            intent.putExtra("sms_body", body);
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
    public void openEmailComposer(PluginCall call) {
        String email = call.getString("email");
        String subject = call.getString("subject", "");
        String body = call.getString("body", "");
        if (email == null || email.trim().isEmpty()) { call.reject("email is required"); return; }
        try {
            Uri uri = Uri.parse("mailto:" + Uri.encode(email.trim()))
                    .buildUpon()
                    .appendQueryParameter("subject", subject)
                    .appendQueryParameter("body", body)
                    .build();
            Intent intent = new Intent(Intent.ACTION_SENDTO, uri);
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
}
