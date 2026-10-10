package com.mvmcmd.launcher;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

/**
 * Local notification history store.
 *
 * Privacy notes (P1):
 * - Stored in MODE_PRIVATE SharedPreferences (allowBackup=false on the app).
 * - Entries older than RETENTION_MS are dropped on every read/write.
 * - Detected OTP/code values are redacted after CODE_TTL_MS so long-lived
 *   plaintext secrets are not kept on disk.
 */
public final class MvmNotificationStore {
    private static final String PREFS = "mvm_notifications";
    private static final String KEY_ITEMS = "items";
    private static final int MAX_ITEMS = 120;
    /** Drop history older than 24 hours. */
    private static final long RETENTION_MS = 24L * 60L * 60L * 1000L;
    /** Redact OTP/code fields after 15 minutes. */
    private static final long CODE_TTL_MS = 15L * 60L * 1000L;

    public static final class Item {
        public final String app, title, body, code, sourceKey;
        public final long time;
        public final boolean call;

        Item(String a, String t, String b, String c, long tm, boolean cl, String k) {
            app = a;
            title = t;
            body = b;
            code = c;
            time = tm;
            call = cl;
            sourceKey = k;
        }
    }

    private MvmNotificationStore() {}

    public static synchronized void add(
            Context c,
            String app,
            String title,
            String body,
            String code,
            boolean call,
            String sourceKey) {
        try {
            SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray old = new JSONArray(p.getString(KEY_ITEMS, "[]"));
            long now = System.currentTimeMillis();
            JSONArray next = new JSONArray();
            if (sourceKey == null) sourceKey = "";

            next.put(
                    new JSONObject()
                            .put("app", app)
                            .put("title", title)
                            .put("body", body)
                            .put("code", code == null ? "" : code)
                            .put("time", now)
                            .put("call", call)
                            .put("key", sourceKey));

            for (int i = 0; i < old.length() && next.length() < MAX_ITEMS; i++) {
                JSONObject o = old.getJSONObject(i);
                long t = o.optLong("time", 0);
                if (now - t > RETENTION_MS) continue; // drop expired
                if (!sourceKey.isEmpty()
                        && sourceKey.equals(o.optString("key", ""))
                        && now - t < 2500) {
                    continue; // dedupe burst
                }
                // Redact code after short TTL
                if (now - t > CODE_TTL_MS && o.optString("code", "").length() > 0) {
                    o.put("code", "");
                }
                next.put(o);
            }
            p.edit().putString(KEY_ITEMS, next.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    public static void add(
            Context c, String app, String title, String body, String code, boolean call) {
        add(c, app, title, body, code, call, "");
    }

    public static synchronized void addDemo(
            Context c, String app, String title, String body, String code, boolean call) {
        add(c, app, title, body, code, call, "demo-" + System.nanoTime());
    }

    public static synchronized List<Item> read(Context c) {
        ArrayList<Item> out = new ArrayList<>();
        try {
            SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray a = new JSONArray(p.getString(KEY_ITEMS, "[]"));
            long now = System.currentTimeMillis();
            JSONArray kept = new JSONArray();
            boolean changed = false;

            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                long t = o.optLong("time", 0);
                if (now - t > RETENTION_MS) {
                    changed = true;
                    continue;
                }
                String code = o.optString("code", "");
                if (now - t > CODE_TTL_MS && code.length() > 0) {
                    o.put("code", "");
                    code = "";
                    changed = true;
                }
                kept.put(o);
                out.add(
                        new Item(
                                o.optString("app", ""),
                                o.optString("title", ""),
                                o.optString("body", ""),
                                code,
                                t,
                                o.optBoolean("call", false),
                                o.optString("key", "")));
            }
            if (changed) {
                p.edit().putString(KEY_ITEMS, kept.toString()).apply();
            }
        } catch (Exception ignored) {
        }
        return out;
    }

    public static void clear(Context c) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY_ITEMS).apply();
    }
}
