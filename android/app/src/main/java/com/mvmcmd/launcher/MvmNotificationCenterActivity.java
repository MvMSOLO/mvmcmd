package com.mvmcmd.launcher;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.text.DateFormat;
import java.util.Date;
import java.util.List;

public class MvmNotificationCenterActivity extends Activity {
    private int dp(float v) { return (int)(v * getResources().getDisplayMetrics().density + 0.5f); }
    private TextView text(String value, float size, int color) {
        TextView t = new TextView(this);
        t.setText(value); t.setTextSize(size); t.setTextColor(color);
        t.setFontFeatureSettings("kern");
        return t;
    }

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        build();
    }

    private void build() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(18), dp(20), dp(18), dp(18));
        root.setBackgroundColor(Color.rgb(8, 9, 14));

        TextView head = text("MVMCMD  /  NOTIFICATION  2.0", 22, Color.WHITE);
        head.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        root.addView(head, new LinearLayout.LayoutParams(-1, dp(42)));

        TextView sub = text("messages · codes · calls · game-safe edge · DEMO", 13, 0xff9da4b6);
        root.addView(sub, new LinearLayout.LayoutParams(-1, dp(30)));

        LinearLayout setup = new LinearLayout(this);
        setup.setOrientation(LinearLayout.HORIZONTAL);
        setup.setGravity(Gravity.CENTER_VERTICAL);

        Button access = new Button(this);
        access.setText("Notification access");
        access.setOnClickListener(v -> startActivity(new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")));
        setup.addView(access, new LinearLayout.LayoutParams(0, dp(46), 1));

        Button usage = new Button(this);
        usage.setText("Usage access");
        usage.setOnClickListener(v -> { try { startActivity(new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)); } catch (Exception ignored) {} });
        setup.addView(usage, new LinearLayout.LayoutParams(0, dp(46), 1));

        Button overlay = new Button(this);
        overlay.setText("Safe edge");
        overlay.setOnClickListener(v -> {
            try { startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()))); } catch (Exception ignored) {}
        });
        setup.addView(overlay, new LinearLayout.LayoutParams(0, dp(46), 1));
        root.addView(setup);

        Button demo = new Button(this);
        demo.setText("RUN VISUAL DEMO");
        demo.setOnClickListener(v -> showDemo());
        root.addView(demo, new LinearLayout.LayoutParams(-1, dp(48)));

        ScrollView scroll = new ScrollView(this);
        LinearLayout list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setPadding(0, dp(14), 0, dp(14));

        List<MvmNotificationStore.Item> items = MvmNotificationStore.read(this);
        if (items.isEmpty()) {
            TextView empty = text("No notifications captured yet.", 14, 0xff747b8e);
            empty.setPadding(0, dp(20), 0, dp(20));
            list.addView(empty);
        } else {
            DateFormat df = DateFormat.getTimeInstance(DateFormat.SHORT);
            for (MvmNotificationStore.Item item : items) {
                LinearLayout row = new LinearLayout(this);
                row.setOrientation(LinearLayout.VERTICAL);
                row.setPadding(dp(14), dp(12), dp(14), dp(12));
                row.setBackgroundColor(0xff121521);

                TextView top = text(item.app + "  ·  " + df.format(new Date(item.time)), 12, 0xff7c8cff);
                row.addView(top);
                TextView title = text(item.title, 16, Color.WHITE);
                title.setTypeface(Typeface.DEFAULT_BOLD);
                row.addView(title);
                TextView body = text(item.body, 14, 0xffc7ccda);
                body.setPadding(0, dp(4), 0, 0);
                row.addView(body);

                if (!item.code.isEmpty()) {
                    Button copy = new Button(this);
                    copy.setText("COPY  " + item.code);
                    copy.setOnClickListener(v -> {
                        ClipboardManager cm = (ClipboardManager)getSystemService(CLIPBOARD_SERVICE);
                        cm.setPrimaryClip(ClipData.newPlainText("MVMCMD code", item.code));
                        copy.setText("COPIED  ✓");
                    });
                    row.addView(copy, new LinearLayout.LayoutParams(-1, dp(44)));
                }
                list.addView(row, new LinearLayout.LayoutParams(-1, LinearLayout.LayoutParams.WRAP_CONTENT));
                View gap = new View(this);
                list.addView(gap, new LinearLayout.LayoutParams(1, dp(8)));
            }
        }
        scroll.addView(list);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
    private void showDemo() {
        LinearLayout panel = new LinearLayout(this); panel.setOrientation(LinearLayout.VERTICAL); panel.setPadding(dp(18),dp(12),dp(18),dp(12));
        TextView h=text("LIVE NOTIFICATION PREVIEW",18,Color.WHITE); h.setTypeface(Typeface.DEFAULT,Typeface.BOLD); panel.addView(h);
        panel.addView(text("Telegram · New message",14,0xffc7ccda)); panel.addView(text("Your verification code is 4821",15,Color.WHITE));
        Button copy=new Button(this); copy.setText("COPY  4821"); copy.setOnClickListener(v->{ClipboardManager cm=(ClipboardManager)getSystemService(CLIPBOARD_SERVICE);cm.setPrimaryClip(ClipData.newPlainText("code","4821"));copy.setText("COPIED  ✓");}); panel.addView(copy);
        panel.addView(text("INCOMING CALL  ·  Aziza Karimova",15,Color.WHITE));
        panel.addView(text("GAME SAFE MODE  ·  only a thin rainbow edge signal",12,0xff9da4b6));
        new android.app.AlertDialog.Builder(this).setView(panel).setPositiveButton("CLOSE",null).show();
    }
}
