#!/usr/bin/env bash
set -euo pipefail

PACKAGE="com.mvmcmd.launcher"
APK="android/app/build/outputs/apk/debug/app-debug.apk"

echo "SMOKE: waiting for emulator device"
timeout 30s adb wait-for-device
echo "SMOKE: checking Android boot completion"
test "$(timeout 15s adb shell getprop sys.boot_completed | tr -d '\r')" = "1"

echo "SMOKE: installing APK"
test -s "$APK"
timeout 180s adb install -r "$APK"

# Grant only the camera runtime permission inside this disposable CI emulator.
# Permission UX is not considered tested by this launch smoke.
timeout 30s adb shell pm grant "$PACKAGE" android.permission.CAMERA

smoke_activity() {
  local component="$1"
  local class_name="${component##*/}"
  echo "SMOKE: launching ${component}"
  local start_output
  start_output="$(timeout 90s adb shell am start -W -n "$component")"
  printf '%s\n' "$start_output"
  printf '%s\n' "$start_output" | grep -F "Status: ok" >/dev/null

  sleep 2
  local activity_dump
  activity_dump="$(timeout 30s adb shell dumpsys activity activities | tr -d '\r')"
  if ! printf '%s\n' "$activity_dump" | grep -F "$component" >/dev/null; then
    echo "SMOKE FAILURE: expected activity is not present: $component" >&2
    timeout 30s adb logcat -d -t 250 | grep -E 'FATAL EXCEPTION|AndroidRuntime|Process com\.mvmcmd\.launcher' | tail -80 || true
    return 1
  fi
  test -n "$(timeout 30s adb shell pidof "$PACKAGE" | tr -d '\r')"
  echo "SMOKE: $class_name present in activity stack; app process alive"
  timeout 30s adb shell am force-stop "$PACKAGE"
}

# These check native activity installation/startup only. They do not claim
# hardware capture, QR decoding, speech recognition, or OEM permission behavior
# passed on a physical device.
smoke_activity "$PACKAGE/.MainActivity"
smoke_activity "$PACKAGE/.MvmCameraActivity"
smoke_activity "$PACKAGE/.MvmQrActivity"
smoke_activity "$PACKAGE/.MvmEnglishActivity"
smoke_activity "$PACKAGE/.MvmEnglishStudioActivity"
smoke_activity "$PACKAGE/.MvmNotificationCenterActivity"

echo "Android emulator core-surface install/launch smoke passed."
