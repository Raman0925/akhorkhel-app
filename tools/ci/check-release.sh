#!/usr/bin/env bash
# Release policy checks on the built APK/AAB (handover 3.1, 4, 7.4). Fails CI on any violation.
set -euo pipefail

APK=android/app/build/outputs/apk/release/app-release-unsigned.apk
[ -f "$APK" ] || APK=android/app/build/outputs/apk/release/app-release.apk
AAB=$(ls android/app/build/outputs/bundle/release/*.aab)
BT=$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)

echo "== Permissions in the merged manifest"
PERMS=$("$BT/aapt2" dump permissions "$APK" | grep -oE "name='[^']+'" | sed "s/name='//; s/'//" | sort -u)
echo "$PERMS"
ALLOWED="android.permission.INTERNET
android.permission.ACCESS_NETWORK_STATE
in.akhorkhel.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"
UNEXPECTED=$(comm -23 <(echo "$PERMS") <(echo "$ALLOWED" | sort -u) || true)
if [ -n "$UNEXPECTED" ]; then
  echo "::error::Unexpected permissions: $UNEXPECTED"
  exit 1
fi

echo "== targetSdk"
"$BT/aapt2" dump badging "$APK" | grep -E "targetSdkVersion:'36'" >/dev/null || {
  echo "::error::targetSdkVersion must be 36"; exit 1; }

echo "== 16 KB page alignment of native libraries"
"$BT/zipalign" -c -P 16 -v 4 "$APK" | tail -3

echo "== Download size per device (bundletool, worst-case ABI)"
# The AAB holds every ABI; Play delivers one split set per device, so measure that instead.
BUNDLETOOL="$RUNNER_TEMP/bundletool.jar"
[ -f "$BUNDLETOOL" ] || curl -fsSL -o "$BUNDLETOOL" \
  https://github.com/google/bundletool/releases/download/1.18.1/bundletool-all-1.18.1.jar
java -jar "$BUNDLETOOL" build-apks --bundle="$AAB" --output="$RUNNER_TEMP/app.apks" --overwrite \
  --ks=android/app/debug.keystore --ks-pass=pass:android --ks-key-alias=androiddebugkey --key-pass=pass:android
java -jar "$BUNDLETOOL" get-size total --apks="$RUNNER_TEMP/app.apks" --dimensions=ABI | tee "$RUNNER_TEMP/size.csv"
# CSV columns: ABI,MIN,MAX (bytes)
MAX_BYTES=$(tail -n +2 "$RUNNER_TEMP/size.csv" | cut -d, -f3 | sort -n | tail -1)
MAX_MB=$(( MAX_BYTES / 1024 / 1024 ))
echo "Largest per-device download: ${MAX_MB} MB"
if [ "$MAX_MB" -ge 40 ]; then
  echo "::error::Per-device download is ${MAX_MB} MB; it must stay under 40 MB"
  exit 1
fi
echo "All release policy checks passed."
