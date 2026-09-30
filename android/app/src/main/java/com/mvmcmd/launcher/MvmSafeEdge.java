package com.mvmcmd.launcher;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Shader;
import android.os.Handler;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.graphics.PixelFormat;

public final class MvmSafeEdge {
    private static View view;
    private static final Handler handler = new Handler();

    private MvmSafeEdge() {}

    public static void show(Context context) {
        if (!Settings.canDrawOverlays(context)) return;
        handler.post(() -> {
            try {
                final WindowManager wm = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
                if (view != null) return;
                view = new EdgeView(context);
                WindowManager.LayoutParams p = new WindowManager.LayoutParams(
                        4,
                        WindowManager.LayoutParams.MATCH_PARENT,
                        android.os.Build.VERSION.SDK_INT >= 26
                                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                                : WindowManager.LayoutParams.TYPE_PHONE,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                                | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                        PixelFormat.TRANSLUCENT);
                p.gravity = Gravity.TOP | Gravity.START;
                wm.addView(view, p);
                handler.postDelayed(() -> hide(context), 1300);
            } catch (Exception ignored) { view = null; }
        });
    }

    private static void hide(Context context) {
        handler.post(() -> {
            if (view == null) return;
            try {
                WindowManager wm = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
                wm.removeView(view);
            } catch (Exception ignored) {}
            view = null;
        });
    }

    private static final class EdgeView extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        EdgeView(Context c) { super(c); setLayerType(View.LAYER_TYPE_SOFTWARE, null); }
        @Override protected void onDraw(Canvas c) {
            super.onDraw(c);
            float h = getHeight();
            paint.setShader(new LinearGradient(0, 0, 0, h,
                    new int[]{0x00ff4fd8,0xffff4fd8,0xff52e7ff,0xff72ff9a,0xffffe26b,0x00ff4fd8},
                    null, Shader.TileMode.CLAMP));
            c.drawRect(0, 0, getWidth(), h, paint);
        }
    }
}
