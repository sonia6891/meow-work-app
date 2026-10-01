#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   DEVICE_UDID=<simulator-udid> ./scripts/ios-app-store-status-bar.sh
# Optional:
#   APP_STORE_TIME=09:41 DEVICE_UDID=... ./scripts/ios-app-store-status-bar.sh

UDID="${DEVICE_UDID:-}"
TIME="${APP_STORE_TIME:-09:41}"

if [[ -z "$UDID" ]]; then
  echo "DEVICE_UDID is required."
  echo "Find it with: xcrun simctl list devices available"
  exit 64
fi

xcrun simctl bootstatus "$UDID" -b

# Clear any stale override before applying the deterministic App Store state.
xcrun simctl status_bar "$UDID" clear || true
xcrun simctl status_bar "$UDID" override \
  --time "$TIME" \
  --dataNetwork wifi \
  --wifiMode active \
  --wifiBars 3 \
  --cellularMode active \
  --cellularBars 4 \
  --batteryState charged \
  --batteryLevel 100

echo "App Store status bar ready on $UDID: $TIME, full Wi-Fi/cellular, 100% battery."
echo "Capture example:"
echo "  xcrun simctl io $UDID screenshot store-assets/native-ios/captures/01-home.png"
