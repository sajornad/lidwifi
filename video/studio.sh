#!/bin/zsh
# Starts the LidWiFi Motion Graphics Studio server and opens it in the browser
set -euo pipefail
cd "$(dirname "$0")"

echo "🎨 Launching LidWiFi Studio..."
# Recompile SVG from content.json first to ensure sync
node render_svg.js
node update_preview.js

# Check if port 3333 is in use, kill if previous instance is hanging
lsof -ti:3333 | xargs kill -9 2>/dev/null || true

# Start server in background
node studio_server.js &
SERVER_PID=$!

sleep 1

# Open in browser
open "http://localhost:3333/preview.html"

echo "Studio running on PID $SERVER_PID. Press Ctrl+C to stop."
wait $SERVER_PID
