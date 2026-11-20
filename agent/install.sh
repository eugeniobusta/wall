#!/bin/bash
# Builds "Wall Agent.app", installs it in ~/Applications, gives it your Supabase keys
# (read from ../.env.local), makes it start at login, and launches it.
set -euo pipefail
cd "$(dirname "$0")"
ENV_FILE="../.env.local"

command -v swiftc >/dev/null || { echo "❌ Swift compiler missing. Run: xcode-select --install   then run this script again."; exit 1; }
[ -f "$ENV_FILE" ] || { echo "❌ $ENV_FILE not found. Fill in your keys first (see SETUP.md)."; exit 1; }

get() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"; }
URL=$(get NEXT_PUBLIC_SUPABASE_URL); KEY=$(get SUPABASE_SERVICE_ROLE_KEY)
[ -n "$URL" ] && [ -n "$KEY" ] || { echo "❌ NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is empty in .env.local"; exit 1; }

APP="build/Wall Agent.app"
echo "→ Building…"
rm -rf build && mkdir -p "$APP/Contents/MacOS"
cp Info.plist "$APP/Contents/Info.plist"
swiftc -O WallAgent.swift -o "$APP/Contents/MacOS/WallAgent"
codesign --force --sign - "$APP"   # ad-hoc signature so macOS remembers the permission you grant

echo "→ Installing…"
pkill -x WallAgent 2>/dev/null || true
mkdir -p "$HOME/Applications"
rm -rf "$HOME/Applications/Wall Agent.app"
cp -R "$APP" "$HOME/Applications/"

CONF_DIR="$HOME/Library/Application Support/WallAgent"
mkdir -p "$CONF_DIR"
printf '{"supabaseUrl":"%s","serviceRoleKey":"%s"}\n' "$URL" "$KEY" > "$CONF_DIR/config.json"
chmod 600 "$CONF_DIR/config.json"

echo "→ Starting at login (macOS may ask to let Terminal control System Events: click OK)…"
osascript -e 'tell application "System Events" to delete (every login item whose name is "Wall Agent")' >/dev/null 2>&1 || true
osascript -e "tell application \"System Events\" to make login item at end with properties {path:\"$HOME/Applications/Wall Agent.app\", hidden:true}" >/dev/null || echo "   (Couldn't add the login item. Add 'Wall Agent' manually in System Settings → General → Login Items.)"

open "$HOME/Applications/Wall Agent.app"
echo "✅ Wall Agent is running. Click Allow for Calendars and Reminders when macOS asks."
echo "   Check it worked:  tail -f ~/Library/Logs/WallAgent.log   (you should see 'synced N events')"
