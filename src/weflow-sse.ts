import type { AppConfig, WeflowMessage } from './types.ts'
import { authHeaders, weflowUrl } from './weflow-http.ts'
import { publish } from './event-bus.ts'

type Handler = (event: string, data: unknown) => void | Promise<void>

export function startSseLoop(config: AppConfig, handler: Handler): void {
  let abort: AbortController | null = null
  let stopped = false

  const connect = async (): Promise<void> => {
    if (stopped) return
    abort = new AbortController()
    const url = weflowUrl(config, '/api/v1/push/messages', config.weflowToken ? { access_token: config.weflowToken } : undefined)
    try {
      const res = await fetch(url, { signal: abort.signal, headers: { Accept: 'text/event-stream', ...authHeaders(config) } })
      if (!res.ok || !res.body) throw new Error(`SSE responded ${res.status}`)
      console.log('[sse] connected', url)
      publish({ type: 'weflow-status', connected: true })
      await consume(res.body, handler)
      console.log('[sse] stream closed by server, reconnecting in 3s')
    } catch (err) {
      if (!stopped) console.warn('[sse] error:', (err as Error).message, '→ reconnect in 3s')
      publish({ type: 'weflow-status', connected: false })
    }
    if (!stopped) setTimeout(connect, 3000)
  }

  connect()

  process.on('SIGINT', () => {
    stopped = true
    abort?.abort()
  })
}

async function consume(body: ReadableStream<Uint8Array>, handler: Handler): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      await dispatch(chunk, handler)
    }
  }
}

async function dispatch(chunk: string, handler: Handler): Promise<void> {
  let event = 'message'
  const dataLines: string[] = []
  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  if (dataLines.length === 0) return
  const raw = dataLines.join('\n')
  let data: unknown = raw
  try {
    data = JSON.parse(raw)
  } catch {
    // keep raw string
  }
  await handler(event, data)
}

export function extractMessage(data: unknown): WeflowMessage | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  if (o.localId || o.serverId || o.mediaType) return o as WeflowMessage
  const inner = (o.data ?? o.message) as Record<string, unknown> | undefined
  if (inner && typeof inner === 'object') return inner as WeflowMessage
  return null
}
