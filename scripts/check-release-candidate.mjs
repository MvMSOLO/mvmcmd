import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const checks = [];

function check(label, condition, detail = "") {
  if (condition) {
    checks.push(label);
    console.log("PASS " + label);
  } else {
    failures.push(label + (detail ? ": " + detail : ""));
    console.error("FAIL " + label + (detail ? ": " + detail : ""));
  }
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  try {
    return fs.readFileSync(absolutePath, "utf8");
  } catch (error) {
    check("required file exists: " + relativePath, false, error instanceof Error ? error.message : String(error));
    return "";
  }
}

function capture(source, expression) {
  return source.match(expression)?.[1] ?? null;
}

let pkg;
try {
  pkg = JSON.parse(read("package.json"));
  check("package.json parses", Boolean(pkg && typeof pkg === "object"));
} catch (error) {
  check("package.json parses", false, error instanceof Error ? error.message : String(error));
  pkg = {};
}

const gradle = read("android/app/build.gradle");
const manifest = read("android/app/src/main/AndroidManifest.xml");
const strings = read("android/app/src/main/res/values/strings.xml");

const version = typeof pkg.version === "string" ? pkg.version : "";
const androidVersion = capture(gradle, /\bversionName\s+"([^"]+)"/);
const androidVersionCodeText = capture(gradle, /\bversionCode\s+(\d+)/);
const androidVersionCode = Number(androidVersionCodeText);
const packageName = capture(gradle, /\bapplicationId\s+"([^"]+)"/);
const namespace = capture(gradle, /\bnamespace\s*=\s*"([^"]+)"/);
const productName = pkg.build?.productName;
const desktopAppId = pkg.build?.appId;
const appLabel = capture(strings, /<string\s+name="app_name">([^<]+)<\/string>/);
const activityLabel = capture(strings, /<string\s+name="title_activity_main">([^<]+)<\/string>/);
const launcherActivity = capture(manifest, /(<activity\b[^>]*android:name="\.MainActivity"[\s\S]*?<\/activity>)/);
const windowsTargets = Array.isArray(pkg.build?.win?.target)
  ? pkg.build.win.target
  : pkg.build?.win?.target
    ? [pkg.build.win.target]
    : [];
const portableX64 = windowsTargets.some((target) => {
  const architectures = Array.isArray(target.arch) ? target.arch : [target.arch].filter(Boolean);
  return target.target === "portable" && architectures.includes("x64");
});

check("package version is stable semantic version", /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version), version || "missing");
check("Android versionName matches package version", androidVersion === version, `package=${version || "missing"}, Android=${androidVersion || "missing"}`);
check("Android versionCode is a positive integer", Number.isInteger(androidVersionCode) && androidVersionCode > 0, androidVersionCodeText || "missing");
check("desktop product name is MVMCMD", productName === "MVMCMD", String(productName ?? "missing"));
check("desktop app ID is stable", desktopAppId === "com.mvmcmd.desktop", String(desktopAppId ?? "missing"));
check("Windows portable x64 target is configured", portableX64);
check("Android namespace and application ID are aligned", Boolean(packageName && namespace && packageName === namespace), `namespace=${namespace || "missing"}, applicationId=${packageName || "missing"}`);
check("Android app labels match product name", appLabel === productName && activityLabel === productName, `app_name=${appLabel || "missing"}, activity=${activityLabel || "missing"}`);
check("Android backup remains disabled", /android:allowBackup="false"/.test(manifest));
check("Android launcher activity is explicit and launchable", Boolean(launcherActivity && /android:exported="true"/.test(launcherActivity) && /android\.intent\.action\.MAIN/.test(launcherActivity) && /android\.intent\.category\.LAUNCHER/.test(launcherActivity));
check("Android branded launcher icon exists", fs.existsSync(path.join(root, "android/app/src/main/res/drawable/mvmcmd_logo.xml")));
check("desktop entry points exist", ["desktop/main.cjs", "desktop/preload.cjs", "desktop/security.cjs"].every((file) => fs.existsSync(path.join(root, file))));
check("camera, QR, wallpaper, English and notification native entry points exist", [
  "android/app/src/main/java/com/mvmcmd/launcher/MvmCameraActivity.java",
  "android/app/src/main/java/com/mvmcmd/launcher/MvmQrActivity.java",
  "android/app/src/main/java/com/mvmcmd/launcher/MvmWallpaperActivity.java",
  "android/app/src/main/java/com/mvmcmd/launcher/MvmEnglishActivity.java",
  "android/app/src/main/java/com/mvmcmd/launcher/MvmEnglishStudioActivity.java",
  "android/app/src/main/java/com/mvmcmd/launcher/MvmNotificationCenterActivity.java",
].every((file) => fs.existsSync(path.join(root, file))));

if (failures.length > 0) {
  console.error(`\nRELEASE_CANDIDATE_METADATA_FAILED: ${failures.length} failure(s), ${checks.length} passed check(s).`);
  process.exitCode = 1;
} else {
  console.log(`\nRELEASE_CANDIDATE_METADATA_SUCCESS: ${checks.length} checks passed.`);
}
