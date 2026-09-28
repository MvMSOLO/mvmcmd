package com.mvmcmd.launcher;

import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Handler;
import android.os.Looper;
import android.service.wallpaper.WallpaperService;
import android.view.SurfaceHolder;

public final class MvmHomeWallpaperService extends WallpaperService {
    public static final String PREFS="mvm_wallpaper";
    public static final String KEY_SELECTED="selected_id";
    @Override public Engine onCreateEngine(){ return new EngineImpl(); }

    private final class EngineImpl extends Engine implements SensorEventListener {
        final SensorManager sm=(SensorManager)getSystemService(SENSOR_SERVICE);
        final Sensor rotation=sm==null?null:sm.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        final Sensor accel=sm==null?null:sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        final MvmWallpaperRenderer renderer=new MvmWallpaperRenderer(MvmHomeWallpaperService.this);
        final Handler handler=new Handler(Looper.getMainLooper());
        final float[] orientation=new float[3];
        MvmWallpaperCatalog.Spec spec; float targetX,targetY,smoothX,smoothY,offsetX; int w,h;
        boolean visible,drawing;
        EngineImpl(){ reload(); }
        void reload(){ SharedPreferences p=getSharedPreferences(PREFS,MODE_PRIVATE);spec=MvmWallpaperCatalog.find(p.getString(KEY_SELECTED,"scarlet_focus")); }
        @Override public void onSurfaceChanged(SurfaceHolder hldr,int format,int w,int h){this.w=w;this.h=h;drawFrame();}
        @Override public void onVisibilityChanged(boolean v){visible=v;if(v){reload();startSensors();postFrame();}else stopSensors();}
        @Override public void onOffsetsChanged(float x,float y,float xs,float ys,int xp,int yp){offsetX=(x-.5f)*2f;drawFrame();}
        @Override public void onSurfaceDestroyed(SurfaceHolder hldr){visible=false;stopSensors();super.onSurfaceDestroyed(hldr);}
        @Override public void onDestroy(){visible=false;stopSensors();handler.removeCallbacksAndMessages(null);super.onDestroy();}
        void startSensors(){if(sm==null)return;if(rotation!=null)sm.registerListener(this,rotation,SensorManager.SENSOR_DELAY_GAME);else if(accel!=null)sm.registerListener(this,accel,SensorManager.SENSOR_DELAY_GAME);}
        void stopSensors(){if(sm!=null)sm.unregisterListener(this);}
        void postFrame(){if(visible&&!drawing)handler.postDelayed(this::drawFrame,33);}
        void drawFrame(){
            if(w<=0||h<=0||drawing)return; drawing=true; smoothX+=(targetX-smoothX)*.16f;smoothY+=(targetY-smoothY)*.16f;
            Canvas c=null; try{c=getSurfaceHolder().lockCanvas();if(c!=null)renderer.draw(c,w,h,spec,smoothX+offsetX*.35f,smoothY,true,System.currentTimeMillis());}
            catch(Exception ignored){} finally{if(c!=null)try{getSurfaceHolder().unlockCanvasAndPost(c);}catch(Exception ignored){} drawing=false;}
            postFrame();
        }
        @Override public void onSensorChanged(SensorEvent e){
            if(e.sensor.getType()==Sensor.TYPE_ROTATION_VECTOR){float[] m=new float[9];SensorManager.getRotationMatrixFromVector(m,e.values);SensorManager.getOrientation(m,orientation);targetX=clamp(orientation[2]/.7f);targetY=clamp(orientation[1]/.85f);}
            else {targetX=clamp(e.values[0]/9.8f);targetY=clamp(e.values[1]/-9.8f);}
        }
        @Override public void onAccuracyChanged(Sensor s,int a){}
        float clamp(float v){return Math.max(-1f,Math.min(1f,v));}
    }
}
