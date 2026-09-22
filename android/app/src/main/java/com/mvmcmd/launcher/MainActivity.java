package com.mvmcmd.launcher;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public MainActivity() {
        registerPlugin(MvmLauncherPlugin.class);
    }
}
