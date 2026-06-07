#!/usr/bin/env bash
# Full build: bun compile + web build + .app assemble + DMG.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> [1/4] vite build front-end"
bun run web:build

echo "==> [2/4] bun --compile daemon"
mkdir -p dist
bun build --compile --target=bun-darwin-arm64 --minify ./src/server.ts --outfile dist/voice-jp

echo "==> [3/4] assemble .app"
bash scripts/assemble-app.sh

echo "==> [4/4] build .dmg"
rm -f dist/voice-jp.dmg
hdiutil create -volname "voice-jp" \
  -srcfolder dist/voice-jp.app \
  -ov -format UDZO \
  dist/voice-jp.dmg

echo
echo "✓ Built: dist/voice-jp.dmg ($(du -sh dist/voice-jp.dmg | awk '{print $1}'))"
