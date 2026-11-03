#!/bin/zsh
# Builds LidWiFi.app and LidWiFi.dmg (no Xcode project needed).
# Double-clicking LidWiFi.app anywhere automatically installs it into /Applications and the menu bar.
set -euo pipefail
cd "$(dirname "$0")"

APP=build/LidWiFi.app
DMG=build/LidWiFi.dmg
STAGE=build/dmg_stage

rm -rf build && mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
[[ -f icon/AppIcon.icns ]] || ./icon/make_icon.sh
cp icon/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>LidWiFi</string>
  <key>CFBundleDisplayName</key><string>LidWiFi</string>
  <key>CFBundleIdentifier</key><string>com.danielrojas.lidwifi</string>
  <key>CFBundleExecutable</key><string>LidWiFi</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundleIconName</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>LSUIElement</key><true/>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST

swiftc -O -target arm64-apple-macosx13.0 \
  -framework AppKit -framework CoreWLAN -framework IOKit -framework ServiceManagement \
  Sources/main.swift -o "$APP/Contents/MacOS/LidWiFi-arm64"

swiftc -O -target x86_64-apple-macosx13.0 \
  -framework AppKit -framework CoreWLAN -framework IOKit -framework ServiceManagement \
  Sources/main.swift -o "$APP/Contents/MacOS/LidWiFi-x86_64"

lipo -create -output "$APP/Contents/MacOS/LidWiFi" \
  "$APP/Contents/MacOS/LidWiFi-arm64" "$APP/Contents/MacOS/LidWiFi-x86_64"
rm -f "$APP/Contents/MacOS/LidWiFi-arm64" "$APP/Contents/MacOS/LidWiFi-x86_64"

codesign --force --deep --sign - "$APP"
echo "Built $APP"

# Build DMG containing LidWiFi.app (double-click to auto-install into menu bar)
mkdir -p "$STAGE"
cp -R "$APP" "$STAGE/"
cp icon/AppIcon.icns "$STAGE/.VolumeIcon.icns"
SetFile -c icnC "$STAGE/.VolumeIcon.icns" 2>/dev/null || true
SetFile -a C "$STAGE" 2>/dev/null || true

hdiutil create -volname "LidWiFi" -srcfolder "$STAGE" -ov -format UDZO "$DMG" >/dev/null
rm -rf "$STAGE"
cp -f "$DMG" ./LidWiFi.dmg
echo "Built $DMG and ./LidWiFi.dmg"

if [[ "${1:-}" == "--install" ]]; then
  pkill -x LidWiFi 2>/dev/null || true
  rm -rf /Applications/LidWiFi.app
  cp -R "$APP" /Applications/
  open /Applications/LidWiFi.app --args --installed
  echo "Installed and launched /Applications/LidWiFi.app"
fi
