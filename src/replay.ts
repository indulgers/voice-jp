import type { AppConfig, WeflowMessage } from './types.ts'
import { fetchSessions, fetchSessionMessages } from './weflow-http.ts'
import { isAllowed } from './whitelist.ts'
import { exists } from './store.ts'
import { ingestMessage } from './ingest.ts'

export async function replayRecent(config: AppConfig): Promise<void> {
  const since = Math.floor(Date.now() / 1000) - config.replayHours * 3600
  console.log(`[replay] scanning last ${config.replayHours}h`)
  let sessions: Array<{ id: string }> = []
  try {
    sessions = await fetchSessions(config)
  } catch (err) {
    console.warn('[replay] fetchSessions failed', (err as Error).message)
    return
  }
  if (sessions.length === 0) {
    console.log('[replay] no sessions returned')
    return
  }

  let queued = 0
  for (const s of sessions) {
    let msgs: WeflowMessage[] = []
    try {
      msgs = await fetchSessionMessages(config, s.id, 200)
    } catch {
      continue
    }
    for (const m of msgs) {
      const t = typeof m.createTime === 'number' ? m.createTime : 0
      if (t < since) continue
      if (String(m.mediaType ?? '').toLowerCase() !== 'voice') continue
      if (!isAllowed(m.senderUsername, config.whitelist)) continue
      const id = String(m.serverId ?? m.localId ?? '')
      if (!id || exists(id)) continue
      const result = await ingestMessage(m, config)
      if (result === 'queued') queued++
    }
  }
  console.log(`[replay] queued ${queued} historic messages`)
}
