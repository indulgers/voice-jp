import type { AppConfig, WeflowMessage } from '../types.ts'
import { fetchSessions, fetchMessagesByTalker } from '../weflow-http.ts'
import { resolveName } from '../contacts-cache.ts'

function isVoice(m: WeflowMessage): boolean {
  if (String(m.mediaType ?? '').toLowerCase() === 'voice') return true
  if (Number(m.localType) === 34) return true
  return String(m.rawContent ?? '').includes('<voicemsg')
}

export async function handleDebugRecentVoice(config: AppConfig, url: URL): Promise<Response> {
  const hours = Number(url.searchParams.get('hours') ?? 24)
  const since = Math.floor(Date.now() / 1000) - hours * 3600
  const sessions = await fetchSessions(config)
  const seen = new Map<string, { sessionId: string; count: number; name: string | null; latest: number }>()

  await Promise.all(
    sessions.map(async s => {
      let msgs: WeflowMessage[] = []
      try {
        msgs = await fetchMessagesByTalker(config, s.id, 30, false)
      } catch {
        return
      }
      for (const m of msgs) {
        const t = typeof m.createTime === 'number' ? m.createTime : 0
        if (t < since) continue
        if (!isVoice(m)) continue
        const sender = m.senderUsername ?? ''
        if (!sender) continue
        const cur = seen.get(sender) ?? { sessionId: s.id, count: 0, name: resolveName(sender), latest: 0 }
        cur.count++
        if (t > cur.latest) cur.latest = t
        seen.set(sender, cur)
      }
    }),
  )

  const rows = [...seen.entries()]
    .map(([senderUsername, v]) => ({ senderUsername, ...v }))
    .sort((a, b) => b.latest - a.latest)
  return Response.json({ since, hours, rows })
}
