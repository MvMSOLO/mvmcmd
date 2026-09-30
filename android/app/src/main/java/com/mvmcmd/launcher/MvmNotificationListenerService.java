package com.mvmcmd.launcher;

import android.app.AppOpsManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.os.Build;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import androidx.core.app.NotificationCompat;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MvmNotificationListenerService extends NotificationListenerService {
    private static final String CHANNEL_ALERT="mvm_notify_alert";
    private static final String CHANNEL_SAFE="mvm_notify_safe";
    private static final String PREFS="mvm_notification_settings";
    private static final Pattern CODE=Pattern.compile("(?<!\\d)\\d{4,8}(?!\\d)");
    private static final Pattern PHONE=Pattern.compile("(?<!\\d)(?:\\+?998[ -]?)?\\d(?:[ -]?\\d){6,12}(?!\\d)");

    @Override public void onCreate(){super.onCreate();createChannel(CHANNEL_ALERT,NotificationManager.IMPORTANCE_HIGH);createChannel(CHANNEL_SAFE,NotificationManager.IMPORTANCE_LOW);}

    private void createChannel(String id,int importance){
        if(Build.VERSION.SDK_INT<26)return;
        NotificationManager nm=getSystemService(NotificationManager.class);
        NotificationChannel c=new NotificationChannel(id,id.equals(CHANNEL_SAFE)?"MVMCMD Safe Mode":"MVMCMD Notifications",importance);
        c.setDescription("MVMCMD native notification engine");
        c.setSound(null,null);c.enableVibration(false);nm.createNotificationChannel(c);
    }

    @Override public void onNotificationPosted(StatusBarNotification sbn){
        if(sbn==null||getPackageName().equals(sbn.getPackageName()))return;
        Notification n=sbn.getNotification();
        if(n==null||(n.flags&Notification.FLAG_GROUP_SUMMARY)!=0)return;

        String app=applicationLabel(sbn.getPackageName());
        String title=value(n.extras,Notification.EXTRA_TITLE);
        String body=value(n.extras,Notification.EXTRA_BIG_TEXT);
        if(body.isEmpty())body=value(n.extras,Notification.EXTRA_TEXT);
        if(title.isEmpty()&&body.isEmpty())return;

        String combined=title+" "+body;
        String code=findCode(combined);
        boolean call=n.category!=null&&Notification.CATEGORY_CALL.equals(n.category);
        call=call||looksLikeCall(app,title,sbn.getPackageName());

        if(call){
            String number=findPhone(combined);
            String contact=MvmContactResolver.resolve(this,number);
            if(!contact.isEmpty())title=contact;
            else if(title.isEmpty()&&!number.isEmpty())title=number;
            if(!number.isEmpty()&&!body.contains(number))body=number+(body.isEmpty()?"":"  ·  "+body);
        }

        MvmNotificationStore.add(this,app,title,body,code,call,
                sbn.getPackageName()+":"+sbn.getId()+":"+String.valueOf(sbn.getTag()));

        boolean safeSurface=isSafeSurface();
        boolean safeEnabled=getSharedPreferences(PREFS,MODE_PRIVATE).getBoolean("safe_mode",true);
        if(safeEnabled&&safeSurface){
            if(call) MvmNotificationSound.playCall();
            else if(!code.isEmpty()) MvmNotificationSound.playCode();
            else MvmNotificationSound.play();
            MvmSafeEdge.show(this);
            return;
        }

        if(call)MvmNotificationSound.playCall();
        else if(!code.isEmpty())MvmNotificationSound.playCode();
        else MvmNotificationSound.play();

        if(call) MvmCallActionStore.clear();
        postMirror(sbn,app,title,body,code,call);
    }

    private void postMirror(StatusBarNotification sbn,String app,String title,String body,String code,boolean call){
        Notification original=sbn.getNotification();
        PendingIntent content=original.contentIntent;
        if(content==null){
            Intent open=new Intent(this,MvmNotificationCenterActivity.class)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
            content=PendingIntent.getActivity(this,901,open,PendingIntent.FLAG_UPDATE_CURRENT|immutableFlag());
        }

        NotificationCompat.Builder b=new NotificationCompat.Builder(this,CHANNEL_ALERT)
                .setSmallIcon(com.mvmcmd.launcher.R.drawable.mvmcmd_logo)
                .setColor(0xffbaff4e)
                .setContentTitle(title.isEmpty()?app:title)
                .setContentText(body.isEmpty()?app:body)
                .setSubText(app)
                .setContentIntent(content)
                .setAutoCancel(!call)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setCategory(call?NotificationCompat.CATEGORY_CALL:NotificationCompat.CATEGORY_MESSAGE)
                .setGroup("mvmcmd-live")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body.isEmpty()?title:body));

        if(!code.isEmpty()){
            Intent cpI=new Intent(this,MvmNotificationCopyReceiver.class).putExtra("code",code);
            PendingIntent cp=PendingIntent.getBroadcast(this,code.hashCode(),cpI,PendingIntent.FLAG_UPDATE_CURRENT|immutableFlag());
            b.addAction(new NotificationCompat.Action(0,"COPY "+code,cp));
        }

        PendingIntent answer=null,decline=null;
        if(call&&original.actions!=null){
            for(Notification.Action action:original.actions){
                if(action==null||action.actionIntent==null)continue;
                String label=action.title==null?"":action.title.toString().toLowerCase(Locale.ROOT);
                if(label.contains("answer")||label.contains("accept")||label.contains("green")){
                    answer=action.actionIntent;
                    b.addAction(new NotificationCompat.Action(0,"ANSWER",action.actionIntent));
                }else if(label.contains("decline")||label.contains("reject")||label.contains("red")||label.contains("hang")){
                    decline=action.actionIntent;
                    b.addAction(new NotificationCompat.Action(0,"DECLINE",action.actionIntent));
                }
            }
        }
        if(call)MvmCallActionStore.set(answer,decline);

        getSystemService(NotificationManager.class)
                .notify(Math.abs((sbn.getPackageName()+":"+sbn.getId()).hashCode()),b.build());
    }

    private boolean isSafeSurface(){
        try{
            if(!hasUsageAccess())return false;
            UsageStatsManager usm=(UsageStatsManager)getSystemService(Context.USAGE_STATS_SERVICE);
            if(usm==null)return false;
            long now=System.currentTimeMillis();
            UsageEvents events=usm.queryEvents(now-3000,now);
            UsageEvents.Event e=new UsageEvents.Event();
            String pkg=null;
            while(events.hasNextEvent()){
                events.getNextEvent(e);
                if(e.getEventType()==UsageEvents.Event.MOVE_TO_FOREGROUND)pkg=e.getPackageName();
            }
            if(pkg==null||getPackageName().equals(pkg))return false;
            ApplicationInfo ai=getPackageManager().getApplicationInfo(pkg,0);
            if(Build.VERSION.SDK_INT>=26&&ai.category==ApplicationInfo.CATEGORY_GAME)return true;
            String p=pkg.toLowerCase(Locale.ROOT);
            return p.contains("youtube")||p.contains("netflix")||p.contains("twitch")
                    ||p.contains("mxplayer")||p.contains("vlc")||p.contains("player")||p.contains("video");
        }catch(Exception ignored){return false;}
    }

    private boolean hasUsageAccess(){
        try{
            AppOpsManager appOps=(AppOpsManager)getSystemService(Context.APP_OPS_SERVICE);
            if(Build.VERSION.SDK_INT>=19){
                return appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
                        android.os.Process.myUid(),getPackageName())==AppOpsManager.MODE_ALLOWED;
            }
        }catch(Exception ignored){}
        return false;
    }

    private String applicationLabel(String pkg){
        try{return getPackageManager().getApplicationLabel(getPackageManager().getApplicationInfo(pkg,0)).toString();}
        catch(Exception e){return pkg;}
    }
    private static String value(android.os.Bundle b,String key){
        if(b==null)return"";
        CharSequence v=b.getCharSequence(key);
        return v==null?"":v.toString().trim();
    }
    private static String findCode(String text){
        Matcher m=CODE.matcher(text==null?"":text);
        return m.find()?m.group():"";
    }
    private static String findPhone(String text){
        Matcher m=PHONE.matcher((text==null?"":text).replace("(","").replace(")",""));
        return m.find()?m.group().trim():"";
    }
    private static boolean looksLikeCall(String app,String title,String pkg){
        String s=(app+" "+title+" "+pkg).toLowerCase(Locale.ROOT);
        return s.contains("phone")||s.contains("dialer")||s.contains("call")||s.contains("telefon")||s.contains("incoming");
    }
    private static int immutableFlag(){return Build.VERSION.SDK_INT>=23?PendingIntent.FLAG_IMMUTABLE:0;}
}