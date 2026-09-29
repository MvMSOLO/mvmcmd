package com.mvmcmd.launcher;

import android.app.WallpaperManager;
import android.hardware.SensorManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.*;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MvmWallpaperActivity extends AppCompatActivity {
    static final int HOME=0,LOCK=1;
    final ExecutorService exec=Executors.newSingleThreadExecutor();
    MvmWallpaperRenderer renderer; MvmWallpaperCatalog.Spec selected; int mode=HOME;
    MvmWallpaperPreview preview; LinearLayout gallery; TextView homeTab,lockTab,title,meta,action;

    @Override protected void onCreate(@Nullable Bundle b){super.onCreate(b);getWindow().setStatusBarColor(0xff08090b);getWindow().setNavigationBarColor(0xff08090b);renderer=new MvmWallpaperRenderer(this);selected=MvmWallpaperCatalog.all().get(0);build();}
    void build(){
        ScrollView scroll=new ScrollView(this);scroll.setBackgroundColor(0xff08090b);
        LinearLayout page=new LinearLayout(this);page.setOrientation(LinearLayout.VERTICAL);page.setPadding(dp(14),dp(10),dp(14),dp(22));scroll.addView(page);
        LinearLayout head=row();
        TextView back=label("‹",34,true);back.setGravity(Gravity.CENTER);back.setOnClickListener(v->finish());head.addView(back,box(48,48));
        LinearLayout tb=col();tb.setPadding(dp(8),0,0,0);TextView k=label("MVMCMD · 3D WALLPAPER",9,true);k.setTextColor(0xa8a8afb9);TextView t=label("WALLPAPER",21,true);tb.addView(k);tb.addView(t);head.addView(tb,weight(48,1));page.addView(head);
        TextView hint=label("17 scenes · sensor parallax · live clock / date",10,false);hint.setTextColor(0xff737985);hint.setPadding(dp(56),0,0,dp(10));page.addView(hint);
        preview=new MvmWallpaperPreview(this);preview.setSpec(selected);page.addView(preview,new LinearLayout.LayoutParams(-1,previewHeight()));
        LinearLayout tabs=row();tabs.setPadding(0,dp(10),0,dp(6));homeTab=tab("HOME · LIVE 3D");lockTab=tab("LOCK · SYSTEM CLOCK");tabs.addView(homeTab,weight(48,1));tabs.addView(lockTab,weight(48,1));page.addView(tabs);
        title=label(selected.title,24,true);title.setPadding(0,dp(4),0,0);page.addView(title);
        meta=label(metaText(),10,false);meta.setTextColor(0xff9097a3);meta.setPadding(0,dp(4),0,dp(10));page.addView(meta);
        action=primary("SET HOME WALLPAPER");action.setOnClickListener(v->setSelected());page.addView(action,new LinearLayout.LayoutParams(-1,dp(52)));
        TextView ex=label("EXAMPLES",10,true);ex.setTextColor(0xffaeb4bf);ex.setPadding(0,dp(18),0,dp(8));page.addView(ex);
        HorizontalScrollView hsv=new HorizontalScrollView(this);hsv.setHorizontalScrollBarEnabled(false);gallery=new LinearLayout(this);hsv.addView(gallery);page.addView(hsv,new LinearLayout.LayoutParams(-1,dp(236)));populate();
        selectMode(HOME);setContentView(scroll);
    }
    void populate(){gallery.removeAllViews();for(MvmWallpaperCatalog.Spec s:MvmWallpaperCatalog.all()){LinearLayout card=col();card.setPadding(dp(3),dp(3),dp(3),dp(3));card.setBackground(round(0x141c2027,18,0x264a505a));card.setOnClickListener(v->select(s));ImageView img=new ImageView(this);img.setScaleType(ImageView.ScaleType.CENTER_CROP);Bitmap bm=MvmWallpaperRenderer.loadThumbnail(this,s);if(bm!=null)img.setImageBitmap(bm);card.addView(img,new LinearLayout.LayoutParams(dp(126),dp(184)));TextView n=label(s.title,9,true);n.setGravity(Gravity.CENTER);card.addView(n,new LinearLayout.LayoutParams(dp(126),dp(36)));LinearLayout.LayoutParams gp=new LinearLayout.LayoutParams(dp(132),dp(230)); gp.setMargins(dp(4),0,dp(4),0); gallery.addView(card,gp);}}
    void select(MvmWallpaperCatalog.Spec s){selected=s;preview.setSpec(s);preview.invalidate();title.setText(s.title);meta.setText(metaText());}
    void selectMode(int m){mode=m;preview.showClock=m==HOME;preview.invalidate();homeTab.setTextColor(m==HOME?0xff090b0e:0xffb6bdc7);lockTab.setTextColor(m==LOCK?0xff090b0e:0xffb6bdc7);homeTab.setBackground(round(m==HOME?0xffeef2f4:0x1affffff,14,0));lockTab.setBackground(round(m==LOCK?0xffeef2f4:0x1affffff,14,0));action.setText(m==HOME?"SET HOME WALLPAPER":"SET LOCK WALLPAPER");meta.setText(metaText());}
    String metaText(){return mode==HOME?"HOME · LIVE SENSOR PARALLAX · REAL-TIME CLOCK / DATE":"LOCK · STATIC IMAGE · YOUR PHONE'S DEFAULT LOCK CLOCK STAYS ON TOP";}
    void setSelected(){
        if(mode==HOME){
            getSharedPreferences(MvmHomeWallpaperService.PREFS,MODE_PRIVATE).edit().putString(MvmHomeWallpaperService.KEY_SELECTED,selected.id).apply();
            try{Intent i=new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);i.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,new ComponentName(this,MvmHomeWallpaperService.class));startActivity(i);}
            catch(Exception e){toast("Live wallpaper preview unavailable");}
            return;
        }
        action.setEnabled(false);action.setAlpha(.6f);final MvmWallpaperCatalog.Spec s=selected;
        exec.execute(()->{Bitmap bm=null;try{bm=renderer.renderBitmap(s,1080,1920,System.currentTimeMillis());WallpaperManager.getInstance(this).setBitmap(bm,null,true,WallpaperManager.FLAG_LOCK);Bitmap done=bm;runOnUiThread(()->{action.setEnabled(true);action.setAlpha(1f);toast("LOCK WALLPAPER SET · system clock stays native");done.recycle();});}catch(Exception e){if(bm!=null&&!bm.isRecycled())bm.recycle();runOnUiThread(()->{action.setEnabled(true);action.setAlpha(1f);toast("Could not set lock wallpaper");});}});
    }
    TextView tab(String s){TextView v=label(s,10,true);v.setGravity(Gravity.CENTER);v.setOnClickListener(x->selectMode(x==homeTab?HOME:LOCK));return v;}
    TextView primary(String s){TextView v=label(s,11,true);v.setGravity(Gravity.CENTER);v.setTextColor(0xff0a0b0d);v.setBackground(round(0xfff1f3f5,16,0));return v;}
    TextView label(String s,float z,boolean b){TextView v=new TextView(this);v.setText(s);v.setTextColor(0xfff1f3f5);v.setTextSize(z);v.setTypeface(android.graphics.Typeface.DEFAULT,b?1:0);return v;}
    LinearLayout row(){LinearLayout l=new LinearLayout(this);l.setGravity(Gravity.CENTER_VERTICAL);return l;} LinearLayout col(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);return l;}
    LinearLayout.LayoutParams box(int w,int h){return new LinearLayout.LayoutParams(dp(w),dp(h));}
    LinearLayout.LayoutParams weight(int margin,int h){LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(h),1f);p.setMargins(dp(margin),0,0,0);return p;}
    GradientDrawable round(int color,int radius,int stroke){GradientDrawable d=new GradientDrawable();d.setColor(color);if(stroke!=0)d.setStroke(dp(1),stroke);d.setCornerRadius(dp(radius));return d;}
    int previewHeight(){int h=getResources().getDisplayMetrics().heightPixels;return Math.min(dp(610),Math.max(dp(440),Math.round(h*.57f)));}int dp(int x){return Math.round(x*getResources().getDisplayMetrics().density);}
    void toast(String s){Toast.makeText(this,s,Toast.LENGTH_SHORT).show();}
    @Override protected void onDestroy(){exec.shutdownNow();if(preview!=null)preview.stopSensors();super.onDestroy();}

    final class MvmWallpaperPreview extends View implements android.hardware.SensorEventListener {
        final MvmWallpaperRenderer r=new MvmWallpaperRenderer(MvmWallpaperActivity.this);final android.hardware.SensorManager sm=(android.hardware.SensorManager)getSystemService(Context.SENSOR_SERVICE);final android.hardware.Sensor rot=sm==null?null:sm.getDefaultSensor(android.hardware.Sensor.TYPE_ROTATION_VECTOR);final android.hardware.Sensor acc=sm==null?null:sm.getDefaultSensor(android.hardware.Sensor.TYPE_ACCELEROMETER);
        float tx,ty,sx,sy;boolean showClock=true;MvmWallpaperCatalog.Spec spec;final Runnable tick=new Runnable(){public void run(){invalidate();postDelayed(this,33);}};
        MvmWallpaperPreview(Context c){super(c);setLayerType(View.LAYER_TYPE_SOFTWARE,null);}
        void setSpec(MvmWallpaperCatalog.Spec s){spec=s;r.setSpec(s);}
        @Override protected void onAttachedToWindow(){super.onAttachedToWindow();startSensors();post(tick);}
        @Override protected void onDetachedFromWindow(){stopSensors();removeCallbacks(tick);super.onDetachedFromWindow();}
        void startSensors(){if(sm==null)return;if(rot!=null)sm.registerListener(this,rot,SensorManager.SENSOR_DELAY_GAME);else if(acc!=null)sm.registerListener(this,acc,SensorManager.SENSOR_DELAY_GAME);}
        void stopSensors(){if(sm!=null)sm.unregisterListener(this);}
        @Override protected void onDraw(android.graphics.Canvas c){if(spec==null)return;sx+=(tx-sx)*.16f;sy+=(ty-sy)*.16f;r.draw(c,getWidth(),getHeight(),spec,sx,sy,showClock,System.currentTimeMillis());}
        @Override public void onSensorChanged(android.hardware.SensorEvent e){if(e.sensor.getType()==android.hardware.Sensor.TYPE_ROTATION_VECTOR){float[] m=new float[9],o=new float[3];SensorManager.getRotationMatrixFromVector(m,e.values);SensorManager.getOrientation(m,o);tx=clamp(o[2]/.7f);ty=clamp(o[1]/.85f);}else{tx=clamp(e.values[0]/9.8f);ty=clamp(e.values[1]/-9.8f);}}
        @Override public void onAccuracyChanged(android.hardware.Sensor s,int a){}float clamp(float v){return Math.max(-1f,Math.min(1f,v));}
    }
}
