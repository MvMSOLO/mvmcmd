package com.mvmcmd.launcher;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.*;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import java.text.DateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MvmNotificationCenterActivity extends Activity {
    private static final int BG=Color.rgb(7,9,13),PANEL=Color.rgb(15,19,27),PANEL2=Color.rgb(20,25,34),FG=Color.WHITE,MUTED=Color.rgb(145,154,171),ACCENT=Color.rgb(188,255,78),RED=Color.rgb(255,101,121);
    private static final String PREFS="mvm_notification_settings";
    private static final int REQ_CONTACTS=71,REQ_POST=72;
    private LinearLayout list;private String filter="ALL";private Switch safeSwitch;

    private int dp(int v){return(int)(v*getResources().getDisplayMetrics().density+.5f);}
    private TextView text(String s,float z,int c){TextView t=new TextView(this);t.setText(s);t.setTextColor(c);t.setTextSize(z);t.setFontFeatureSettings("kern");return t;}
    private LinearLayout col(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);return l;}
    private LinearLayout row(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.HORIZONTAL);l.setGravity(Gravity.CENTER_VERTICAL);return l;}
    private GradientDrawable bg(int c,int r){GradientDrawable g=new GradientDrawable();g.setColor(c);g.setCornerRadius(dp(r));g.setStroke(dp(1),Color.rgb(39,46,58));return g;}
    private Button btn(String s){Button b=new Button(this);b.setText(s);b.setTextColor(FG);b.setTextSize(11);b.setAllCaps(false);b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);b.setBackground(bg(PANEL2,11));b.setMinHeight(dp(44));return b;}

    @Override protected void onCreate(Bundle b){super.onCreate(b);build();requestMissingPermissions();}
    @Override protected void onResume(){super.onResume();if(list!=null)renderList();updateState();}

    private void requestMissingPermissions(){
        if(Build.VERSION.SDK_INT>=33&&ContextCompat.checkSelfPermission(this,Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
            ActivityCompat.requestPermissions(this,new String[]{Manifest.permission.POST_NOTIFICATIONS},REQ_POST);
    }

    private void build(){
        LinearLayout root=col();root.setPadding(dp(18),dp(18),dp(18),dp(12));root.setBackgroundColor(BG);

        LinearLayout top=row();
        TextView h=text("MVMCMD / NOTIFICATION",23,FG);h.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        top.addView(h,new LinearLayout.LayoutParams(0,dp(40),1));
        Button clear=btn("CLEAR");clear.setOnClickListener(v->{MvmNotificationStore.clear(this);renderList();});top.addView(clear,new LinearLayout.LayoutParams(dp(78),dp(42)));
        root.addView(top);
        root.addView(text("2.1  ·  inbox / original-open / codes / live calls / safe edge",12,MUTED),new LinearLayout.LayoutParams(-1,dp(32)));

        LinearLayout setup=row();
        Button access=btn("NOTIFICATION ACCESS");access.setOnClickListener(v->openNotificationAccess());setup.addView(access,new LinearLayout.LayoutParams(0,dp(46),1));
        Button usage=btn("USAGE ACCESS");usage.setOnClickListener(v->startActivity(new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)));setup.addView(usage,new LinearLayout.LayoutParams(0,dp(46),1));
        root.addView(setup);

        LinearLayout setup2=row();
        Button edge=btn("SAFE EDGE");edge.setOnClickListener(v->{try{startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getPackageName())));}catch(Exception ignored){}});setup2.addView(edge,new LinearLayout.LayoutParams(0,dp(46),1));
        Button contacts=btn("CONTACTS");contacts.setOnClickListener(v->{if(ContextCompat.checkSelfPermission(this,Manifest.permission.READ_CONTACTS)!=PackageManager.PERMISSION_GRANTED)ActivityCompat.requestPermissions(this,new String[]{Manifest.permission.READ_CONTACTS},REQ_CONTACTS);});setup2.addView(contacts,new LinearLayout.LayoutParams(0,dp(46),1));
        root.addView(setup2);

        LinearLayout safe=row();
        TextView st=text("GAME / VIDEO SAFE MODE",12,FG);st.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        safe.addView(st,new LinearLayout.LayoutParams(0,dp(50),1));
        safeSwitch=new Switch(this);safeSwitch.setChecked(getSharedPreferences(PREFS,MODE_PRIVATE).getBoolean("safe_mode",true));
        safeSwitch.setOnCheckedChangeListener((v,on)->getSharedPreferences(PREFS,MODE_PRIVATE).edit().putBoolean("safe_mode",on).apply());
        safe.addView(safeSwitch);root.addView(safe,new LinearLayout.LayoutParams(-1,dp(52)));

        root.addView(new EdgePreview(this),new LinearLayout.LayoutParams(-1,dp(7)));
        root.addView(text("Safe mode suppresses the mirror notification over detected games/videos; only the edge signal remains.",11,MUTED),new LinearLayout.LayoutParams(-1,dp(38)));

        Button demo=btn("RUN FULL VISUAL DEMO");demo.setTextColor(BG);demo.setBackground(bg(ACCENT,12));demo.setOnClickListener(v->runDemo());root.addView(demo,new LinearLayout.LayoutParams(-1,dp(50)));

        LinearLayout filters=row();
        String[] fs={"ALL","MESSAGES","CODES","CALLS"};
        for(String f:fs){Button btt=btn(f);btt.setOnClickListener(v->{filter=f;renderList();});filters.addView(btt,new LinearLayout.LayoutParams(0,dp(44),1));if(!f.equals("CALLS"))filters.addView(new Space(this),new LinearLayout.LayoutParams(dp(4),1));}
        root.addView(filters);

        ScrollView scroll=new ScrollView(this);list=col();scroll.addView(list);root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        setContentView(root);renderList();updateState();
    }

    private void openNotificationAccess(){
        try{
            Intent intent;
            if(Build.VERSION.SDK_INT>=30){
                ComponentName listener=new ComponentName(this,MvmNotificationListenerService.class);
                intent=new Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
                        .putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,listener);
            }else{
                intent=new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            }
            startActivity(intent);
        }catch(Exception ignored){
            try{startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));}
            catch(Exception e){Toast.makeText(this,"Android notification access settings are unavailable.",Toast.LENGTH_LONG).show();}
        }
        if(Build.VERSION.SDK_INT>=33){
            Toast.makeText(this,"If Android says \"For your security, this setting is currently unavailable\": Settings → Apps → MVMCMD → ⋮ → Allow restricted settings, then return here.",Toast.LENGTH_LONG).show();
        }
    }

    private void updateState(){if(safeSwitch!=null)safeSwitch.setChecked(getSharedPreferences(PREFS,MODE_PRIVATE).getBoolean("safe_mode",true));}

    private void renderList(){
        if(list==null)return;
        list.removeAllViews();
        List<MvmNotificationStore.Item> items=MvmNotificationStore.read(this);
        DateFormat df=DateFormat.getTimeInstance(DateFormat.SHORT);
        int shown=0;
        for(MvmNotificationStore.Item x:items){
            boolean show=filter.equals("ALL")||(filter.equals("CALLS")&&x.call)||(filter.equals("CODES")&&!x.code.isEmpty())||(filter.equals("MESSAGES")&&!x.call);
            if(!show)continue;shown++;addItem(x,df);
        }
        if(shown==0){
            TextView e=text("No events here yet.\nUse RUN FULL VISUAL DEMO to populate the preview timeline.",14,MUTED);
            e.setPadding(0,dp(24),0,dp(24));list.addView(e);
        }
    }

    private void addItem(MvmNotificationStore.Item x,DateFormat df){
        LinearLayout c=col();c.setPadding(dp(14),dp(13),dp(14),dp(13));c.setBackground(bg(x.call?Color.rgb(23,20,25):PANEL,14));
        LinearLayout head=row();
        TextView a=text(x.app.toUpperCase(Locale.ROOT),10,ACCENT);a.setTypeface(Typeface.DEFAULT,Typeface.BOLD);head.addView(a,new LinearLayout.LayoutParams(0,dp(28),1));
        head.addView(text(df.format(new Date(x.time)),10,MUTED));c.addView(head);

        TextView title=text(x.title.isEmpty()?x.app:x.title,18,FG);title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);c.addView(title);
        if(!x.body.isEmpty())c.addView(text(x.body,13,Color.rgb(202,208,219)),new LinearLayout.LayoutParams(-1,dp(52)));

        LinearLayout actions=row();
        if(!x.code.isEmpty()){
            Button copy=btn("COPY "+x.code);copy.setTextColor(BG);copy.setBackground(bg(ACCENT,10));
            copy.setOnClickListener(v->{ClipboardManager cm=(ClipboardManager)getSystemService(CLIPBOARD_SERVICE);cm.setPrimaryClip(ClipData.newPlainText("MVMCMD code",x.code));copy.setText("COPIED ✓");});
            actions.addView(copy,new LinearLayout.LayoutParams(0,dp(44),1));
        }
        if(x.call){
            Button red=btn("DECLINE");red.setTextColor(RED);
            red.setEnabled(MvmCallActionStore.hasDecline());
            red.setOnClickListener(v->{boolean ok=MvmCallActionStore.fireDecline();if(ok)renderList();else Toast.makeText(this,"Decline action is no longer available.",Toast.LENGTH_SHORT).show();});
            actions.addView(red,new LinearLayout.LayoutParams(dp(100),dp(44)));
            Button green=btn("ANSWER");green.setTextColor(ACCENT);
            green.setEnabled(MvmCallActionStore.hasAnswer());
            green.setOnClickListener(v->{boolean ok=MvmCallActionStore.fireAnswer();if(ok)renderList();else Toast.makeText(this,"Answer action is no longer available.",Toast.LENGTH_SHORT).show();});
            actions.addView(green,new LinearLayout.LayoutParams(dp(100),dp(44)));
        }
        c.addView(actions);
        list.addView(c,new LinearLayout.LayoutParams(-1,LinearLayout.LayoutParams.WRAP_CONTENT));
        Space gap=new Space(this);list.addView(gap,new LinearLayout.LayoutParams(1,dp(8)));
    }

    private void runDemo(){
        MvmNotificationStore.addDemo(this,"Telegram","New message","Your verification code is 4821","4821",false);
        MvmNotificationStore.addDemo(this,"WhatsApp","Aziza Karimova","+998 90 123 45 67 · Incoming call","",true);
        MvmNotificationStore.addDemo(this,"YouTube","New upload","Safe-mode demo: only the edge signal appears over video.","",false);
        MvmNotificationStore.addDemo(this,"MVMCMD","Security notice","Your 5-digit code is 73014. Tap COPY to test instant clipboard.","73014",false);
        filter="ALL";renderList();Toast.makeText(this,"Demo timeline generated · 4 states",Toast.LENGTH_LONG).show();
    }

    private static class EdgePreview extends View{
        Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
        EdgePreview(Context c){super(c);}
        @Override protected void onDraw(Canvas c){float h=getHeight();p.setShader(new LinearGradient(0,0,getWidth(),0,new int[]{0xffff4fd8,0xff52e7ff,0xff72ff9a,0xffffe26b},null,Shader.TileMode.CLAMP));c.drawRect(0,0,getWidth(),h,p);}
    }
}