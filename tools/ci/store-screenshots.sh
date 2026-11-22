#!/usr/bin/env bash
# Runs inside android-emulator-runner (store-assets workflow): takes the Play screenshots in
# Assamese and English and collects them into store-assets/raw/<device>/.
# Usage: tools/ci/store-screenshots.sh <phone|tablet7|tablet10> <apk>
set -u
DEVICE="${1:-phone}"
APK="${2:-android/app/build/outputs/apk/release/app-release.apk}"

# Tablets run on the same emulator image with a tablet-sized screen (-skin in the workflow) and a
# tablet density: 1200 × 1920 @ 320 dpi ≈ 7" (600 dp wide), 1600 × 2560 @ 320 dpi ≈ 10" (800 dp).
case "$DEVICE" in
  tablet7 | tablet10) adb shell wm density 320 ;;
esac
adb shell wm size
adb shell wm density

adb install -r "$APK"
adb shell settings put system font_scale 1.0
# Clean status bar: fixed clock, full battery and signal, no notifications.
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter >/dev/null
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0930 >/dev/null
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false >/dev/null
adb shell am broadcast -a com.android.systemui.demo -e command network -e mobile show -e level 4 -e datatype none >/dev/null
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false >/dev/null

OUT="store-assets/raw/$DEVICE"
mkdir -p "$OUT" store-assets/debug
STATUS=0
for LANG_CODE in as en; do
  maestro test e2e/screenshots/store.yaml -e APP_LANG="$LANG_CODE" \
    --test-output-dir "store-assets/debug/$DEVICE-$LANG_CODE" || STATUS=1
  # Maestro writes takeScreenshot files under the test output dir
  # (<dir>/<timestamp>/<flow>/takeScreenshot/); older versions use the working directory.
  find "store-assets/debug/$DEVICE-$LANG_CODE" -name "$LANG_CODE-0*.png" -exec cp {} "$OUT/" \;
  find . e2e/screenshots -maxdepth 1 -name "$LANG_CODE-0*.png" -exec mv {} "$OUT/" \;
done
ls -l "$OUT"
exit "$STATUS"
