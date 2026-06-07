import type { AppConfig } from '../types.ts'
import { getById, resetToPending } from '../store.ts'
import { enqueue } from '../transcriber.ts'
import { publish } from '../event-bus.ts'

export async function handleRetry(serverId: string, config: AppConfig): Promise<Response> {
  const row = getById(serverId)
  if (!row) return Response.json({ error: 'not_found' }, { status: 404 })
  if (!row.audio_path) return Response.json({ error: 'no_audio' }, { status: 400 })
  const reset = resetToPending(serverId)
  if (reset) publish({ type: 'update', row: reset })
  enqueue({ serverId, audioPath: row.audio_path }, config)
  return Response.json({ ok: true })
}
