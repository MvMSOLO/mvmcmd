package com.mvmcmd.launcher;

import android.content.Context;
import android.graphics.*;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class MvmWallpaperRenderer {
    private final Context context;
    private final Paint bitmapPaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG | Paint.DITHER_FLAG);
    private final Paint shapePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint text = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
    private final Paint mask = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final SimpleDateFormat time = new SimpleDateFormat("HH:mm", Locale.ENGLISH);
    private final SimpleDateFormat date = new SimpleDateFormat("EEE, MMM d", Locale.ENGLISH);
    private Bitmap bitmap;
    private String loadedId;

    public MvmWallpaperRenderer(Context c) { context = c.getApplicationContext(); }

    public void setSpec(MvmWallpaperCatalog.Spec s) {
        if (s == null || s.id.equals(loadedId)) return;
        if (bitmap != null && !bitmap.isRecycled()) bitmap.recycle();
        bitmap = load(context, s.asset, 2560);
        loadedId = s.id;
    }

    public static Bitmap loadThumbnail(Context c, MvmWallpaperCatalog.Spec s) {
        return load(c, s.asset, 400);
    }

    private static Bitmap load(Context c, String path, int maxDimension) {
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        try (InputStream in = c.getAssets().open(path)) {
            BitmapFactory.decodeStream(in, null, bounds);
        } catch (Exception e) {
            return null;
        }
        int sample = 1;
        while (Math.max(bounds.outWidth / sample, bounds.outHeight / sample) > maxDimension) {
            sample *= 2;
        }
        BitmapFactory.Options opts = new BitmapFactory.Options();
        opts.inPreferredConfig = Bitmap.Config.ARGB_8888;
        opts.inSampleSize = Math.max(1, sample);
        opts.inDither = true;
        opts.inScaled = false;
        try (InputStream in = c.getAssets().open(path)) {
            return BitmapFactory.decodeStream(in, null, opts);
        } catch (Exception e) {
            return null;
        }
    }

    public Bitmap renderBitmap(MvmWallpaperCatalog.Spec s, int w, int h, long now) {
        setSpec(s);
        Bitmap out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        draw(new Canvas(out), w, h, s, 0f, 0f, false, now);
        return out;
    }

    public void draw(Canvas c, int w, int h, MvmWallpaperCatalog.Spec s, float tiltX, float tiltY, boolean showClock, long now) {
        setSpec(s);
        if (bitmap == null || w <= 0 || h <= 0) return;

        c.drawColor(Color.BLACK);

        float scale = Math.max(w / (float) bitmap.getWidth(), h / (float) bitmap.getHeight()) * 1.012f;
        float driftX = (float) Math.sin(now * 0.00012) * s.drift;
        float driftY = (float) Math.cos(now * 0.00016) * s.drift * 0.70f;

        // Base Layer (Background Depth Shift)
        float px = (tiltX * s.depth + driftX) * w * 0.022f;
        float py = (tiltY * s.depth + driftY) * h * 0.018f;
        drawCover(c, w, h, scale, px, py, 255);

        // Single high-quality bitmap pass. No duplicate/feathered copy is drawn,
        // so the source image stays crisp while the scene still moves subtly.
        // Clock & Date UI Widget Rendering
        if (showClock) {
            drawClock(c, s, w, h, now);
        }

        // Subtle edge vignette only; no bitmap blur/filter overlay.
        drawVignette(c, w, h);
    }

    private void drawCover(Canvas c, int w, int h, float scale, float dx, float dy, int alpha) {
        float bw = bitmap.getWidth() * scale, bh = bitmap.getHeight() * scale;
        RectF d = new RectF((w - bw) * 0.5f + dx, (h - bh) * 0.5f + dy, (w + bw) * 0.5f + dx, (h + bh) * 0.5f + dy);
        bitmapPaint.setAlpha(alpha);
        c.drawBitmap(bitmap, null, d, bitmapPaint);
        bitmapPaint.setAlpha(255);
    }

    private void drawClock(Canvas c, MvmWallpaperCatalog.Spec s, int w, int h, long now) {
        String tm = time.format(new Date(now));
        String dt = date.format(new Date(now)).toUpperCase(Locale.ENGLISH);

        float min = Math.min(w, h);
        float x = s.clockX * w, y = s.clockY * h, size = s.clockSize * min;

        // Custom Typography Styles per Spec
        String clockFace;
        if ("outline".equals(s.style) || "ghost".equals(s.style)) {
            clockFace = "sans-serif-thin";
        } else if ("stack".equals(s.style)) {
            clockFace = "sans-serif-black";
        } else {
            clockFace = "sans-serif-condensed";
        }

        text.setTypeface(Typeface.create(clockFace, Typeface.NORMAL));
        text.setAntiAlias(true);
        text.setSubpixelText(true);
        text.setTextSize(size);
        text.setTextAlign(s.align);
        text.setLetterSpacing(0.015f);
        text.setStyle(Paint.Style.FILL);

        // 3D Soft Drop Shadow & Glow Aura
        text.setShadowLayer(size * 0.08f, 0, size * 0.02f, 0x50000000);

        // Background Ghost Shadow
        int ghostAlpha = Math.min(60, Color.alpha(s.clockColor) / 3);
        int ghost = (s.clockColor & 0x00ffffff) | (ghostAlpha << 24);
        text.setColor(ghost);
        c.drawText(tm, x + size * 0.015f, y + size * 0.015f, text);

        // Primary Clock Face
        if ("outline".equals(s.style)) {
            text.setStyle(Paint.Style.STROKE);
            text.setStrokeWidth(Math.max(2.0f, size * 0.035f));
            text.setColor(s.clockColor);
        } else {
            text.setStyle(Paint.Style.FILL);
            text.setColor(s.clockColor);
        }
        c.drawText(tm, x, y, text);

        text.clearShadowLayer();
        text.setLetterSpacing(0f);
        text.setStyle(Paint.Style.FILL);

        // Date Display
        float dx = s.dateX * w, dy = s.dateY * h, ds = s.dateSize * min;
        text.setTypeface(Typeface.create("sans-serif-condensed", Typeface.BOLD));
        text.setTextSize(ds);
        text.setTextAlign(s.align);
        text.setLetterSpacing(0.060f);
        text.setColor(s.dateColor);
        c.drawText(dt, dx, dy, text);
        text.setLetterSpacing(0f);

        // Graphic Accents (Glow Lines, Rings, Frames)
        shapePaint.setStyle(Paint.Style.STROKE);
        shapePaint.setStrokeWidth(Math.max(1.5f, min * 0.0028f));
        shapePaint.setColor(s.accentColor);

        if ("ring".equals(s.style)) {
            float r = min * 0.210f;
            c.drawCircle(x, y - size * 0.35f, r, shapePaint);
            c.drawCircle(x, y - size * 0.35f, r * 1.08f, shapePaint);
        } else if ("left".equals(s.style)) {
            float lineEnd = Math.min(w * 0.58f, x + min * 0.35f);
            c.drawLine(Math.max(0, x - size * 0.05f), y + min * 0.025f, lineEnd, y + min * 0.025f, shapePaint);
        } else if ("right".equals(s.style)) {
            float lineStart = Math.max(w * 0.42f, x - min * 0.35f);
            c.drawLine(lineStart, y + min * 0.025f, x + size * 0.05f, y + min * 0.025f, shapePaint);
        } else if (!"ghost".equals(s.style)) {
            float lineW = min * 0.15f;
            float lineY = dy + ds * 0.22f;
            float start = s.align == Paint.Align.RIGHT ? x - lineW : (s.align == Paint.Align.LEFT ? x : x - lineW * 0.5f);
            float end = s.align == Paint.Align.RIGHT ? x : (s.align == Paint.Align.LEFT ? x + lineW : x + lineW * 0.5f);
            c.drawLine(start, lineY, end, lineY, shapePaint);
        }
        shapePaint.setStyle(Paint.Style.FILL);
    }

    private void drawVignette(Canvas c, int w, int h) {
        shapePaint.setShader(new RadialGradient(w * 0.5f, h * 0.48f, Math.max(w, h) * 0.72f,
                0x00000000, 0x3a000000, Shader.TileMode.CLAMP));
        c.drawRect(0, 0, w, h, shapePaint);
        shapePaint.setShader(null);

        shapePaint.setShader(new LinearGradient(0, 0, 0, h, 0x06000000, 0x24000000, Shader.TileMode.CLAMP));
        c.drawRect(0, 0, w, h, shapePaint);
        shapePaint.setShader(null);
    }

    public void release() {
        if (bitmap != null && !bitmap.isRecycled()) bitmap.recycle();
        bitmap = null;
        loadedId = null;
    }
}
