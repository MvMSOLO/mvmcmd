#!/usr/bin/env bash
set -euo pipefail

PACKAGE="com.mvmcmd.launcher"
APK="android/app/build/outputs/apk/debug/app-debug.apk"

echo "SMOKE: waiting for emulator device"
timeout 30s adb wait-for-device
echo "SMOKE: checking Android boot completion"
test "$(timeout 15s adb shell getprop sys.boot_completed | tr -d '\r')" = "1"

echo "SMOKE: installing built APK"
test -s "$APK"
timeout 180s adb install -r "$APK"

echo "SMOKE: launching exported app entry point"
start_output="$(timeout 90s adb shell am start -W -n "$PACKAGE/.MainActivity")"
printf '%s\n' "$start_output"
printf '%s\n' "$start_output" | grep -F "Status: ok" >/dev/null
sleep 3
test -n "$(timeout 30s adb shell pidof "$PACKAGE" | tr -d '\r')"
echo "SMOKE: MainActivity process remained alive"
timeout 30s adb shell am force-stop "$PACKAGE"

echo "SMOKE: running isolated Android instrumentation tests with bounded execution"
INSTRUMENTATION_TESTS=(
  "com.getcapacitor.myapp.ExampleInstrumentedTest#useAppContext"
  "com.mvmcmd.launcher.CoreActivitiesLaunchTest#mainActivityLaunches"
  "com.mvmcmd.launcher.CoreActivitiesLaunchTest#cameraActivityShowsCaptureAndAdjustmentControls"
  "com.mvmcmd.launcher.CoreActivitiesLaunchTest#qrActivityShowsScannerStatusAndImageFallback"
  "com.mvmcmd.launcher.CoreActivitiesLaunchTest#wallpaperActivityShowsNativeWallpaperActions"
  "com.mvmcmd.launcher.CoreActivitiesLaunchTest#englishPracticeAnswersAQuestionAndUpdatesXp"
  "com.mvmcmd.launcher.CoreActivitiesLaunchTest#englishStudioGrammarCheckerReturnsAnExplicitCorrection"
  "com.mvmcmd.launcher.CoreActivitiesLaunchTest#notificationDemoRendersAndClearsTheTimeline"
  "com.mvmcmd.launcher.CoreActivitiesLaunchTest#englishActivityLaunches"
  "com.mvmcmd.launcher.CoreActivitiesLaunchTest#englishStudioActivityLaunches"
  "com.mvmcmd.launcher.CoreActivitiesLaunchTest#notificationCenterActivityLaunches"
)
(
  cd android
  for test_case in "${INSTRUMENTATION_TESTS[@]}"; do
    echo "INSTRUMENTATION: ${test_case}"
    timeout 90s ./gradlew :app:connectedDebugAndroidTest --no-daemon --console=plain "-Pandroid.testInstrumentationRunnerArguments.class=${test_case}"
  done
)

echo "Android emulator install/launch and isolated core native activity tests passed."
