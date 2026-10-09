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

echo "SMOKE: running Android instrumentation tests for private native activities"
(
  cd android
  ./gradlew :app:connectedDebugAndroidTest --no-daemon --stacktrace
)

echo "Android emulator install/launch and core native activity tests passed."
