#!/bin/bash
# voice-jp 一行安装脚本。绕过 Sequoia Gatekeeper 对未签名 app 的拦截。
#
# 用法（在终端里粘一行）：
#   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/indulgers/voice-jp/main/install.sh)"
#
# 工作原理：
#   - 浏览器（Chrome/Safari）下载的文件会被打上 com.apple.quarantine
#     属性 → 没付苹果 $99/年的 app 会被报"已损坏"。
#   - curl 下载的文件不会被打 quarantine → 直接装就能开。
# 升级、首装、出错重装 → 都跑这一行就行。

set -euo pipefail

DMG_URL="https://github.com/indulgers/voice-jp/releases/latest/download/voice-jp.dmg"
DMG_PATH="/tmp/voice-jp-install.dmg"
MOUNT_POINT="/Volumes/voice-jp"
DEST="/Applications/voice-jp.app"

step() { printf "\033[1;34m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m! %s\033[0m\n" "$*"; }

require_macos() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "✗ 只支持 macOS。当前是 $(uname -s)。" >&2
    exit 1
  fi
  if [[ "$(uname -m)" != "arm64" ]]; then
    warn "你这台 Mac 是 $(uname -m)，不是 Apple Silicon (arm64)。voice-jp 只编了 arm64 二进制，可能跑不起来。"
  fi
}

cleanup() {
  if mount | grep -q "$MOUNT_POINT"; then
    hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
  fi
  rm -f "$DMG_PATH"
}
trap cleanup EXIT

require_macos

step "检查 WeFlow 是否在运行 (端口 5031)"
if curl -fsS --max-time 2 http://127.0.0.1:5031/health >/dev/null 2>&1; then
  ok "WeFlow 已运行"
else
  warn "WeFlow 没在运行 — voice-jp 装好后启动界面会提示你先开 WeFlow"
fi

step "如果 voice-jp 已经开着，先关掉"
pkill -9 -f "voice-jp.app/Contents/MacOS" 2>/dev/null || true
sleep 1

step "从 GitHub 下载最新 voice-jp.dmg（约 22MB）"
rm -f "$DMG_PATH"
curl -fL --progress-bar -o "$DMG_PATH" "$DMG_URL"
ok "下载完成：$(du -h "$DMG_PATH" | awk '{print $1}')"

step "挂载 dmg"
if mount | grep -q "$MOUNT_POINT"; then
  hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
fi
hdiutil attach "$DMG_PATH" -nobrowse -quiet

step "复制 voice-jp.app 到 /Applications"
if [[ -d "$DEST" ]]; then
  rm -rf "$DEST"
fi
cp -R "$MOUNT_POINT/voice-jp.app" "$DEST"
ok "已装到 $DEST"

step "去除 com.apple.quarantine（绕过 Gatekeeper）"
xattr -cr "$DEST"
if xattr "$DEST" 2>/dev/null | grep -q quarantine; then
  echo "✗ 去 quarantine 失败" >&2
  exit 1
fi
ok "已清"

step "启动 voice-jp"
open "$DEST"
sleep 2

ok "完成！浏览器应该会自动打开 http://localhost:7788"
echo
echo "如果浏览器没自动弹，自己打开这个地址："
echo "  http://localhost:7788"
