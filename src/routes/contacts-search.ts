import type { AppConfig } from '../types.ts'
import { authHeaders, weflowUrl } from '../weflow-http.ts'

interface Contact {
  username?: string
  displayName?: string
  remark?: string
  nickname?: string
  alias?: string
  type?: string
}

let cache: { rows: Contact[]; fetchedAt: number } | null = null

export async function handleContactsSearch(url: URL, config: AppConfig): Promise<Response> {
  const q = (url.searchParams.get('q') ?? '').toLowerCase().trim()
  const types = (url.searchParams.get('types') ?? 'friend').split(',').map(s => s.trim()).filter(Boolean)
  await ensureCache(config)
  const all = cache?.rows ?? []
  const filtered = all.filter(c => {
    if (types.length && c.type && !types.includes(c.type)) return false
    if (!q) return true
    return [c.displayName, c.remark, c.nickname, c.alias, c.username].some(v =>
      typeof v === 'string' && v.toLowerCase().includes(q),
    )
  })
  return Response.json({ rows: filtered.slice(0, 100) })
}

async function ensureCache(config: AppConfig): Promise<void> {
  if (cache && Date.now() - cache.fetchedAt < 5 * 60_000) return
  try {
    const res = await fetch(weflowUrl(config, '/api/v1/contacts'), { headers: authHeaders(config) })
    if (!res.ok) return
    const json = (await res.json()) as unknown
    const rows = pickContactList(json)
    cache = { rows, fetchedAt: Date.now() }
  } catch (err) {
    console.warn('[contacts-search] fetch failed', (err as Error).message)
  }
}

function pickContactList(json: unknown): Contact[] {
  if (Array.isArray(json)) return json as Contact[]
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>
    for (const k of ['contacts', 'data', 'items', 'rows', 'list']) {
      if (Array.isArray(o[k])) return o[k] as Contact[]
    }
  }
  return []
}
