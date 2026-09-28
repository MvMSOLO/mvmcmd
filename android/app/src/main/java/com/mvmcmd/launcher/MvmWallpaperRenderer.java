package com.mvmcmd.launcher;

import android.content.Context;
import android.graphics.*;
import java.io.InputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class MvmWallpaperRenderer {
    private final Context context;
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG|Paint.DITHER_FLAG);
    private final Paint text = new Paint(Paint.ANTI_ALIAS_FLAG|Paint.SUBPIXEL_TEXT_FLAG);
    private final Paint mask = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final SimpleDateFormat time = new SimpleDateFormat("HH:mm",Locale.ENGLISH);
    private final SimpleDateFormat date = new SimpleDateFormat("EEE, MMM d",Locale.ENGLISH);
    private Bitmap bitmap; private String loadedId;

    public MvmWallpaperRenderer(Context c){ context=c.getApplicationContext(); }

    public void setSpec(MvmWallpaperCatalog.Spec s){
        if(s==null || s.id.equals(loadedId)) return;
        if(bitmap!=null) bitmap.recycle();
        bitmap=load(context,s.asset,false); loadedId=s.id;
    }

    public static Bitmap loadThumbnail(Context c,MvmWallpaperCatalog.Spec s){ return load(c,s.asset,true); }

    private static Bitmap load(Context c,String path,boolean thumb){
        BitmapFactory.Options o=new BitmapFactory.Options();
        o.inPreferredConfig=Bitmap.Config.RGB_565; o.inDither=true;
        if(thumb) o.inSampleSize=2;
        try(InputStream in=c.getAssets().open(path)){ return BitmapFactory.decodeStream(in,null,o); }
        catch(IOException e){ return null; }
    }

    public Bitmap renderBitmap(MvmWallpaperCatalog.Spec s,int w,int h,long now){
        setSpec(s); Bitmap out=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);
        draw(new Canvas(out),w,h,s,0f,0f,false,now); return out;
    }

    public void draw(Canvas c,int w,int h,MvmWallpaperCatalog.Spec s,float tiltX,float tiltY,boolean showClock,long now){
        setSpec(s); if(bitmap==null||w<=0||h<=0) return;
        float scale=Math.max(w/(float)bitmap.getWidth(),h/(float)bitmap.getHeight())*1.055f;
        float slowX=(float)Math.sin(now*.00013)*s.drift, slowY=(float)Math.cos(now*.00017)*s.drift*.72f;
        float tx=tiltX*s.depth+slowX, ty=tiltY*s.depth+slowY;
        c.drawColor(Color.BLACK); cover(c,w,h,scale,tx*w*.030f,ty*h*.022f,1f);
        if(showClock) drawClock(c,s,w,h,now);
        focusLayer(c,s,w,h,scale,tiltX,tiltY,now);
        atmosphere(c,s,w,h,now,tiltX,tiltY);
        vignette(c,w,h);
    }

    private void cover(Canvas c,int w,int h,float scale,float dx,float dy,float alpha){
        float bw=bitmap.getWidth()*scale,bh=bitmap.getHeight()*scale;
        RectF d=new RectF((w-bw)*.5f+dx,(h-bh)*.5f+dy,(w+bw)*.5f+dx,(h+bh)*.5f+dy);
        paint.setAlpha((int)(255*alpha)); c.drawBitmap(bitmap,null,d,paint); paint.setAlpha(255);
    }

    private void focusLayer(Canvas c,MvmWallpaperCatalog.Spec s,int w,int h,float base,float tiltX,float tiltY,long now){
        float fx=s.focusX*w,fy=s.focusY*h,r=Math.min(w,h)*s.focusRadius;
        float zoom=1f+s.depth*.085f, scale=base*zoom;
        float sx=tiltX*Math.min(w,h)*s.depth*.03f, sy=tiltY*Math.min(w,h)*s.depth*.024f;
        float bw=bitmap.getWidth()*scale,bh=bitmap.getHeight()*scale;
        float left=fx-s.focusX*bitmap.getWidth()*scale+sx+(float)Math.sin(now*.0002)*1.4f;
        float top=fy-s.focusY*bitmap.getHeight()*scale+sy;
        int save=c.saveLayer(0,0,w,h,null);
        paint.setAlpha(238); c.drawBitmap(bitmap,null,new RectF(left,top,left+bw,top+bh),paint);
        mask.setShader(new RadialGradient(fx,fy,r,new int[]{0xffffffff,0xe6ffffff,0x00ffffff},new float[]{0,.68f,1f},Shader.TileMode.CLAMP));
        mask.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.DST_IN));
        c.drawCircle(fx,fy,r,mask); mask.setXfermode(null); mask.setShader(null);
        c.restoreToCount(save);
        paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(Math.max(1f,w*.0017f)); paint.setColor(0x30ffffff);
        c.drawCircle(fx-sx*.3f,fy-sy*.3f,r*.98f,paint); paint.setStyle(Paint.Style.FILL);
    }

    private void drawClock(Canvas c,MvmWallpaperCatalog.Spec s,int w,int h,long now){
        String tm=time.format(new Date(now)), dt=date.format(new Date(now));
        switch(s.style){
            case "cat":
                giantFill(c,tm,w*.50f,h*.50f,w*.17f,0xd5161315,Paint.Align.CENTER);
                smallDate(c,dt.toUpperCase(Locale.ENGLISH),w*.50f,h*.27f,w*.030f,0xe5ffffff,Paint.Align.CENTER); break;
            case "spider":
                giantOutline(c,tm,w*.50f,h*.48f,w*.18f,0xb8200e14);
                smallDate(c,dt,w*.50f,h*.26f,w*.030f,0xeaffdddd,Paint.Align.CENTER); break;
            case "bmw":
                giantFill(c,tm,w*.18f,h*.62f,w*.095f,0xdfeef3f4,Paint.Align.LEFT);
                smallDate(c,dt.toUpperCase(Locale.ENGLISH),w*.13f,h*.48f,w*.026f,0xd8ffffff,Paint.Align.LEFT);
                line(c,w*.13f,h*.66f,w*.42f,0x8affffff); break;
            case "p1":
                giantFill(c,tm,w*.16f,h*.75f,w*.10f,0xcdeef0f2,Paint.Align.LEFT);
                smallDate(c,dt.toUpperCase(Locale.ENGLISH),w*.12f,h*.64f,w*.027f,0xd8ffffff,Paint.Align.LEFT); break;
            case "ronin":
                giantOutline(c,tm,w*.50f,h*.79f,w*.17f,0xe65d0b16);
                smallDate(c,dt.toUpperCase(Locale.ENGLISH),w*.50f,h*.67f,w*.028f,0xe8ffd2d2,Paint.Align.CENTER); break;
            case "batman":
                giantOutline(c,tm,w*.80f,h*.49f,w*.14f,0xcbe9eff2);
                smallDate(c,dt.toUpperCase(Locale.ENGLISH),w*.12f,h*.15f,w*.028f,0xe5ffffff,Paint.Align.LEFT); break;
            case "creek":
                giantOutline(c,tm,w*.83f,h*.53f,w*.13f,0xb4cfe9ef);
                smallDate(c,dt.toUpperCase(Locale.ENGLISH),w*.13f,h*.17f,w*.027f,0xe6ffffff,Paint.Align.LEFT); break;
            case "alps":
                giantOutline(c,tm,w*.50f,h*.70f,w*.15f,0xaeeff7ff);
                smallDate(c,dt.toUpperCase(Locale.ENGLISH),w*.50f,h*.57f,w*.028f,0xe9ffffff,Paint.Align.CENTER); break;
            case "field":
                giantOutline(c,tm,w*.50f,h*.70f,w*.15f,0xa9f1d6a5);
                smallDate(c,dt.toUpperCase(Locale.ENGLISH),w*.50f,h*.57f,w*.028f,0xe6fff0e2,Paint.Align.CENTER); break;
            case "tree":
                smallDate(c,dt.toUpperCase(Locale.ENGLISH),w*.12f,h*.17f,w*.027f,0xdff0fbff,Paint.Align.LEFT);
                giantFill(c,tm,w*.50f,h*.58f,w*.15f,0xc9182636,Paint.Align.CENTER); break;
            case "garden":
                smallDate(c,dt,w*.50f,h*.25f,w*.035f,0xe8ffffff,Paint.Align.CENTER);
                giantFill(c,tm,w*.50f,h*.39f,w*.15f,0xd51a1712,Paint.Align.CENTER); break;
            case "grove":
                giantOutline(c,tm,w*.76f,h*.44f,w*.14f,0xc9212b1e);
                smallDate(c,dt.toUpperCase(Locale.ENGLISH),w*.77f,h*.30f,w*.027f,0xddeaf4dd,Paint.Align.CENTER); break;
            case "orbital":
                ringClock(c,tm,dt,w,h); break;
            case "amber":
                ringClock(c,tm,dt,w,h); break;
            case "ribbon":
                giantFill(c,tm,w*.57f,h*.52f,w*.14f,0xccecf7ff,Paint.Align.CENTER);
                smallDate(c,dt.toUpperCase(Locale.ENGLISH),w*.57f,h*.61f,w*.028f,0xccd9efff,Paint.Align.CENTER); break;
            case "anime":
                giantFill(c,tm,w*.73f,h*.25f,w*.135f,0xe8fff2f1,Paint.Align.CENTER);
                smallDate(c,dt.toUpperCase(Locale.ENGLISH),w*.73f,h*.35f,w*.027f,0xe5ffb5b0,Paint.Align.CENTER); break;
            case "space":
                giantFill(c,tm,w*.20f,h*.52f,w*.14f,0xc9dcecff,Paint.Align.LEFT);
                smallDate(c,dt.toUpperCase(Locale.ENGLISH),w*.80f,h*.22f,w*.027f,0xdbeffffff,Paint.Align.CENTER); break;
            default:
                giantFill(c,tm,w*.50f,h*.36f,w*.15f,0xddffffff,Paint.Align.CENTER);
                smallDate(c,dt,w*.50f,h*.22f,w*.030f,0xe5ffffff,Paint.Align.CENTER);
        }
    }

    private void ringClock(Canvas c,String tm,String dt,int w,int h){
        float cx=w*.50f,cy=h*.45f,r=Math.min(w,h)*.24f;
        paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(w*.0042f);paint.setColor(0x70ffe8a3);c.drawCircle(cx,cy,r,paint);
        paint.setColor(0x2affffff);paint.setStrokeWidth(w*.0015f);c.drawCircle(cx,cy,r*1.09f,paint);paint.setStyle(Paint.Style.FILL);
        giantFill(c,tm,cx,cy+w*.035f,w*.125f,0xf4fff5dd,Paint.Align.CENTER);
        smallDate(c,dt.toUpperCase(Locale.ENGLISH),cx,cy+r*.75f,w*.026f,0xf4ffe1a8,Paint.Align.CENTER);
    }

    private void giantFill(Canvas c,String s,float x,float baseline,float size,int color,Paint.Align align){
        text.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL));text.setStyle(Paint.Style.FILL);text.setColor(color);text.setTextSize(size);text.setTextAlign(align);
        text.setShadowLayer(size*.08f,0,size*.035f,0x36000000);c.drawText(s,x,baseline,text);text.clearShadowLayer();
    }
    private void giantOutline(Canvas c,String s,float x,float baseline,float size,int color){
        text.setTypeface(Typeface.create("sans-serif-thin",Typeface.NORMAL));text.setTextSize(size);text.setTextAlign(Paint.Align.CENTER);text.setStyle(Paint.Style.STROKE);text.setStrokeWidth(Math.max(1.5f,size*.048f));text.setColor(color);text.setShadowLayer(size*.035f,0,0,color);c.drawText(s,x,baseline,text);text.clearShadowLayer();text.setStyle(Paint.Style.FILL);
    }
    private void smallDate(Canvas c,String s,float x,float baseline,float size,int color,Paint.Align align){
        text.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));text.setTextSize(size);text.setTextAlign(align);text.setLetterSpacing(.06f);text.setStyle(Paint.Style.FILL);text.setColor(color);c.drawText(s,x,baseline,text);text.setLetterSpacing(0f);
    }
    private void line(Canvas c,float x1,float y,float x2,int color){paint.setColor(color);paint.setStrokeWidth(Math.max(1f,c.getWidth()*.0024f));c.drawLine(x1,y,x2,y,paint);}

    private void atmosphere(Canvas c,MvmWallpaperCatalog.Spec s,int w,int h,long now,float tx,float ty){
        float pulse=.5f+.5f*(float)Math.sin(now*.0021),cx=s.focusX*w-tx*18,cy=s.focusY*h-ty*18;
        int glow=0x16ffffff;
        if(s.style.equals("cat")||s.style.equals("creek")) glow=0x1637e9ff;
        if(s.style.equals("ronin")||s.style.equals("anime")||s.style.equals("spider")) glow=0x19ff2533;
        if(s.style.equals("amber")||s.style.equals("orbital")) glow=0x19ffe4a1;
        paint.setShader(new RadialGradient(cx,cy,Math.min(w,h)*.50f,glow,0,Shader.TileMode.CLAMP));c.drawCircle(cx,cy,Math.min(w,h)*(.42f+pulse*.02f),paint);paint.setShader(null);
        if(s.style.equals("space")||s.style.equals("tree")||s.style.equals("field")){for(int i=0;i<10;i++){float px=(i*97.31f+13.7f)%w,py=(i*173.17f+31.2f)%(h*.72f),a=.12f+.10f*(float)Math.sin(now*.0014+i);paint.setColor((Math.round(a*255)<<24)|0x00ffffff);c.drawCircle(px,py,1f+(i%3)*.5f,paint);}}
    }
    private void vignette(Canvas c,int w,int h){paint.setShader(new LinearGradient(0,0,0,h,0x12000000,0x42000000,Shader.TileMode.CLAMP));c.drawRect(0,0,w,h,paint);paint.setShader(null);}
}
