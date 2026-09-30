package com.mvmcmd.launcher;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public final class MvmNotificationStore {
    private static final String PREFS="mvm_notifications",KEY_ITEMS="items";
    private static final int MAX_ITEMS=120;
    public static final class Item {
        public final String app,title,body,code,sourceKey; public final long time; public final boolean call;
        Item(String a,String t,String b,String c,long tm,boolean cl,String k){app=a;title=t;body=b;code=c;time=tm;call=cl;sourceKey=k;}
    }
    private MvmNotificationStore(){}
    public static synchronized void add(Context c,String app,String title,String body,String code,boolean call,String sourceKey){
        try{
            SharedPreferences p=c.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
            JSONArray old=new JSONArray(p.getString(KEY_ITEMS,"[]")); long now=System.currentTimeMillis(); JSONArray next=new JSONArray();
            if(sourceKey==null)sourceKey="";
            next.put(new JSONObject().put("app",app).put("title",title).put("body",body).put("code",code==null?"":code).put("time",now).put("call",call).put("key",sourceKey));
            for(int i=0;i<old.length()&&next.length()<MAX_ITEMS;i++){
                JSONObject o=old.getJSONObject(i);
                if(!sourceKey.isEmpty()&&sourceKey.equals(o.optString("key",""))&&now-o.optLong("time",0)<2500)continue;
                next.put(o);
            }
            p.edit().putString(KEY_ITEMS,next.toString()).apply();
        }catch(Exception ignored){}
    }
    public static void add(Context c,String app,String title,String body,String code,boolean call){add(c,app,title,body,code,call,"");}
    public static synchronized void addDemo(Context c,String app,String title,String body,String code,boolean call){add(c,app,title,body,code,call,"demo-"+System.nanoTime());}
    public static synchronized List<Item> read(Context c){
        ArrayList<Item> out=new ArrayList<>();
        try{JSONArray a=new JSONArray(c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(KEY_ITEMS,"[]"));
            for(int i=0;i<a.length();i++){JSONObject o=a.getJSONObject(i);out.add(new Item(o.optString("app",""),o.optString("title",""),o.optString("body",""),o.optString("code",""),o.optLong("time",0),o.optBoolean("call",false),o.optString("key","")));}}
        catch(Exception ignored){} return out;
    }
    public static void clear(Context c){c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().remove(KEY_ITEMS).apply();}
}