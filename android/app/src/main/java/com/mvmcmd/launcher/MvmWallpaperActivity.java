package com.mvmcmd.launcher;

import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Typeface;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.graphics.drawable.GradientDrawable;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MvmWallpaperActivity extends AppCompatActivity {
    static final int HOME=0, LOCK=1;

    final ExecutorService exec=Executors.newSingleThreadExecutor();
    final List<View> cards=new ArrayList<>();
    MvmWallpaperRenderer renderer;
    MvmWallpaperCatalog.Spec selected;
    int mode=HOME;

    MvmWallpaperPreview preview;
    LinearLayout gallery;
    TextView homeTab,lockTab,title,subtitle,modeBadge,action;

    @Override protected void onCreate(@Nullable Bundle b){
        super.onCreate(b);
        MvmUiKit.applyWindow(this);
        renderer=new MvmWallpaperRenderer(this);
        selected=MvmWallpaperCatalog.all().get(0);
        build();
    }

    void build(){
        ScrollView scroll=new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(MvmUiKit.BG);

        LinearLayout page=col();
        page.setPadding(dp(14),dp(10),dp(14),dp(24));
        scroll.addView(page);

        LinearLayout head=row();
        TextView back=label("‹",34,Typeface.NORMAL);
        back.setGravity(Gravity.CENTER);
        back.setOnClickListener(v->finish());
        head.addView(back,box(46,46));

        LinearLayout htxt=col();
        htxt.setPadding(dp(10),0,0,0);
        TextView over=label("MVMCMD  /  ORIGINAL WALLPAPERS",10,Typeface.BOLD);
        over.setTextColor(0xff8c939f);
        TextView h=label("WALLPAPER",27,Typeface.BOLD);
        h.setTextColor(0xfff3f4f6);
        htxt.addView(over);
        htxt.addView(h);
        head.addView(htxt,weight(46,1));
        page.addView(head);

        TextView intro=label("17 real scenes  ·  depth parallax  ·  live time  ·  native lock clock",11,Typeface.NORMAL);
        intro.setTextColor(0xff737a86);
        intro.setPadding(dp(56),0,0,dp(12));
        page.addView(intro);

        FrameLayout previewFrame=new FrameLayout(this);
        preview=new MvmWallpaperPreview(this);
        preview.setSpec(selected);
        preview.setLive(true);
        previewFrame.addView(preview,new FrameLayout.LayoutParams(-1,previewHeight()));

        modeBadge=label("HOME  /  LIVE 3D",10,Typeface.BOLD);
        modeBadge.setGravity(Gravity.CENTER);
        modeBadge.setTextColor(0xffe8ebef);
        GradientDrawable badgeBg=MvmUiKit.stroke(this,0xC50A0E14,16,0x66505C6D);
        modeBadge.setBackground(badgeBg);
        FrameLayout.LayoutParams bp=new FrameLayout.LayoutParams(dp(138),dp(34),Gravity.TOP|Gravity.END);
        bp.setMargins(0,dp(12),dp(12),0);
        previewFrame.addView(modeBadge,bp);
        page.addView(previewFrame);

        LinearLayout tabs=row();
        tabs.setPadding(0,dp(10),0,dp(8));
        homeTab=tab("HOME  ·  LIVE");
        lockTab=tab("LOCK  ·  NATIVE CLOCK");
        tabs.addView(homeTab,weight(48,1));
        tabs.addView(lockTab,weight(48,1));
        page.addView(tabs);

        title=label(selected.title,26,Typeface.BOLD);
        title.setTextColor(0xfff4f5f6);
        title.setPadding(0,dp(4),0,0);
        page.addView(title);

        subtitle=label(sceneSubtitle(selected),11,Typeface.NORMAL);
        subtitle.setTextColor(0xff9299a4);
        subtitle.setPadding(0,dp(4),0,dp(10));
        page.addView(subtitle);

        LinearLayout chips=row();
        chips.addView(chip("ORIGINAL 17"));
        chips.addView(chip("PARALLAX"),new LinearLayout.LayoutParams(-2,dp(30)));
        chips.addView(chip("LIVE TIME"),new LinearLayout.LayoutParams(-2,dp(30)));
        page.addView(chips);

        action=button("SET HOME WALLPAPER");
        action.setOnClickListener(v->setSelected());
        LinearLayout.LayoutParams ap=new LinearLayout.LayoutParams(-1,dp(54));
        ap.setMargins(0,dp(12),0,dp(2));
        page.addView(action,ap);

        TextView note=label("HOME uses the live wallpaper engine. LOCK is a static image, so your phone keeps its own lock-screen clock.",10,Typeface.NORMAL);
        note.setTextColor(0xff656d78);
        note.setPadding(0,dp(5),0,dp(8));
        page.addView(note);

        TextView ex=label("SCENES",11,Typeface.BOLD);
        ex.setTextColor(0xffaeb5bf);
        ex.setPadding(0,dp(16),0,dp(8));
        page.addView(ex);

        HorizontalScrollView hsv=new HorizontalScrollView(this);
        hsv.setHorizontalScrollBarEnabled(false);
        gallery=row();
        hsv.addView(gallery);
        page.addView(hsv,new LinearLayout.LayoutParams(-1,dp(228)));
        populate();

        selectMode(HOME);
        setContentView(scroll);
    }

    void populate(){
        gallery.removeAllViews();
        cards.clear();
        for(MvmWallpaperCatalog.Spec s:MvmWallpaperCatalog.all()){
            LinearLayout card=col();
            card.setTag(s.id);
            card.setPadding(dp(4),dp(4),dp(4),dp(4));
            ImageView img=new ImageView(this);
            img.setScaleType(ImageView.ScaleType.CENTER_CROP);
            Bitmap bm=MvmWallpaperRenderer.loadThumbnail(this,s);
            if(bm!=null) img.setImageBitmap(bm);
            card.addView(img,new LinearLayout.LayoutParams(dp(132),dp(180)));
            TextView n=label(s.title,10,Typeface.BOLD);
            n.setGravity(Gravity.CENTER);
            n.setTextColor(0xffe6e9ed);
            card.addView(n,new LinearLayout.LayoutParams(dp(132),dp(34)));
            card.setOnClickListener(v->select(s));
            LinearLayout.LayoutParams cp=new LinearLayout.LayoutParams(dp(140),dp(224));
            cp.setMargins(dp(3),0,dp(3),0);
            gallery.addView(card,cp);
            cards.add(card);
        }
        refreshCards();
    }

    void select(MvmWallpaperCatalog.Spec s){
        selected=s;
        preview.setSpec(s);
        preview.invalidate();
        title.setText(s.title);
        subtitle.setText(sceneSubtitle(s));
        refreshCards();
    }

    void refreshCards(){
        for(View v:cards){
            boolean hit=selected!=null&&selected.id.equals(v.getTag());
            v.setBackground(MvmUiKit.stroke(this,hit?0x34485A36:0x12182028,17,hit?MvmUiKit.ACCENT:0x333B4554));
        }
    }

    void selectMode(int m){
        mode=m;
        boolean home=m==HOME;
        preview.showClock=home;
        preview.setLive(home);
        modeBadge.setText(home?"HOME  /  LIVE 3D":"LOCK  /  SYSTEM CLOCK");
        homeTab.setTextColor(home?0xff080a0d:0xffaeb5bf);
        lockTab.setTextColor(home?0xffaeb5bf:0xff080a0d);
        homeTab.setBackground(round(home?0xffeef2f4:0x17171c22,15,home?0:0x26313c));
        lockTab.setBackground(round(home?0x171c22:0xffeef2f4,15,home?0x26313c:0));
        action.setText(home?"SET HOME WALLPAPER":"SET LOCK WALLPAPER");
        preview.invalidate();
    }

    String sceneSubtitle(MvmWallpaperCatalog.Spec s){
        return "Scene-tuned clock  ·  "+s.style.toUpperCase()+" depth profile  ·  real asset";
    }

    void setSelected(){
        if(mode==HOME){
            getSharedPreferences(MvmHomeWallpaperService.PREFS,MODE_PRIVATE).edit()
                .putString(MvmHomeWallpaperService.KEY_SELECTED,selected.id).apply();
            try{
                Intent i=new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
                i.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                    new ComponentName(this,MvmHomeWallpaperService.class));
                startActivity(i);
            }catch(Exception e){
                toast("Android live wallpaper screen could not be opened");
            }
            return;
        }

        action.setEnabled(false);
        action.setAlpha(.62f);
        final MvmWallpaperCatalog.Spec s=selected;
        exec.execute(()->{
            Bitmap bm=null;
            try{
                DisplayMetrics dm=getResources().getDisplayMetrics();
                int w=Math.max(720,dm.widthPixels);
                int h=Math.max(1280,dm.heightPixels);
                float scale=Math.min(1f,1440f/w);
                w=Math.round(w*scale);
                h=Math.round(h*scale);
                bm=renderer.renderBitmap(s,w,h,System.currentTimeMillis());
                WallpaperManager wm=WallpaperManager.getInstance(this);
                if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.N){
                    wm.setBitmap(bm,null,true,WallpaperManager.FLAG_LOCK);
                }else{
                    wm.setBitmap(bm);
                }
                runOnUiThread(()->{
                    action.setEnabled(true);
                    action.setAlpha(1f);
                    toast("LOCK wallpaper set · native lock clock is untouched");
                });
            }catch(Exception e){
                if(bm!=null&&!bm.isRecycled())bm.recycle();
                runOnUiThread(()->{
                    action.setEnabled(true);
                    action.setAlpha(1f);
                    toast("Could not set lock wallpaper");
                });
            }
        });
    }

    TextView tab(String s){
        TextView v=MvmUiKit.text(this,s,10,MvmUiKit.FG,true);
        v.setGravity(Gravity.CENTER);
        v.setOnClickListener(x->selectMode(x==homeTab?HOME:LOCK));
        return v;
    }

    TextView chip(String s){
        TextView v=label(s,9,Typeface.BOLD);
        v.setGravity(Gravity.CENTER);
        v.setTextColor(0xffbfc6cf);
        v.setPadding(dp(11),0,dp(11),0);
        v.setBackground(MvmUiKit.stroke(this,0x171C24,15,0x33414C5D));
        MvmUiKit.installPress(v);
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-2,dp(30));
        p.setMargins(0,0,dp(7),0);
        v.setLayoutParams(p);
        return v;
    }

    TextView button(String s){
        TextView v=MvmUiKit.text(this,s,12,MvmUiKit.BG,true);
        v.setGravity(Gravity.CENTER);
        v.setBackground(MvmUiKit.surface(this,MvmUiKit.ACCENT,17));
        MvmUiKit.installPress(v);
        return v;
    }

    TextView label(String s,float size,int style){
        TextView v=new TextView(this);
        v.setText(s);
        v.setTextColor(0xfff3f4f6);
        v.setTextSize(size);
        v.setTypeface(Typeface.create("sans-serif",style));
        return v;
    }

    LinearLayout row(){ LinearLayout l=new LinearLayout(this); l.setGravity(Gravity.CENTER_VERTICAL); return l; }
    LinearLayout col(){ LinearLayout l=new LinearLayout(this); l.setOrientation(LinearLayout.VERTICAL); return l; }
    LinearLayout.LayoutParams box(int w,int h){ return new LinearLayout.LayoutParams(dp(w),dp(h)); }
    LinearLayout.LayoutParams weight(int h,int dummy){ return new LinearLayout.LayoutParams(0,dp(h),1f); }
    GradientDrawable round(int color,int radius,int stroke){
        GradientDrawable d=new GradientDrawable();
        d.setColor(color);
        if(stroke!=0) d.setStroke(dp(1),stroke);
        d.setCornerRadius(dp(radius));
        return d;
    }
    int previewHeight(){
        int w=getResources().getDisplayMetrics().widthPixels-dp(32);
        return Math.min(dp(660),Math.max(dp(520),Math.round(w*16f/9f)));
    }
    int dp(int x){ return Math.round(x*getResources().getDisplayMetrics().density); }
    void toast(String s){ android.widget.Toast.makeText(this,s,android.widget.Toast.LENGTH_SHORT).show(); }

    final class MvmWallpaperPreview extends View implements SensorEventListener {
        final MvmWallpaperRenderer r=new MvmWallpaperRenderer(MvmWallpaperActivity.this);
        final SensorManager sm=(SensorManager)getSystemService(Context.SENSOR_SERVICE);
        final Sensor rot=sm==null?null:sm.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        final Sensor acc=sm==null?null:sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        float tx,ty,sx,sy;
        boolean showClock=true,live=true;
        MvmWallpaperCatalog.Spec spec;
        final Runnable tick=new Runnable(){ public void run(){ invalidate(); postDelayed(this,45); } };

        MvmWallpaperPreview(Context c){
            super(c);
            setBackgroundColor(0xff0c0e12);
            setClipToOutline(true);
            setOutlineProvider(new ViewOutlineProviderCompat(dp(20)));
        }

        void setSpec(MvmWallpaperCatalog.Spec s){ spec=s; r.setSpec(s); }
        void setLive(boolean on){
            live=on;
            if(on) startSensors(); else stopSensors();
        }

        @Override protected void onAttachedToWindow(){
            super.onAttachedToWindow();
            if(live) startSensors();
            post(tick);
        }

        @Override protected void onDetachedFromWindow(){
            stopSensors();
            removeCallbacks(tick);
            r.release();
            super.onDetachedFromWindow();
        }

        void startSensors(){
            if(sm==null||!live)return;
            if(rot!=null) sm.registerListener(this,rot,SensorManager.SENSOR_DELAY_GAME);
            else if(acc!=null) sm.registerListener(this,acc,SensorManager.SENSOR_DELAY_GAME);
        }

        void stopSensors(){ if(sm!=null) sm.unregisterListener(this); }

        @Override protected void onDraw(android.graphics.Canvas c){
            if(spec==null)return;
            if(!live){ sx=0; sy=0; }
            else { sx+=(tx-sx)*.16f; sy+=(ty-sy)*.16f; }
            r.draw(c,getWidth(),getHeight(),spec,sx,sy,showClock,System.currentTimeMillis());
        }

        @Override public void onSensorChanged(android.hardware.SensorEvent e){
            if(!live)return;
            if(e.sensor.getType()==android.hardware.Sensor.TYPE_ROTATION_VECTOR){
                float[] m=new float[9],o=new float[3];
                SensorManager.getRotationMatrixFromVector(m,e.values);
                SensorManager.getOrientation(m,o);
                tx=clamp(o[2]/.72f); ty=clamp(o[1]/.88f);
            }else{
                tx=clamp(e.values[0]/9.8f); ty=clamp(e.values[1]/-9.8f);
            }
        }
        @Override public void onAccuracyChanged(android.hardware.Sensor s,int a){}
        float clamp(float v){return Math.max(-1f,Math.min(1f,v));}
    }

    final class ViewOutlineProviderCompat extends android.view.ViewOutlineProvider{
        final int radius;
        ViewOutlineProviderCompat(int r){radius=r;}
        @Override public void getOutline(View v,android.graphics.Outline outline){
            outline.setRoundRect(0,0,v.getWidth(),v.getHeight(),radius);
        }
    }

    @Override protected void onDestroy(){
        exec.shutdownNow();
        if(renderer!=null) renderer.release();
        super.onDestroy();
    }
}