package com.mvmcmd.launcher;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public final class MvmNotificationStore {
    private static final String PREFS = "mvm_notifications";
    private static final String KEY_ITEMS = "items";
    private static final int MAX_ITEMS = 80;

    public static final class Item {
        public final String app;
        public final String title;
        public final String body;
        public final String code;
        public final long time;
        public final boolean call;

        Item(String app, String title, String body, String code, long time, boolean call) {
            this.app = app; this.title = title; this.body = body; this.code = code;
            this.time = time; this.call = call;
        }
    }

    private MvmNotificationStore() {}

    public static synchronized void add(Context context, String app, String title, String body, String code, boolean call) {
        try {
            JSONArray old = new JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString(KEY_ITEMS, "[]"));
            JSONArray next = new JSONArray();
            next.put(new JSONObject()
                    .put("app", app)
                    .put("title", title)
                    .put("body", body)
                    .put("code", code == null ? "" : code)
                    .put("time", System.currentTimeMillis())
                    .put("call", call));
            for (int i = 0; i < old.length() && next.length() < MAX_ITEMS; i++) next.put(old.getJSONObject(i));
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                    .putString(KEY_ITEMS, next.toString()).apply();
        } catch (Exception ignored) {}
    }

    public static synchronized List<Item> read(Context context) {
        ArrayList<Item> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString(KEY_ITEMS, "[]"));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                out.add(new Item(
                        o.optString("app", ""),
                        o.optString("title", ""),
                        o.optString("body", ""),
                        o.optString("code", ""),
                        o.optLong("time", 0L),
                        o.optBoolean("call", false)
                ));
            }
        } catch (Exception ignored) {}
        return out;
    }
}
