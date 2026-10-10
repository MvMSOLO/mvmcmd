package com.mvmcmd.launcher;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public MainActivity() {
        registerPlugin(MvmLauncherPlugin.class);
        registerPlugin(MvmDevicePlugin.class);
        registerPlugin(MvmFileToolsPlugin.class);
        registerPlugin(MvmVoicePlugin.class);
        registerPlugin(MvmEntryPointPlugin.class);
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        MvmEntryPointPlugin.captureIncoming(this, getIntent());
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        MvmEntryPointPlugin.captureIncoming(this, intent);
    }
}
