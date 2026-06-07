import type { AppConfig, WeflowMessage } from './types.ts'

export function weflowUrl(config: AppConfig, path: string, query?: Record<string, string | number>): string {
  const u = new URL(path, config.weflowBase)
  if (query) for (const [k, v] of Object.entries(query)) u.searchParams.set(k, String(v))
  return u.toString()
}

export function authHeaders(config: AppConfig): Record<string, string> {
  return config.weflowToken ? { Authorization: `Bearer ${config.weflowToken}` } : {}
}

export async function fetchMessagesByTalker(config: AppConfig, talker: string, limit = 50, media = true): Promise<WeflowMessage[]> {
  const query: Record<string, string | number> = { talker, limit }
  if (media) {
    query.media = 1
    query.voice = 1
  }
  const url = weflowUrl(config, '/api/v1/messages', query)
  const res = await fetch(url, { headers: authHeaders(config) })
  if (!res.ok) return []
  const json = (await res.json()) as unknown
  return pickList(json) as WeflowMessage[]
}

export async function findMessage(config: AppConfig, talker: string, serverId: string): Promise<WeflowMessage | null> {
  const msgs = await fetchMessagesByTalker(config, talker, 20)
  return msgs.find(m => String(m.serverId ?? '') === serverId) ?? null
}

export async function fetchSessions(config: AppConfig): Promise<Array<{ id: string; [k: string]: unknown }>> {
  const url = weflowUrl(config, '/api/v1/sessions')
  const res = await fetch(url, { headers: authHeaders(config) })
  if (!res.ok) return []
  const json = (await res.json()) as unknown
  const list = pickList(json)
  return list.map((s: any) => ({ id: String(s.id ?? s.sessionId ?? s.username ?? ''), ...s })).filter(s => s.id)
}

export async function fetchSessionMessages(config: AppConfig, sessionId: string, limit = 200): Promise<WeflowMessage[]> {
  return fetchMessagesByTalker(config, sessionId, limit)
}

export async function downloadMedia(config: AppConfig, mediaPathOrUrl: string, destPath: string): Promise<{ contentType: string } | null> {
  const url = mediaPathOrUrl.startsWith('http')
    ? mediaPathOrUrl
    : weflowUrl(config, mediaPathOrUrl.startsWith('/') ? mediaPathOrUrl : `/api/v1/media/${mediaPathOrUrl}`)
  const res = await fetch(url, { headers: authHeaders(config) })
  if (!res.ok) return null
  const buf = await res.arrayBuffer()
  await Bun.write(destPath, buf)
  return { contentType: res.headers.get('content-type') ?? 'audio/wav' }
}

function pickList(json: unknown): any[] {
  if (Array.isArray(json)) return json
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>
    for (const k of ['data', 'items', 'messages', 'sessions', 'contacts', 'rows', 'list']) {
      if (Array.isArray(o[k])) return o[k] as any[]
    }
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) return v as any[]
    }
  }
  return []
}

function pickFirstMessage(json: unknown): WeflowMessage | null {
  if (!json || typeof json !== 'object') return null
  if (Array.isArray(json)) return (json[0] as WeflowMessage) ?? null
  const o = json as Record<string, unknown>
  if (o.localId || o.serverId) return o as WeflowMessage
  const list = pickList(json)
  return (list[0] as WeflowMessage) ?? null
}
