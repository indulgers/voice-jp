import { existsSync, statSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import { getConfig, loadConfig, onConfigChange, watchConfigFile } from './config.ts'
import { refreshContacts } from './contacts-cache.ts'
import { startSseLoop, extractMessage } from './weflow-sse.ts'
import { ingestMessage } from './ingest.ts'
import { replayRecent } from './replay.ts'
import { handleStream } from './routes/stream.ts'
import { handleMessages } from './routes/messages.ts'
import { handleRetry } from './routes/retry.ts'
import { handleAudio } from './routes/audio.ts'
import { handleDebugRecentVoice } from './routes/debug.ts'
import { handlePreflight } from './routes/preflight.ts'
import { handleConfigRead, handleConfigWrite } from './routes/config-write.ts'
import { handleContactsSearch } from './routes/contacts-search.ts'
import { handleModelDownload, handleModelStatus } from './routes/model-download.ts'
import { isBundled, webDistDir } from './paths.ts'

;(async () => {
  const config = loadConfig()

  warnPreflight()

  await refreshContacts(config)
  setInterval(() => refreshContacts(getConfig()), 10 * 60 * 1000)

  startSseLoop(config, async (event, data) => {
    if (event !== 'message.new') return
    const msg = extractMessage(data)
    if (!msg) return
    try {
      await ingestMessage(msg, getConfig())
    } catch (err) {
      console.warn('[ingest] threw', (err as Error).message)
    }
  })

  replayRecent(getConfig()).catch(err => console.warn('[replay] failed', (err as Error).message))

  onConfigChange(next => {
    console.log(`[config] applied: whitelist=[${next.whitelist.join(', ')}] language=${next.whisperLanguage}`)
  })
  watchConfigFile()

  Bun.serve({
    port: config.port,
    fetch(req) {
      const url = new URL(req.url)
      const { pathname } = url
      const cfg = getConfig()

      if (pathname === '/events') return handleStream()
      if (pathname === '/api/preflight') return handlePreflight(cfg)
      if (pathname === '/api/config' && req.method === 'GET') return handleConfigRead(cfg)
      if (pathname === '/api/config' && req.method === 'POST') return handleConfigWrite(req)
      if (pathname === '/api/contacts/search') return handleContactsSearch(url, cfg)
      if (pathname === '/api/model/status') return handleModelStatus(cfg)
      if (pathname === '/api/model/download' && req.method === 'POST') return handleModelDownload()
      if (pathname === '/api/messages' && req.method === 'GET') return handleMessages(url)
      if (pathname.startsWith('/api/messages/') && pathname.endsWith('/retry') && req.method === 'POST') {
        const id = pathname.slice('/api/messages/'.length, -'/retry'.length)
        return handleRetry(id, cfg)
      }
      if (pathname.startsWith('/api/audio/')) {
        return handleAudio(pathname.slice('/api/audio/'.length))
      }
      if (pathname === '/api/debug/recent-voice') return handleDebugRecentVoice(cfg, url)
      if (pathname === '/api/config/whitelist') return Response.json({ whitelist: cfg.whitelist })

      return serveStatic(pathname)
    },
  })

  console.log(`[server] listening on http://localhost:${config.port}`)

  if (isBundled()) {
    setTimeout(() => {
      Bun.spawn(['open', `http://localhost:${config.port}`], { stdout: 'ignore', stderr: 'ignore' })
    }, 800)
  }
})().catch(err => {
  console.error('[fatal]', err)
  process.exit(1)
})

function warnPreflight(): void {
  const cfg = getConfig()
  if (!existsSync(cfg.whisperBin)) {
    console.warn(`[preflight] whisper binary missing at ${resolve(cfg.whisperBin)} — transcription will fail until it exists`)
  }
  if (!existsSync(cfg.whisperModel)) {
    console.warn(`[preflight] whisper model missing at ${resolve(cfg.whisperModel)} — UI wizard will offer to download it`)
  }
  if (cfg.whitelist.length === 0) {
    console.warn('[preflight] whitelist is empty — UI wizard will help pick contacts')
  }
}

function serveStatic(pathname: string): Response {
  const distRoot = webDistDir()
  if (!existsSync(distRoot)) {
    return new Response(
      'web dist not found. Run `bun run web:build` first (or `bun run web:dev` separately for dev).',
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    )
  }
  const rel = pathname === '/' ? '/index.html' : pathname
  const abs = resolve(distRoot + rel)
  if (!abs.startsWith(distRoot + sep) && abs !== distRoot) return new Response('forbidden', { status: 403 })
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    const index = resolve(distRoot + '/index.html')
    return new Response(Bun.file(index))
  }
  const file = Bun.file(abs)
  return new Response(file, { headers: { 'Content-Type': contentTypeFor(extname(abs)) || file.type } })
}

function contentTypeFor(ext: string): string | undefined {
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8'
    case '.js': return 'application/javascript; charset=utf-8'
    case '.css': return 'text/css; charset=utf-8'
    case '.json': return 'application/json; charset=utf-8'
    case '.svg': return 'image/svg+xml'
    case '.png': return 'image/png'
    case '.ico': return 'image/x-icon'
    default: return undefined
  }
}
