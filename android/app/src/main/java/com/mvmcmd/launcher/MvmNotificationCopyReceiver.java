package com.mvmcmd.launcher;

import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

public class MvmNotificationCopyReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        String code = intent.getStringExtra("code");
        if (code == null || code.isEmpty()) return;
        ClipboardManager cm = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
        cm.setPrimaryClip(ClipData.newPlainText("MVMCMD code", code));
        Toast.makeText(context, "Copied " + code, Toast.LENGTH_SHORT).show();
    }
}
