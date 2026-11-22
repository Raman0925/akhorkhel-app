#!/usr/bin/env bash
# Runs inside android-emulator-runner. Installs the APK and runs every Maestro flow in e2e/.
set -euo pipefail
adb install -r android/app/build/outputs/apk/release/app-release.apk
mkdir -p e2e/results
maestro test e2e --format junit --output e2e/results/report.xml --test-output-dir e2e/results
