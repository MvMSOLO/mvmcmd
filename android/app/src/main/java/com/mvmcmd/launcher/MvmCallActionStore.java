package com.mvmcmd.launcher;

import android.app.PendingIntent;

public final class MvmCallActionStore {
    private static PendingIntent answer;
    private static PendingIntent decline;
    private MvmCallActionStore(){}
    public static synchronized void set(PendingIntent a, PendingIntent d){answer=a;decline=d;}
    public static synchronized boolean hasAnswer(){return answer!=null;}
    public static synchronized boolean hasDecline(){return decline!=null;}
    public static synchronized boolean fireAnswer(){try{if(answer==null)return false;answer.send();return true;}catch(Exception e){return false;}}
    public static synchronized boolean fireDecline(){try{if(decline==null)return false;decline.send();return true;}catch(Exception e){return false;}}
    public static synchronized void clear(){answer=null;decline=null;}
}