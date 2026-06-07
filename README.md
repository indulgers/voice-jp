# voice-jp

> 微信语音 → 日文文字。完全本地，零云端，零月费。

WeChat doesn't transcribe voice messages, especially not from Japanese friends. This is a small Mac (Apple Silicon) tool that automates it:

```
微信 ──► WeFlow :5031  ──SSE──►  voice-jp daemon (Bun)
                                 ├ 白名单过滤
                                 ├ 下载 wav (via WeFlow /api/v1/media)
                                 ├ whisper.cpp + Metal 转写
                                 └ HTTP+SSE :7788
                                          ▼
                                 浏览器小窗 (Vue 3)
```

- **本地推理**：whisper.cpp + ggml-large-v3，M 系列 Metal 加速，每条语音 ~2-3 秒
- **零云依赖**：聊天内容和音频不出本机；模型只下载一次（3GB）
- **白名单过滤**：只转你关心的人，陌生人/群广播自动忽略
- **实时 + 历史**：SSE 推送新消息；启动时自动补转 24h 内漏掉的

## Quick start (普通用户)

1. 装 [WeFlow](https://github.com/hicccc77/WeFlow)，登录微信，开启 HTTP API + Message Push
2. 打开终端，粘下面这一行回车：

   ```sh
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/indulgers/voice-jp/main/install.sh)"
   ```

3. 浏览器自动弹出向导，4 步配完（粘 token / 下模型 / 选监听联系人）

> 为什么必须用终端而不是双击 dmg？因为 voice-jp 没付苹果 $99/年的签名费，Sequoia 会把浏览器下载的 dmg 一律标"已损坏"。这一行用 `curl` 直接拿 dmg —— `curl` 下载的文件不会被 macOS 拦截。**升级新版本也是同一行**。

完整图文步骤、常见问题、隐私说明见 **[INSTALL.md](INSTALL.md)**。

## Develop / Build

```bash
# 一次性环境
brew install bun cmake
git clone https://github.com/ggerganov/whisper.cpp ~/whisper.cpp
cd ~/whisper.cpp && cmake -B build -DGGML_METAL=1 && cmake --build build -j

# voice-jp
git clone https://github.com/indulgers/voice-jp
cd voice-jp
bun install

# dev: 直接跑（用 bun run，热重载）
bun run dev
bun run web:dev  # 另一个 terminal，前端热更新（代理到 :7788）

# release: 打 .dmg
bash scripts/build-mac.sh        # → dist/voice-jp.dmg
```

详见 **[BUILD.md](BUILD.md)**（包括 rpath / codesign 坑点）。

## 架构 / 文件

| 路径 | 作用 |
|---|---|
| `src/server.ts` | Bun 入口（单进程） |
| `src/weflow-sse.ts` + `weflow-http.ts` | WeFlow client，订阅 SSE + 调 REST |
| `src/ingest.ts` | 一条消息的完整处理路径（白名单 → 下载 → 入库 → 排队） |
| `src/transcriber.ts` | whisper.cpp 子进程队列 + macOS 原生 afconvert 重采样 |
| `src/replay.ts` | 启动时 24h 历史回放 |
| `src/store.ts` | bun:sqlite 单表 |
| `src/paths.ts` | dev / bundle 模式的路径解析 |
| `src/routes/*.ts` | preflight / config / contacts-search / model-download / messages / stream / audio |
| `web/src/` | Vue 3 SPA（setup wizard + 主列表） |
| `scripts/build-mac.sh` | bun --compile → .app → DMG 全套 |

## 数据保存位置

```
~/Library/Application Support/voice-jp/
├── config.json          # WeFlow token + whitelist + language
├── voice-jp.db          # SQLite (转写历史)
├── cache/               # 下载的 wav
└── models/
    └── ggml-large-v3.bin   # 3GB
```

## Tech stack

- **Runtime**: Bun (TypeScript daemon + single-file `--compile` 部署)
- **ASR**: whisper.cpp + ggml-large-v3 + Metal
- **Audio resample**: macOS-native `/usr/bin/afconvert`（省 80MB ffmpeg）
- **Frontend**: Vue 3 + Vite + native EventSource
- **DB**: `bun:sqlite`
- **Package**: `.app` bundle + UDZO DMG

## 限制 & 不做

- 仅 Mac Apple Silicon（WeFlow 自身限制 + arm64 whisper.cpp 二进制）
- 仅转日语（可改 config.json `whisperLanguage` 为 `zh` / `auto` / 任意 whisper 支持语言）
- 不发回微信（WeFlow API 只读）
- 不自动启动（quit 后需手动开）
- 没签名（朋友右键→打开一次即可；广发需自己加 Developer ID + notarization）

## License

MIT
