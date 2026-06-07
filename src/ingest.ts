import { extname, join } from 'node:path'
import type { AppConfig, WeflowMessage } from './types.ts'
import { isAllowed } from './whitelist.ts'
import { exists, insertPending, getById } from './store.ts'
import { downloadMedia, findMessage } from './weflow-http.ts'
import { resolveName } from './contacts-cache.ts'
import { enqueue } from './transcriber.ts'
import { publish } from './event-bus.ts'
import { cacheDir } from './paths.ts'

function looksLikeVoice(msg: WeflowMessage): boolean {
  if (String(msg.mediaType ?? '').toLowerCase() === 'voice') return true
  if (Number(msg.localType) === 34) return true
  const raw = String(msg.rawContent ?? '')
  return raw.includes('<voicemsg')
}

function pickTalker(msg: WeflowMessage): string {
  const candidates = [msg.talker, msg.sessionId, msg.fromUsername, msg.chatUsername]
  for (const c of candidates) if (typeof c === 'string' && c) return c
  return typeof msg.senderUsername === 'string' ? msg.senderUsername : ''
}

export async function ingestMessage(raw: WeflowMessage, config: AppConfig, opts: { skipWhitelist?: boolean } = {}): Promise<'skipped' | 'queued' | 'dup' | 'error'> {
  let msg = raw
  if (!looksLikeVoice(msg)) return 'skipped'

  if (!msg.mediaUrl && !msg.mediaLocalPath) {
    const talker = pickTalker(msg)
    const serverIdProbe = String(msg.serverId ?? '')
    if (talker && serverIdProbe) {
      const full = await findMessage(config, talker, serverIdProbe)
      if (full) msg = { ...msg, ...full }
    }
  }

  const sender = String(msg.senderUsername ?? '')
  if (!opts.skipWhitelist && !isAllowed(sender, config.whitelist)) return 'skipped'

  const serverId = String(msg.serverId ?? msg.localId ?? '')
  if (!serverId) return 'error'
  if (exists(serverId)) return 'dup'

  const mediaRef = msg.mediaUrl ?? msg.mediaLocalPath ?? msg.mediaFileName
  if (!mediaRef) {
    console.warn('[ingest] no media reference after lookup', { serverId, sender })
    return 'error'
  }

  const ext = guessExt(String(mediaRef))
  const localPath = join(cacheDir(), `${serverId}${ext}`)
  const dl = await downloadMedia(config, String(mediaRef), localPath)
  if (!dl) {
    console.warn('[ingest] media download failed', { serverId, mediaRef })
    return 'error'
  }

  const senderName = resolveName(sender)
  const createdAt = typeof msg.createTime === 'number' ? msg.createTime : Math.floor(Date.now() / 1000)
  const duration = pickDuration(msg)

  const inserted = insertPending({
    server_id: serverId,
    local_id: msg.localId != null ? String(msg.localId) : null,
    sender_username: sender,
    sender_name: senderName,
    audio_path: localPath,
    duration_sec: duration,
    created_at: createdAt,
  })
  if (!inserted) return 'dup'

  const row = getById(serverId)
  if (row) publish({ type: 'new', row })

  enqueue({ serverId, audioPath: localPath }, config)
  return 'queued'
}

function guessExt(ref: string): string {
  const ext = extname(ref).toLowerCase()
  if (ext === '.wav' || ext === '.mp3' || ext === '.m4a' || ext === '.ogg' || ext === '.amr' || ext === '.silk') return ext
  return '.wav'
}

function pickDuration(msg: WeflowMessage): number | null {
  if (typeof msg.duration === 'number') return msg.duration
  const raw = String(msg.rawContent ?? '')
  const m = raw.match(/voicelength="(\d+)"/)
  if (m) return Math.round(Number(m[1]) / 1000)
  return null
}
