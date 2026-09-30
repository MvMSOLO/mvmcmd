package com.mvmcmd.launcher;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.ContactsContract;
import androidx.core.content.ContextCompat;

public final class MvmContactResolver {
    private MvmContactResolver(){}
    public static String resolve(Context c,String number){
        if(number==null||number.trim().isEmpty())return "";
        if(ContextCompat.checkSelfPermission(c,Manifest.permission.READ_CONTACTS)!=PackageManager.PERMISSION_GRANTED)return "";
        try{
            Uri uri=Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI,Uri.encode(number));
            android.database.Cursor cur=c.getContentResolver().query(uri,new String[]{ContactsContract.PhoneLookup.DISPLAY_NAME},null,null,null);
            if(cur!=null)try{if(cur.moveToFirst())return cur.getString(0); } finally{cur.close();}
        }catch(Exception ignored){}
        return "";
    }
}