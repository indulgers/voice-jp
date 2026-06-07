import { existsSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { getById } from '../store.ts'
import { cacheDir } from '../paths.ts'

export function handleAudio(serverId: string): Response {
  const row = getById(serverId)
  if (!row?.audio_path) return new Response('not found', { status: 404 })
  const abs = resolve(row.audio_path)
  const allowedRoot = resolve(cacheDir())
  if (!abs.startsWith(allowedRoot + sep) && abs !== allowedRoot) {
    return new Response('forbidden', { status: 403 })
  }
  if (!existsSync(abs)) return new Response('not found', { status: 404 })
  const file = Bun.file(abs)
  return new Response(file, { headers: { 'Content-Type': file.type || 'audio/wav' } })
}
