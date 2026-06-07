import type { AppConfig } from './types.ts'
import { weflowUrl } from './weflow-http.ts'

interface Contact {
  username?: string
  nickname?: string
  remark?: string
  displayName?: string
  [k: string]: unknown
}

const cache = new Map<string, string>()
const fullCache = new Map<string, Contact>()
let lastRefreshed = 0

export async function refreshContacts(config: AppConfig): Promise<void> {
  try {
    const url = weflowUrl(config, '/api/v1/contacts')
    const res = await fetch(url, { headers: authHeaders(config) })
    if (!res.ok) {
      console.warn('[contacts] GET /contacts ->', res.status)
      return
    }
    const json = (await res.json()) as unknown
    const list = pickContactList(json)
    let n = 0
    for (const c of list) {
      const id = c.username
      if (!id) continue
      const name = c.remark || c.nickname || c.displayName || id
      cache.set(id, name)
      fullCache.set(id, c)
      n++
    }
    lastRefreshed = Date.now()
    console.log(`[contacts] cached ${n} contacts`)
  } catch (err) {
    console.warn('[contacts] refresh failed', (err as Error).message)
  }
}

export function resolveName(username: string | undefined): string | null {
  if (!username) return null
  return cache.get(username) ?? null
}

export function getContact(username: string | undefined): Contact | null {
  if (!username) return null
  return fullCache.get(username) ?? null
}

export function lastRefreshedAt(): number {
  return lastRefreshed
}

function authHeaders(config: AppConfig): Record<string, string> {
  return config.weflowToken ? { Authorization: `Bearer ${config.weflowToken}` } : {}
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
