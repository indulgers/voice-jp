# Building voice-jp.dmg

For distributing to friends. Tested on macOS 14+ Apple Silicon.

## Prerequisites (build machine)

```bash
brew install bun cmake
git clone https://github.com/ggerganov/whisper.cpp ~/whisper.cpp
cd ~/whisper.cpp
cmake -B build -DGGML_METAL=1
cmake --build build -j --config Release
```

## Build

```bash
cd voice-jp/
bun install
bash scripts/build-mac.sh
```

Output: `dist/voice-jp.dmg` (~22MB).

Steps the script runs:
1. `bun run web:build` → `web/dist/`
2. `bun build --compile --target=bun-darwin-arm64 --minify` → `dist/voice-jp` (~52MB)
3. `scripts/assemble-app.sh` → `dist/voice-jp.app/` with whisper-cli + 6 dylibs (rpath fixed) + web/dist
4. `hdiutil create -format UDZO` → `dist/voice-jp.dmg`

## How the .app finds things at runtime

- `Contents/MacOS/voice-jp` (Bun binary) detects bundle via `process.execPath.includes('/Contents/MacOS/')`
- Read-only assets resolved relative to `Contents/Resources/`:
  - `bin/whisper-cli` + `bin/lib/*.dylib` (rpath: `@executable_path/lib`)
  - `web/index.html` etc.
- User data lives in `~/Library/Application Support/voice-jp/`:
  - `config.json` (created with defaults on first launch)
  - `voice-jp.db` (SQLite)
  - `cache/` (downloaded wav)
  - `models/ggml-large-v3.bin` (downloaded on first launch via UI wizard)
- Audio resampling: macOS-native `/usr/bin/afconvert` (no ffmpeg needed)

## Why no notarization / Apple Developer ID

Friends right-click → Open the .app once to bypass Gatekeeper. Cost: 1 confusing dialog × 1 time. Savings: $99/year + days of dev cert tooling.

For wide distribution, change `scripts/assemble-app.sh` to use a real Developer ID Application certificate (`codesign --sign "Developer ID Application: …"`) then notarize via `notarytool`.

## Known gotchas

- **Bun strict-validation signing fails**: Bun-compiled binaries embed JS at the end, which Apple's `codesign --deep --strict` rejects. We sign each binary loosely (no `--deep`) so the bundle is "signed but not strict-validated". Right-click → Open works anyway.
- **`bun:sqlite` + LIMIT parameter binding**: In Bun-compiled binaries, binding `LIMIT $n` via prepared statement params throws `SQLITE_NOMEM`. Workaround: inline a sanitized integer into SQL string (see `recentStmtFor` in `src/store.ts`).
- **`set -e` + ad-hoc codesign**: Bundle-level codesign fails by design (above), so we wrap in `|| echo`. Don't add `--deep` back.
