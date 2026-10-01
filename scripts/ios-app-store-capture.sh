#!/usr/bin/env bash
set -euo pipefail

# Deterministic raw screenshot capture for App Store production.
# This script intentionally does not navigate the app: each named shot pauses
# until the operator/automation has the requested real app screen ready.
#
# Usage:
#   DEVICE_UDID=<udid> ./scripts/ios-app-store-capture.sh
# Optional:
#   OUTPUT_DIR=... DEVICE_UDID=<udid> ./scripts/ios-app-store-capture.sh

UDID="${DEVICE_UDID:-}"
OUT="${OUTPUT_DIR:-store-assets/native-ios/captures/raw}"

if [[ -z "$UDID" ]]; then
  echo "DEVICE_UDID is required. Find it with: xcrun simctl list devices available"
  exit 64
fi

mkdir -p "$OUT"
xcrun simctl bootstatus "$UDID" -b

# Reuse the canonical status-bar setup.
DEVICE_UDID="$UDID" "$(dirname "$0")/ios-app-store-status-bar.sh"

shots=(
  "01-home"
  "02-schedule"
  "03-overtime-leave-tasks"
  "04-payroll"
  "05-payroll-pro"
  "06-cat-assistant"
  "07-labor-law"
  "08-brand-home"
)

labels=(
  "總覽首頁"
  "排班／輪班日曆"
  "加班、請假、待辦"
  "薪資對帳"
  "薪資對帳 Pro"
  "喵助理"
  "勞基法問答"
  "品牌收尾用真實 UI"
)

for i in "${!shots[@]}"; do
  name="${shots[$i]}"
  label="${labels[$i]}"
  printf "\n[%d/8] 請讓模擬器停在：%s\n" "$((i+1))" "$label"
  read -r -p "確認畫面已就緒後按 Enter 截圖；輸入 s 再 Enter 可跳過：" answer
  if [[ "$answer" == "s" || "$answer" == "S" ]]; then
    echo "Skipped $name"
    continue
  fi

  file="$OUT/$name.png"
  xcrun simctl io "$UDID" screenshot "$file"
  echo "Captured $file"
done

echo
echo "Raw capture complete: $OUT"
echo "Next: run scripts/ios-app-store-validate.py $OUT"
