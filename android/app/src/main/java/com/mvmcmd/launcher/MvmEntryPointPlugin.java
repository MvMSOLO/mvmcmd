package com.mvmcmd.launcher;

import android.content.Context;
import android.content.Intent;
import android.content.ClipData;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;
import java.util.UUID;

@CapacitorPlugin(name = "MvmEntryPoint")
public final class MvmEntryPointPlugin extends Plugin {
    private static volatile MvmEntryPointPlugin instance;
    private static volatile JSObject pendingEntry;

    @Override public void load() { instance = this; }
    public static synchronized void captureIncoming(Context context, Intent intent) {
        JSObject payload = parseIntent(context, intent);
        if (payload == null) return;
        pendingEntry = payload;
        MvmEntryPointPlugin plugin = instance;
        if (plugin != null) plugin.notifyListeners("entryPoint", payload);
    }
    @PluginMethod public void getPendingEntry(PluginCall call) {
        JSObject payload = pendingEntry;
        if (payload == null) { payload = parseIntent(getContext(), getActivity().getIntent()); pendingEntry = payload; }
        if (payload == null) { JSObject empty = new JSObject(); empty.put("available", false); call.resolve(empty); return; }
        call.resolve(payload);
    }
    @PluginMethod public void acknowledgeEntry(PluginCall call) {
        String id=call.getString("id"); JSObject current=pendingEntry;
        boolean ok=id!=null&&current!=null&&id.equals(current.optString("id"));
        if(ok){pendingEntry=null;Intent clean=new Intent(getActivity(),MainActivity.class);clean.setAction(Intent.ACTION_MAIN);clean.addCategory(Intent.CATEGORY_LAUNCHER);getActivity().setIntent(clean);}
        JSObject out=new JSObject();out.put("acknowledged",ok);call.resolve(out);
    }
    private static JSObject parseIntent(Context context, Intent intent) {
        if(intent==null)return null;String action=intent.getAction();Uri data=intent.getData();
        if(Intent.ACTION_VIEW.equals(action)&&data!=null){
            if("mvmcmd".equalsIgnoreCase(data.getScheme())&&"command".equalsIgnoreCase(data.getHost())){
                String cmd=data.getQueryParameter("command");
                if(cmd==null||cmd.trim().isEmpty()){java.util.List<String> segments=data.getPathSegments();if(!segments.isEmpty())cmd=segments.get(segments.size()-1);}
                cmd=normalizeCommand(cmd);if(cmd==null)return null;JSObject p=base("command",action);p.put("command",cmd);return p;
            }
            if(safeContentUri(context,data)){JSObject p=base("open-file",action);p.put("uri",data.toString());p.put("mimeType",safeMime(intent.getType(),context,data));p.put("displayName",displayName(context,data));return p;}
            return null;
        }
        if(!Intent.ACTION_SEND.equals(action))return null;
        Uri stream=null;
        try { if(android.os.Build.VERSION.SDK_INT>=33)stream=intent.getParcelableExtra(Intent.EXTRA_STREAM,Uri.class);else {
            //noinspection deprecation
            stream=(Uri)intent.getParcelableExtra(Intent.EXTRA_STREAM);
        }}catch(Exception ignored){}
        if(stream==null){ClipData clip=intent.getClipData();if(clip!=null&&clip.getItemCount()>0)stream=clip.getItemAt(0).getUri();}
        CharSequence shared=null;try{shared=intent.getCharSequenceExtra(Intent.EXTRA_TEXT);}catch(Exception ignored){}
        if(stream!=null&&safeContentUri(context,stream)){JSObject p=base("share-file",action);p.put("uri",stream.toString());p.put("mimeType",safeMime(intent.getType(),context,stream));p.put("displayName",displayName(context,stream));if(shared!=null)p.put("text",boundedText(shared.toString()));return p;}
        if(shared!=null&&!shared.toString().trim().isEmpty()){JSObject p=base("share-text",action);p.put("text",boundedText(shared.toString()));p.put("mimeType","text/plain");return p;}
        return null;
    }
    private static JSObject base(String kind,String action){JSObject p=new JSObject();p.put("available",true);p.put("id","android-"+UUID.randomUUID());p.put("source","android");p.put("kind",kind);p.put("action",action==null?"":action);return p;}
    private static String normalizeCommand(String v){if(v==null)return null;switch(v.trim().toLowerCase(Locale.ROOT)){
        case "camera":case "cam":case "kamera":return "camera";case "qr":case "scan":case "qrcode":return "qr";
        case "english":case "en":case "ielts":return "english";case "wallpaper":case "wall":return "wallpaper";
        case "notification":case "notifications":case "notify":return "notification";case "device":return "device";
        case "sys":return "sys";case "help":return "help";case "files":return "files";case "session":return "session";default:return null;}}
    private static boolean safeContentUri(Context c,Uri u){if(u==null||!"content".equalsIgnoreCase(u.getScheme())||u.getAuthority()==null||u.getAuthority().equalsIgnoreCase(c.getPackageName()+".fileprovider"))return false;String s=u.toString().toLowerCase(Locale.ROOT);return !s.contains("/data/")&&!s.contains("/proc/")&&!s.contains("/sys/");}
    private static String safeMime(String m,Context c,Uri u){if(m==null||m.trim().isEmpty()){try{m=c.getContentResolver().getType(u);}catch(Exception ignored){m=null;}}if(m==null||!m.matches("(?i)^[a-z0-9!#$&^_.+-]+/[a-z0-9!#$&^_.+*-]+$"))return "application/octet-stream";return m.toLowerCase(Locale.ROOT);}
    private static String displayName(Context c,Uri u){try(Cursor cursor=c.getContentResolver().query(u,null,null,null,null)){if(cursor!=null&&cursor.moveToFirst()){int idx=cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);if(idx>=0){String name=cursor.getString(idx);if(name!=null){name=name.replaceAll("[\\p{Cntrl}]","");return name.substring(0,Math.min(180,name.length()));}}}}catch(Exception ignored){}return "incoming-file";}
    private static String boundedText(String text){String clean=text.replaceAll("[\\p{Cntrl}&&[^\\r\\n\\t]]","").trim();return clean.substring(0,Math.min(4000,clean.length()));}
}
