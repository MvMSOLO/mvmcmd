package com.mvmcmd.launcher;

import android.Manifest;
import android.app.Activity;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import static org.junit.Assert.assertNotNull;

@RunWith(AndroidJUnit4.class)
public final class CoreActivitiesLaunchTest {
    private static final String PACKAGE = "com.mvmcmd.launcher";

    private void grantCameraPermissionForEmulator() {
        InstrumentationRegistry.getInstrumentation()
                .getUiAutomation()
                .grantRuntimePermission(PACKAGE, Manifest.permission.CAMERA);
    }

    private <T extends Activity> void assertActivityCanLaunch(Class<T> activityClass) {
        try (ActivityScenario<T> scenario = ActivityScenario.launch(activityClass)) {
            scenario.onActivity(activity ->
                    assertNotNull(
                            activityClass.getSimpleName() + " should create its content root",
                            activity.findViewById(android.R.id.content)));
        }
    }

    @Test
    public void mainActivityLaunches() {
        assertActivityCanLaunch(MainActivity.class);
    }

    @Test
    public void cameraActivityLaunchesWithCameraPermission() {
        grantCameraPermissionForEmulator();
        assertActivityCanLaunch(MvmCameraActivity.class);
    }

    @Test
    public void qrActivityLaunchesWithCameraPermission() {
        grantCameraPermissionForEmulator();
        assertActivityCanLaunch(MvmQrActivity.class);
    }

    @Test
    public void englishActivityLaunches() {
        assertActivityCanLaunch(MvmEnglishActivity.class);
    }

    @Test
    public void englishStudioActivityLaunches() {
        assertActivityCanLaunch(MvmEnglishStudioActivity.class);
    }

    @Test
    public void notificationCenterActivityLaunches() {
        assertActivityCanLaunch(MvmNotificationCenterActivity.class);
    }
}
