import { existsSync } from 'node:fs'
import type { AppConfig } from './types.ts'
import { markFailed, pendingRows } from './store.ts'
import { enqueue } from './transcriber.ts'
import { publish } from './event-bus.ts'

/**
 * On startup: re-queue every row that's still 'pending'.
 * Daemon restarts (manual quit, crash, hot-swap during dev) leave orphan pending
 * rows that no one is processing — without this they'd stay 转写中… forever.
 */
export function resumePending(config: AppConfig): void {
  const rows = pendingRows()
  if (rows.length === 0) return
  let queued = 0
  let failed = 0
  for (const row of rows) {
    if (!row.audio_path || !existsSync(row.audio_path)) {
      const f = markFailed(row.server_id, 'audio_missing (cache cleared)')
      if (f) publish({ type: 'update', row: f })
      failed++
      continue
    }
    enqueue({ serverId: row.server_id, audioPath: row.audio_path }, config)
    queued++
  }
  console.log(`[resume] re-queued ${queued} orphan pending rows, marked ${failed} as failed (audio missing)`)
}
