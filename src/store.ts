import { Database } from 'bun:sqlite'
import type { MessageRow } from './types.ts'
import { dbPath } from './paths.ts'

const db = new Database(dbPath())
db.exec('PRAGMA journal_mode=WAL;')
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    server_id        TEXT PRIMARY KEY,
    local_id         TEXT,
    sender_username  TEXT NOT NULL,
    sender_name      TEXT,
    audio_path       TEXT,
    duration_sec     INTEGER,
    created_at       INTEGER NOT NULL,
    status           TEXT NOT NULL,
    text             TEXT,
    error            TEXT,
    transcribed_at   INTEGER
  );
`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_created_at ON messages(created_at DESC);`)

type Bindings = Record<string, string | number | null>

const insertStmt = db.prepare<unknown, Bindings>(`
  INSERT INTO messages
    (server_id, local_id, sender_username, sender_name, audio_path, duration_sec, created_at, status)
  VALUES
    ($server_id, $local_id, $sender_username, $sender_name, $audio_path, $duration_sec, $created_at, 'pending')
`)
const updateDoneStmt = db.prepare<unknown, Bindings>(
  `UPDATE messages SET status='done', text=$text, error=NULL, transcribed_at=$ts WHERE server_id=$server_id`,
)
const updateFailedStmt = db.prepare<unknown, Bindings>(
  `UPDATE messages SET status='failed', error=$error, transcribed_at=$ts WHERE server_id=$server_id`,
)
const resetPendingStmt = db.prepare<unknown, Bindings>(
  `UPDATE messages SET status='pending', error=NULL, transcribed_at=NULL WHERE server_id=$server_id`,
)
const existsStmt = db.prepare<{ c: number }, Bindings>(
  `SELECT COUNT(*) AS c FROM messages WHERE server_id=$server_id`,
)
// NOTE: bun --compile + bun:sqlite has a SQLITE_NOMEM bug when binding numeric LIMIT
// via prepared params. Inline a safe integer instead. Verified Jun 2026.
function recentStmtFor(limit: number) {
  const safe = Math.max(1, Math.min(500, Math.floor(limit)))
  return db.prepare<MessageRow, []>(`SELECT * FROM messages ORDER BY created_at DESC LIMIT ${safe}`)
}
const getByIdStmt = db.prepare<MessageRow, Bindings>(
  `SELECT * FROM messages WHERE server_id=$server_id`,
)
const allIdsStmt = db.prepare<{ server_id: string }, []>(`SELECT server_id FROM messages`)
const pendingStmt = db.prepare<MessageRow, []>(`SELECT * FROM messages WHERE status='pending' ORDER BY created_at ASC`)

export function insertPending(input: {
  server_id: string
  local_id: string | null
  sender_username: string
  sender_name: string | null
  audio_path: string
  duration_sec: number | null
  created_at: number
}): boolean {
  try {
    insertStmt.run({
      $server_id: input.server_id,
      $local_id: input.local_id,
      $sender_username: input.sender_username,
      $sender_name: input.sender_name,
      $audio_path: input.audio_path,
      $duration_sec: input.duration_sec,
      $created_at: input.created_at,
    })
    return true
  } catch (err) {
    const msg = (err as Error).message
    if (msg.includes('UNIQUE') || msg.includes('PRIMARY KEY')) return false
    throw err
  }
}

export function markDone(serverId: string, text: string): MessageRow | null {
  updateDoneStmt.run({ $server_id: serverId, $text: text, $ts: Math.floor(Date.now() / 1000) })
  return getById(serverId)
}

export function markFailed(serverId: string, error: string): MessageRow | null {
  updateFailedStmt.run({ $server_id: serverId, $error: error.slice(0, 500), $ts: Math.floor(Date.now() / 1000) })
  return getById(serverId)
}

export function resetToPending(serverId: string): MessageRow | null {
  resetPendingStmt.run({ $server_id: serverId })
  return getById(serverId)
}

export function exists(serverId: string): boolean {
  const row = existsStmt.get({ $server_id: serverId })
  return (row?.c ?? 0) > 0
}

export function recent(limit = 50): MessageRow[] {
  return recentStmtFor(limit).all()
}

export function getById(serverId: string): MessageRow | null {
  return getByIdStmt.get({ $server_id: serverId }) ?? null
}

export function knownServerIds(): Set<string> {
  const rows = allIdsStmt.all()
  return new Set(rows.map(r => r.server_id))
}

export function pendingRows(): MessageRow[] {
  return pendingStmt.all()
}

export { db }
