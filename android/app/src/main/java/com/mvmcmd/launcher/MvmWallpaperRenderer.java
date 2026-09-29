package com.mvmcmd.launcher;

import android.content.Context;
import android.graphics.*;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class MvmWallpaperRenderer {
    private final Context context;
    private final Paint bitmapPaint = new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG|Paint.DITHER_FLAG);
    private final Paint shapePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint text = new Paint(Paint.ANTI_ALIAS_FLAG|Paint.SUBPIXEL_TEXT_FLAG);
    private final Paint mask = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final SimpleDateFormat time = new SimpleDateFormat("HH:mm", Locale.ENGLISH);
    private final SimpleDateFormat date = new SimpleDateFormat("EEE, MMM d", Locale.ENGLISH);
    private Bitmap bitmap;
    private String loadedId;

    public MvmWallpaperRenderer(Context c){ context=c.getApplicationContext(); }

    public void setSpec(MvmWallpaperCatalog.Spec s){
        if(s==null || s.id.equals(loadedId)) return;
        if(bitmap!=null && !bitmap.isRecycled()) bitmap.recycle();
        bitmap=load(context,s.asset,1800);
        loadedId=s.id;
    }

    public static Bitmap loadThumbnail(Context c,MvmWallpaperCatalog.Spec s){ return load(c,s.asset,300); }

    private static Bitmap load(Context c,String path,int maxDimension){
        BitmapFactory.Options bounds=new BitmapFactory.Options();
        bounds.inJustDecodeBounds=true;
        try(InputStream in=c.getAssets().open(path)){ BitmapFactory.decodeStream(in,null,bounds); }
        catch(Exception e){ return null; }
        int sample=1;
        while(Math.max(bounds.outWidth/sample,bounds.outHeight/sample)>maxDimension) sample*=2;
        BitmapFactory.Options opts=new BitmapFactory.Options();
        opts.inPreferredConfig=Bitmap.Config.ARGB_8888;
        opts.inSampleSize=Math.max(1,sample);
        opts.inDither=true;
        try(InputStream in=c.getAssets().open(path)){ return BitmapFactory.decodeStream(in,null,opts); }
        catch(Exception e){ return null; }
    }

    public Bitmap renderBitmap(MvmWallpaperCatalog.Spec s,int w,int h,long now){
        setSpec(s);
        Bitmap out=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);
        draw(new Canvas(out),w,h,s,0f,0f,false,now);
        return out;
    }

    public void draw(Canvas c,int w,int h,MvmWallpaperCatalog.Spec s,float tiltX,float tiltY,boolean showClock,long now){
        setSpec(s);
        if(bitmap==null||w<=0||h<=0) return;
        c.drawColor(Color.BLACK);
        float scale=Math.max(w/(float)bitmap.getWidth(),h/(float)bitmap.getHeight())*1.035f;
        float driftX=(float)Math.sin(now*.00011)*s.drift;
        float driftY=(float)Math.cos(now*.00015)*s.drift*.70f;
        float px=(tiltX*s.depth+driftX)*w*.024f;
        float py=(tiltY*s.depth+driftY)*h*.020f;
        drawCover(c,w,h,scale,px,py,255);
        drawFocusDepth(c,w,h,s,scale,tiltX,tiltY,now);
        if(showClock) drawClock(c,s,w,h,now);
        drawAtmosphere(c,s,w,h,now);
        drawVignette(c,w,h);
    }

    private void drawCover(Canvas c,int w,int h,float scale,float dx,float dy,int alpha){
        float bw=bitmap.getWidth()*scale,bh=bitmap.getHeight()*scale;
        RectF d=new RectF((w-bw)*.5f+dx,(h-bh)*.5f+dy,(w+bw)*.5f+dx,(h+bh)*.5f+dy);
        bitmapPaint.setAlpha(alpha);
        c.drawBitmap(bitmap,null,d,bitmapPaint);
        bitmapPaint.setAlpha(255);
    }

    private void drawFocusDepth(Canvas c,int w,int h,MvmWallpaperCatalog.Spec s,float base,float tx,float ty,long now){
        float fx=s.focusX*w, fy=s.focusY*h;
        float scale=base*(1f+s.depth*.10f);
        float dx=tx*Math.min(w,h)*s.depth*.045f+(float)Math.sin(now*.00020)*1.1f;
        float dy=ty*Math.min(w,h)*s.depth*.032f;
        float bw=bitmap.getWidth()*scale,bh=bitmap.getHeight()*scale;
        float left=fx-s.focusX*bitmap.getWidth()*scale+dx;
        float top=fy-s.focusY*bitmap.getHeight()*scale+dy;
        int save=c.saveLayer(0,0,w,h,null);
        bitmapPaint.setAlpha(115);
        c.drawBitmap(bitmap,null,new RectF(left,top,left+bw,top+bh),bitmapPaint);
        mask.setShader(new RadialGradient(fx,fy,Math.min(w,h)*Math.max(.28f,s.depth*2.8f),
            new int[]{0xffffffff,0xccffffff,0x00ffffff},new float[]{0f,.68f,1f},Shader.TileMode.CLAMP));
        mask.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.DST_IN));
        c.drawRect(0,0,w,h,mask);
        mask.setXfermode(null); mask.setShader(null);
        c.restoreToCount(save);
        bitmapPaint.setAlpha(255);
    }

    private void drawClock(Canvas c,MvmWallpaperCatalog.Spec s,int w,int h,long now){
        String tm=time.format(new Date(now));
        String dt=date.format(new Date(now)).toUpperCase(Locale.ENGLISH);
        float min=Math.min(w,h);
        float x=s.clockX*w, y=s.clockY*h, size=s.clockSize*min;
        String clockFace=("outline".equals(s.style)||"ghost".equals(s.style))?"sans-serif-thin":"sans-serif-condensed";
        text.setTypeface(Typeface.create(clockFace,Typeface.NORMAL));
        text.setTextSize(size);
        text.setTextAlign(s.align);
        text.setLetterSpacing(.012f);
        text.setStyle(Paint.Style.FILL);
        text.setShadowLayer(size*.055f,0,size*.018f,0x30000000);

        int ghost=(s.clockColor&0x00ffffff)|((Math.min(48,Color.alpha(s.clockColor)/4))<<24);
        text.setColor(ghost);
        c.drawText(tm,x+size*.26f,y,text);

        if("outline".equals(s.style)){
            text.setStyle(Paint.Style.STROKE);
            text.setStrokeWidth(Math.max(1.2f,size*.032f));
            text.setColor(s.clockColor);
        }else{
            text.setStyle(Paint.Style.FILL);
            text.setColor(s.clockColor);
        }
        c.drawText(tm,x,y,text);
        text.clearShadowLayer();
        text.setLetterSpacing(0f);
        text.setStyle(Paint.Style.FILL);

        float dx=s.dateX*w, dy=s.dateY*h, ds=s.dateSize*min;
        text.setTypeface(Typeface.create("sans-serif-condensed",Typeface.BOLD));
        text.setTextSize(ds);
        text.setTextAlign(s.align);
        text.setLetterSpacing(.055f);
        text.setColor(s.dateColor);
        c.drawText(dt,dx,dy,text);
        text.setLetterSpacing(0f);

        shapePaint.setStyle(Paint.Style.STROKE);
        shapePaint.setStrokeWidth(Math.max(1f,min*.0022f));
        shapePaint.setColor(s.accentColor);
        if("ring".equals(s.style)){
            float r=min*.205f;
            c.drawCircle(x,y-size*.36f,r,shapePaint);
            c.drawCircle(x,y-size*.36f,r*1.075f,shapePaint);
        }else if("left".equals(s.style)){
            float lineEnd=Math.min(w*.54f,x+min*.32f);
            c.drawLine(Math.max(0,x-size*.05f),y+min*.025f,lineEnd,y+min*.025f,shapePaint);
        }else{
            float lineW=min*.13f;
            float lineY=dy+ds*.20f;
            float start=s.align==Paint.Align.RIGHT?x-lineW: x-lineW*.5f;
            float end=s.align==Paint.Align.RIGHT?x: x+lineW*.5f;
            c.drawLine(start,lineY,end,lineY,shapePaint);
        }
        shapePaint.setStyle(Paint.Style.FILL);
    }

    private void drawAtmosphere(Canvas c,MvmWallpaperCatalog.Spec s,int w,int h,long now){
        float pulse=.5f+.5f*(float)Math.sin(now*.0017);
        int glow=s.accentColor;
        shapePaint.setShader(new RadialGradient(s.focusX*w,s.focusY*h,Math.min(w,h)*(.42f+pulse*.015f),
            (glow&0x55ffffff)|(0x18<<24),0x00000000,Shader.TileMode.CLAMP));
        c.drawCircle(s.focusX*w,s.focusY*h,Math.min(w,h)*.43f,shapePaint);
        shapePaint.setShader(null);
    }

    private void drawVignette(Canvas c,int w,int h){
        shapePaint.setShader(new RadialGradient(w*.5f,h*.48f,Math.max(w,h)*.72f,
            0x00000000,0x52000000,Shader.TileMode.CLAMP));
        c.drawRect(0,0,w,h,shapePaint);
        shapePaint.setShader(null);
        shapePaint.setShader(new LinearGradient(0,0,0,h,0x08000000,0x2e000000,Shader.TileMode.CLAMP));
        c.drawRect(0,0,w,h,shapePaint);
        shapePaint.setShader(null);
    }

    public void release(){
        if(bitmap!=null&&!bitmap.isRecycled()) bitmap.recycle();
        bitmap=null; loadedId=null;
    }
}