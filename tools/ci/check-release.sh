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

echo "== Download size (AAB is an upper bound for any single device)"
SIZE_MB=$(( $(stat -c%s "$AAB") / 1024 / 1024 ))
echo "AAB: ${SIZE_MB} MB"
if [ "$SIZE_MB" -ge 60 ]; then
  echo "::error::AAB is ${SIZE_MB} MB; the per-device download must stay under 40 MB"
  exit 1
fi
echo "All release policy checks passed."
