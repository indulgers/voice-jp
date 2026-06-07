import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { getById } from '../store.ts'

export function handleAudio(serverId: string): Response {
  const row = getById(serverId)
  if (!row?.audio_path) return new Response('not found', { status: 404 })
  const abs = resolve(row.audio_path)
  const allowedRoot = resolve('cache')
  if (!abs.startsWith(allowedRoot)) return new Response('forbidden', { status: 403 })
  if (!existsSync(abs)) return new Response('not found', { status: 404 })
  statSync(abs)
  const file = Bun.file(abs)
  return new Response(file, { headers: { 'Content-Type': file.type || 'audio/wav' } })
}
