package com.mvmcmd.launcher;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.MotionEvent;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

/**
 * Shared MVMCMD native visual language.
 * Keeps camera / QR / notification / wallpaper / English surfaces visually consistent
 * without changing their underlying behavior.
 */
public final class MvmUiKit {
    public static final int BG = Color.rgb(6, 8, 12);
    public static final int SURFACE = Color.rgb(12, 16, 23);
    public static final int PANEL = Color.rgb(15, 20, 28);
    public static final int PANEL_2 = Color.rgb(21, 27, 37);
    public static final int FG = Color.rgb(244, 247, 250);
    public static final int MUTED = Color.rgb(145, 155, 172);
    public static final int FAINT = Color.rgb(92, 101, 116);
    public static final int ACCENT = Color.rgb(188, 255, 78);
    public static final int BLUE = Color.rgb(94, 190, 255);
    public static final int RED = Color.rgb(255, 105, 125);
    public static final int LINE = Color.rgb(40, 48, 62);
    public static final int ROLE_BENTO = 40;
    public static final int ROLE_GLASS = 20;
    public static final int ROLE_NEUMORPHIC = 20;
    public static final int ROLE_SKEUOMORPHIC = 20;

    private MvmUiKit() {}

    public static int dp(Context c, int value) {
        return Math.round(value * c.getResources().getDisplayMetrics().density);
    }

    public static GradientDrawable surface(Context c, int color, int radius) {
        GradientDrawable d = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{tint(color, 228), tint(color, 198)}
        );
        d.setCornerRadius(dp(c, radius));
        d.setStroke(dp(c, 1), 0x66374352);
        return d;
    }

    /** Large-surface variant: translucent by intent, reserved for Bento panels. */
    public static GradientDrawable glass(Context c, int color, int radius) {
        GradientDrawable d = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[]{tint(color, 214), tint(color, 182)}
        );
        d.setCornerRadius(dp(c, radius));
        d.setStroke(dp(c, 1), 0x663A4657);
        return d;
    }

    public static GradientDrawable stroke(Context c, int color, int radius, int lineColor) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(c, radius));
        d.setStroke(dp(c, 1), lineColor);
        return d;
    }

    public static TextView text(Context c, String value, float size, int color, boolean bold) {
        TextView t = new TextView(c);
        t.setText(value);
        t.setTextColor(color);
        t.setTextSize(size);
        t.setTypeface(Typeface.create("sans-serif", bold ? Typeface.BOLD : Typeface.NORMAL));
        t.setFontFeatureSettings("kern");
        t.setIncludeFontPadding(false);
        return t;
    }

    public static TextView chip(Context c, String value, boolean selected) {
        TextView t = text(c, value, 10, selected ? BG : MUTED, true);
        t.setGravity(android.view.Gravity.CENTER);
        t.setPadding(dp(c, 12), 0, dp(c, 12), 0);
        t.setBackground(surface(c, selected ? ACCENT : PANEL_2, 99));
        installPress(t);
        return t;
    }

    public static Button button(Context c, String value, boolean primary) {
        Button b = new Button(c);
        b.setText(value);
        b.setTextColor(primary ? BG : FG);
        b.setTextSize(11);
        b.setAllCaps(false);
        b.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
        b.setGravity(android.view.Gravity.CENTER);
        b.setMinHeight(dp(c, 48));
        b.setPadding(dp(c, 14), 0, dp(c, 14), 0);
        b.setStateListAnimator(null);
        int base = primary ? ACCENT : PANEL_2;
        b.setBackground(neumorphic(c, base, 16, primary));
        b.setElevation(dp(c, primary ? 3 : 2));
        b.setTranslationZ(dp(c, 1));
        installPress(b);
        return b;
    }

    private static GradientDrawable neumorphic(Context c, int base, int radius, boolean primary) {
        int top = primary ? shift(base, 1.08f) : shift(base, 1.05f);
        int bottom = primary ? shift(base, 0.90f) : shift(base, 0.88f);
        GradientDrawable d = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{top, bottom}
        );
        d.setCornerRadius(dp(c, radius));
        d.setStroke(dp(c, 1), primary ? 0x88FFFFFF : 0x66404C5F);
        return d;
    }

    private static int tint(int color, int alpha) {
        return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color));
    }

    private static int shift(int color, float factor) {
        return Color.rgb(
                clamp((int)(Color.red(color) * factor)),
                clamp((int)(Color.green(color) * factor)),
                clamp((int)(Color.blue(color) * factor))
        );
    }

    private static int clamp(int value) {
        return Math.max(0, Math.min(255, value));
    }

    public static void installPress(View v) {
        v.setOnTouchListener((view, event) -> {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    view.animate().scaleX(0.985f).scaleY(0.985f).setDuration(70).start();
                    break;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    view.animate().scaleX(1f).scaleY(1f).setDuration(150).start();
                    break;
            }
            return false;
        });
    }

    public static void applyWindow(android.app.Activity a) {
        a.getWindow().setStatusBarColor(BG);
        a.getWindow().setNavigationBarColor(BG);
        a.getWindow().getDecorView().setSystemUiVisibility(0);
    }
}
