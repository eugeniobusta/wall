#!/bin/bash
# Builds "Wall Display.app" in ~/Applications: opens the wall in a chromeless window
# and keeps the display awake for as long as that window is open.
set -euo pipefail
APP="$HOME/Applications/Wall Display.app"
URL="${1:-https://wall.eugeniobusta.com/wall}"

rm -rf "$APP" && mkdir -p "$APP/Contents/MacOS"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key><string>com.eugeniobusta.wall-display</string>
  <key>CFBundleName</key><string>Wall Display</string>
  <key>CFBundleExecutable</key><string>WallDisplay</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
PLIST

cat > "$APP/Contents/MacOS/WallDisplay" <<SCRIPT
#!/bin/bash
URL="$URL"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ -x "\$CHROME" ]; then
  # Its own profile, so this Chrome is a separate process that lives exactly as long as the wall
  # window (and stays signed in to the wall only). caffeinate -d holds the display awake meanwhile.
  exec caffeinate -d "\$CHROME" --app="\$URL" --user-data-dir="\$HOME/Library/Application Support/WallDisplay" \\
    --no-first-run --no-default-browser-check --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required
else
  open -a Safari "\$URL"
  sleep 3
  exec caffeinate -d -w "\$(pgrep -x Safari | head -1)"
fi
SCRIPT
chmod +x "$APP/Contents/MacOS/WallDisplay"
codesign --force --sign - "$APP" >/dev/null 2>&1 || true
echo "✅ Installed $APP"
