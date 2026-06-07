import { createWriteStream, existsSync, renameSync, statSync, unlinkSync } from 'node:fs'
import type { AppConfig } from '../types.ts'
import { modelPath } from '../paths.ts'
import { publish } from '../event-bus.ts'

const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin'

let inFlight: Promise<void> | null = null

export function handleModelDownload(): Response {
  if (inFlight) {
    return Response.json({ status: 'in_progress' })
  }
  inFlight = startDownload().finally(() => {
    inFlight = null
  })
  return Response.json({ status: 'started' })
}

export function handleModelStatus(config: AppConfig): Response {
  const path = config.whisperModel || modelPath()
  if (existsSync(path)) {
    const size = statSync(path).size
    if (size > 100 * 1024 * 1024) return Response.json({ state: 'ready', size })
  }
  if (inFlight) return Response.json({ state: 'downloading' })
  return Response.json({ state: 'missing' })
}

async function startDownload(): Promise<void> {
  const dest = modelPath()
  const partial = `${dest}.partial`
  const startBytes = existsSync(partial) ? statSync(partial).size : 0
  publish({ type: 'model-status', state: 'downloading' })

  try {
    const res = await fetch(MODEL_URL, {
      headers: startBytes > 0 ? { Range: `bytes=${startBytes}-` } : {},
    })
    if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`)
    if (!res.body) throw new Error('no body')

    const totalHeader = res.headers.get('content-length')
    const remaining = totalHeader ? Number(totalHeader) : 0
    const total = startBytes + remaining

    const stream = createWriteStream(partial, { flags: startBytes > 0 ? 'a' : 'w' })
    let downloaded = startBytes
    let lastEmit = 0
    const reader = res.body.getReader()
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      stream.write(value)
      downloaded += value.byteLength
      const now = Date.now()
      if (now - lastEmit > 500) {
        publish({
          type: 'model-progress',
          downloaded,
          total,
          ratio: total > 0 ? downloaded / total : 0,
        })
        lastEmit = now
      }
    }
    stream.close()
    await new Promise<void>(r => stream.on('close', r))
    renameSync(partial, dest)
    publish({ type: 'model-status', state: 'ready' })
    publish({ type: 'model-progress', downloaded, total, ratio: 1 })
  } catch (err) {
    const msg = (err as Error).message
    try {
      if (existsSync(partial) && statSync(partial).size === 0) unlinkSync(partial)
    } catch {
      // ignore
    }
    publish({ type: 'model-status', state: 'failed', error: msg })
    throw err
  }
}
