import type { AppConfig } from '../types.ts'
import { saveConfig } from '../config.ts'

const ALLOWED_KEYS: ReadonlyArray<keyof AppConfig> = [
  'weflowToken',
  'whitelist',
  'whisperLanguage',
  'replayHours',
  'concurrency',
]

export async function handleConfigWrite(req: Request): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'expected_object' }, { status: 400 })
  }
  const patch: Partial<AppConfig> = {}
  for (const key of ALLOWED_KEYS) {
    const v = (body as Record<string, unknown>)[key]
    if (v === undefined) continue
    if (key === 'whitelist') {
      if (!Array.isArray(v) || v.some(x => typeof x !== 'string')) {
        return Response.json({ error: 'whitelist_must_be_string_array' }, { status: 400 })
      }
      patch.whitelist = v as string[]
    } else if (key === 'replayHours' || key === 'concurrency') {
      if (typeof v !== 'number' || v < 0) {
        return Response.json({ error: `${key}_must_be_positive_number` }, { status: 400 })
      }
      patch[key] = v
    } else if (typeof v === 'string') {
      ;(patch as Record<string, unknown>)[key] = v
    }
  }
  const next = saveConfig(patch)
  return Response.json({ ok: true, config: publicConfig(next) })
}

export function handleConfigRead(config: AppConfig): Response {
  return Response.json({ config: publicConfig(config) })
}

function publicConfig(c: AppConfig): Partial<AppConfig> {
  const { weflowToken, whitelist, whisperLanguage, replayHours, concurrency } = c
  return {
    weflowToken: weflowToken ? `${weflowToken.slice(0, 4)}…${weflowToken.slice(-4)}` : '',
    whitelist,
    whisperLanguage,
    replayHours,
    concurrency,
  }
}
