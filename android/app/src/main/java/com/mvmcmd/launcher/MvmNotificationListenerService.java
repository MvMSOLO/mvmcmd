package com.mvmcmd.launcher;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.os.Build;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import androidx.core.app.NotificationCompat;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MvmNotificationListenerService extends NotificationListenerService {
    private static final String CHANNEL_ALERT = "mvm_notify_alert";
    private static final String CHANNEL_SAFE = "mvm_notify_safe";
    private static final Pattern CODE = Pattern.compile("(?<!\\d)\\d{4,8}(?!\\d)");

    @Override public void onCreate() {
        super.onCreate();
        createChannel(CHANNEL_ALERT, NotificationManager.IMPORTANCE_HIGH);
        createChannel(CHANNEL_SAFE, NotificationManager.IMPORTANCE_LOW);
    }

    private void createChannel(String id, int importance) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        NotificationChannel c = new NotificationChannel(id, id.equals(CHANNEL_SAFE) ? "MVMCMD Safe Mode" : "MVMCMD Notifications", importance);
        c.setDescription("MVMCMD native notification engine");
        c.setSound(null, null);
        c.enableVibration(false);
        nm.createNotificationChannel(c);
    }

    @Override public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || getPackageName().equals(sbn.getPackageName())) return;
        Notification n = sbn.getNotification();
        if (n == null || (n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;

        String app = applicationLabel(sbn.getPackageName());
        String title = value(n.extras, Notification.EXTRA_TITLE);
        String body = value(n.extras, Notification.EXTRA_BIG_TEXT);
        if (body.isEmpty()) body = value(n.extras, Notification.EXTRA_TEXT);
        if (title.isEmpty() && body.isEmpty()) return;

        String code = findCode(title + " " + body);
        boolean call = n.category != null && Notification.CATEGORY_CALL.equals(n.category);
        call = call || looksLikeCall(app, title, sbn.getPackageName());

        MvmNotificationStore.add(this, app, title, body, code, call);

        boolean safe = isSafeSurface();
        if (safe) {
            MvmSafeEdge.show(this);
        } else {
            MvmNotificationSound.play();
        }
        postMirror(sbn, app, title, body, code, call, safe);
    }

    private void postMirror(StatusBarNotification sbn, String app, String title, String body,
                            String code, boolean call, boolean safe) {
        String channel = safe ? CHANNEL_SAFE : CHANNEL_ALERT;
        Intent open = new Intent(this, MvmNotificationCenterActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(this, 901,
                open, PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag());

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, channel)
                .setSmallIcon(com.mvmcmd.launcher.R.drawable.mvmcmd_logo)
                .setColor(0xff7c5cff)
                .setContentTitle(title.isEmpty() ? app : title)
                .setContentText(body.isEmpty() ? app : body)
                .setSubText(app)
                .setContentIntent(content)
                .setAutoCancel(!call)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setCategory(call ? NotificationCompat.CATEGORY_CALL : NotificationCompat.CATEGORY_MESSAGE)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body.isEmpty() ? title : body));

        if (!code.isEmpty()) {
            Intent copy = new Intent(this, MvmNotificationCopyReceiver.class).putExtra("code", code);
            PendingIntent cp = PendingIntent.getBroadcast(this, code.hashCode(), copy,
                    PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag());
            b.addAction(new NotificationCompat.Action(0, "COPY " + code, cp));
        }

        if (call && sbn.getNotification().actions != null) {
            for (Notification.Action action : sbn.getNotification().actions) {
                if (action == null || action.actionIntent == null) continue;
                String label = action.title == null ? "" : action.title.toString();
                String lower = label.toLowerCase(Locale.ROOT);
                if (lower.contains("answer") || lower.contains("accept") || lower.contains("green")) {
                    b.addAction(new NotificationCompat.Action(0, "ANSWER", action.actionIntent));
                } else if (lower.contains("decline") || lower.contains("reject") || lower.contains("red") || lower.contains("hang")) {
                    b.addAction(new NotificationCompat.Action(0, "DECLINE", action.actionIntent));
                }
            }
        }

        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.notify(Math.abs((sbn.getPackageName() + ":" + sbn.getId()).hashCode()), b.build());
    }

    private boolean isSafeSurface() {
        try {
            UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
            if (usm == null) return false;
            long now = System.currentTimeMillis();
            UsageEvents events = usm.queryEvents(now - 2500, now);
            UsageEvents.Event e = new UsageEvents.Event();
            String pkg = null;
            while (events.hasNextEvent()) {
                events.getNextEvent(e);
                if (e.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) pkg = e.getPackageName();
            }
            if (pkg == null || getPackageName().equals(pkg)) return false;
            ApplicationInfo ai = getPackageManager().getApplicationInfo(pkg, 0);
            if (Build.VERSION.SDK_INT >= 26 && ai.category == ApplicationInfo.CATEGORY_GAME) return true;
            String p = pkg.toLowerCase(Locale.ROOT);
            return p.contains("youtube") || p.contains("netflix") || p.contains("twitch")
                    || p.contains("mxplayer") || p.contains("vlc") || p.contains("player");
        } catch (Exception ignored) {
            return false;
        }
    }

    private String applicationLabel(String pkg) {
        try { return getPackageManager().getApplicationLabel(getPackageManager().getApplicationInfo(pkg, 0)).toString(); }
        catch (Exception e) { return pkg; }
    }

    private static String value(android.os.Bundle b, String key) {
        if (b == null) return "";
        CharSequence v = b.getCharSequence(key);
        return v == null ? "" : v.toString().trim();
    }

    private static String findCode(String text) {
        Matcher m = CODE.matcher(text == null ? "" : text);
        return m.find() ? m.group() : "";
    }

    private static boolean looksLikeCall(String app, String title, String pkg) {
        String s = (app + " " + title + " " + pkg).toLowerCase(Locale.ROOT);
        return s.contains("phone") || s.contains("dialer") || s.contains("call") || s.contains("telefon");
    }

    private static int immutableFlag() {
        return Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0;
    }
}
