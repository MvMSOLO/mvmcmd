package com.mvmcmd.launcher;

import android.Manifest;
import android.app.Activity;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;

import androidx.test.core.app.ActivityScenario;
import androidx.test.espresso.Espresso;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.typeText;
import static androidx.test.espresso.action.ViewActions.closeSoftKeyboard;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.withText;
import static androidx.test.espresso.matcher.ViewMatchers.withHint;
import static androidx.test.espresso.matcher.ViewMatchers.withContentDescription;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static org.hamcrest.Matchers.containsString;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

@RunWith(AndroidJUnit4.class)
public final class CoreActivitiesLaunchTest {
    private static final String PACKAGE = "com.mvmcmd.launcher";

    private Context targetContext() {
        return InstrumentationRegistry.getInstrumentation().getTargetContext();
    }

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
    public void cameraActivityShowsCaptureAndAdjustmentControls() {
        grantCameraPermissionForEmulator();
        try (ActivityScenario<MvmCameraActivity> scenario = ActivityScenario.launch(MvmCameraActivity.class)) {
            onView(withText("4:3")).check(matches(isDisplayed()));
            onView(withText("Natural")).check(matches(isDisplayed()));
            onView(withText("Vivid")).perform(click());
            onView(withText("PHOTO")).check(matches(isDisplayed()));
            onView(withText("VIDEO")).check(matches(isDisplayed()));
            onView(withContentDescription("Adjust")).perform(click());
            onView(withText("ADJUST")).check(matches(isDisplayed()));
            onView(withText("Exposure")).check(matches(isDisplayed()));
        }
    }

    @Test
    public void qrActivityShowsScannerStatusAndImageFallback() {
        grantCameraPermissionForEmulator();
        Intent intent = new Intent(targetContext(), MvmQrActivity.class)
                .putExtra(MvmQrActivity.EXTRA_DISABLE_SCANNER_FOR_TESTS, true);
        try (ActivityScenario<MvmQrActivity> scenario = ActivityScenario.launch(intent)) {
            onView(withText("QR / BARCODE")).check(matches(isDisplayed()));
            onView(withText("ALIGN CODE INSIDE THE FRAME")).check(matches(isDisplayed()));
            onView(withContentDescription("Scan QR or barcode from image")).check(matches(isDisplayed()));
        }
    }

    @Test
    public void wallpaperActivityShowsNativeWallpaperActions() {
        try (ActivityScenario<MvmWallpaperActivity> scenario = ActivityScenario.launch(MvmWallpaperActivity.class)) {
            onView(withText("WALLPAPER")).check(matches(isDisplayed()));
            onView(withText("MVMCMD  /  ORIGINAL WALLPAPERS")).check(matches(isDisplayed()));
            onView(withText("SET HOME WALLPAPER")).check(matches(isDisplayed()));
            onView(withText("ORIGINAL 17")).check(matches(isDisplayed()));
        }
    }

    @Test
    public void englishPracticeAnswersAQuestionAndUpdatesXp() {
        Context target = targetContext();
        target.getSharedPreferences("mvm_english", Context.MODE_PRIVATE).edit().clear().commit();

        try (ActivityScenario<MvmEnglishActivity> scenario = ActivityScenario.launch(MvmEnglishActivity.class)) {
            onView(withText("START ADAPTIVE PRACTICE  →")).perform(click());
            onView(withText("She ___ a student.")).check(matches(isDisplayed()));
            onView(withText("is")).perform(click());
            onView(withText("XP 10")).check(matches(isDisplayed()));
        } finally {
            target.getSharedPreferences("mvm_english", Context.MODE_PRIVATE).edit().clear().commit();
        }
    }

    @Test
    public void englishStudioGrammarCheckerReturnsAnExplicitCorrection() {
        Context target = targetContext();
        target.getSharedPreferences("mvm_english_studio", Context.MODE_PRIVATE).edit().clear().commit();

        try (ActivityScenario<MvmEnglishStudioActivity> scenario = ActivityScenario.launch(MvmEnglishStudioActivity.class)) {
            onView(withText("GRAMMAR CHECKER  ·  EXPLAIN MY MISTAKES")).perform(click());
            onView(withHint("Paste or type English here…"))
                    .perform(typeText("he go school"), closeSoftKeyboard());
            onView(withText("CHECK EVERYTHING  →")).perform(click());
            onView(withText("CORRECTED")).check(matches(isDisplayed()));
            onView(withText("He goes school.")).check(matches(isDisplayed()));
        } finally {
            target.getSharedPreferences("mvm_english_studio", Context.MODE_PRIVATE).edit().clear().commit();
        }
    }

    @Test
    public void notificationDemoRendersAndClearsTheTimeline() {
        Context target = targetContext();
        MvmNotificationStore.clear(target);

        try (ActivityScenario<MvmNotificationCenterActivity> scenario =
                     ActivityScenario.launch(MvmNotificationCenterActivity.class)) {
            onView(withText("RUN FULL VISUAL DEMO")).perform(click());
            onView(withText("TELEGRAM")).perform(androidx.test.espresso.action.ViewActions.scrollTo())
                    .check(matches(isDisplayed()));
            onView(withText("CLEAR")).perform(click());
            onView(withText(containsString("No events yet."))).check(matches(isDisplayed()));
        } finally {
            MvmNotificationStore.clear(target);
        }
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
