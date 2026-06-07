#!/usr/bin/env bash
# Assemble a macOS .app bundle from compiled artifacts.
# Inputs (in repo root):
#   dist/voice-jp                       (bun --compile output)
#   web/dist/                           (vite build output)
#   ~/whisper.cpp/build/                (must already be built)
# Output: dist/voice-jp.app
set -euo pipefail
cd "$(dirname "$0")/.."

APP="dist/voice-jp.app"
WHISPER_BUILD="${WHISPER_BUILD:-$HOME/whisper.cpp/build}"

if [[ ! -f dist/voice-jp ]]; then
  echo "[assemble] ERROR: dist/voice-jp not found. Run \`bun build --compile\` first." >&2
  exit 1
fi
if [[ ! -d web/dist ]]; then
  echo "[assemble] ERROR: web/dist not found. Run \`bun run web:build\` first." >&2
  exit 1
fi
if [[ ! -f "$WHISPER_BUILD/bin/whisper-cli" ]]; then
  echo "[assemble] ERROR: whisper-cli not found at $WHISPER_BUILD/bin/whisper-cli" >&2
  echo "  Build whisper.cpp first or set WHISPER_BUILD=/path/to/whisper.cpp/build" >&2
  exit 1
fi

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/bin/lib" "$APP/Contents/Resources/web"

# 1. Bun-compiled binary
cp dist/voice-jp "$APP/Contents/MacOS/voice-jp"
chmod +x "$APP/Contents/MacOS/voice-jp"

# 2. whisper-cli
cp "$WHISPER_BUILD/bin/whisper-cli" "$APP/Contents/Resources/bin/whisper-cli"
chmod +x "$APP/Contents/Resources/bin/whisper-cli"

# 3. dylibs (resolve symlinks; copy with the loader-expected name)
LIBS=(libwhisper.1 libggml.0 libggml-cpu.0 libggml-blas.0 libggml-metal.0 libggml-base.0)
for lib in "${LIBS[@]}"; do
  src="$(find "$WHISPER_BUILD" -name "${lib}.dylib" -not -path '*/CMakeFiles/*' | head -1)"
  if [[ -z "$src" ]]; then
    echo "[assemble] ERROR: dylib ${lib}.dylib not found in $WHISPER_BUILD" >&2
    exit 1
  fi
  cp -L "$src" "$APP/Contents/Resources/bin/lib/${lib}.dylib"
done

# 4. rpath: whisper-cli looks in its sibling lib/ dir at runtime
install_name_tool -delete_rpath "$WHISPER_BUILD/src" \
  "$APP/Contents/Resources/bin/whisper-cli" 2>/dev/null || true
install_name_tool -delete_rpath "$WHISPER_BUILD/ggml/src" \
  "$APP/Contents/Resources/bin/whisper-cli" 2>/dev/null || true
install_name_tool -delete_rpath "$WHISPER_BUILD/ggml/src/ggml-blas" \
  "$APP/Contents/Resources/bin/whisper-cli" 2>/dev/null || true
install_name_tool -delete_rpath "$WHISPER_BUILD/ggml/src/ggml-metal" \
  "$APP/Contents/Resources/bin/whisper-cli" 2>/dev/null || true
install_name_tool -add_rpath @executable_path/lib \
  "$APP/Contents/Resources/bin/whisper-cli"

# 5. Web SPA
cp -R web/dist/* "$APP/Contents/Resources/web/"

# 6. Info.plist
cp scripts/Info.plist "$APP/Contents/Info.plist"

# 7. Ad-hoc sign each binary individually (bun --compile output doesn't pass strict validation, so skip --deep).
#    The friend will right-click → Open anyway to bypass Gatekeeper.
codesign --force --sign - "$APP/Contents/Resources/bin/whisper-cli" 2>/dev/null || true
for dylib in "$APP/Contents/Resources/bin/lib"/*.dylib; do
  codesign --force --sign - "$dylib" 2>/dev/null || true
done
codesign --force --sign - "$APP/Contents/MacOS/voice-jp" 2>/dev/null || true
codesign --force --sign - "$APP" 2>/dev/null || echo "[assemble] note: bundle signing skipped (right-click → Open bypasses Gatekeeper anyway)"

echo "[assemble] OK → $APP ($(du -sh "$APP" | awk '{print $1}'))"
