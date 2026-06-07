export type MessageStatus = 'pending' | 'done' | 'failed'

export interface MessageRow {
  server_id: string
  local_id: string | null
  sender_username: string
  sender_name: string | null
  audio_path: string | null
  duration_sec: number | null
  created_at: number
  status: MessageStatus
  text: string | null
  error: string | null
  transcribed_at: number | null
}

export interface WeflowMessage {
  localId?: string | number
  serverId?: string | number
  localType?: number
  mediaType?: string
  senderUsername?: string
  createTime?: number
  mediaLocalPath?: string
  mediaUrl?: string
  mediaFileName?: string
  duration?: number
  sessionId?: string
  [k: string]: unknown
}

export interface AppConfig {
  weflowBase: string
  weflowToken: string
  port: number
  whisperBin: string
  whisperModel: string
  whisperLanguage: string
  whisperThreads: number
  whisperTimeoutMs: number
  concurrency: number
  replayHours: number
  whitelist: string[]
}

export type StreamEvent =
  | { type: 'new'; row: MessageRow }
  | { type: 'update'; row: MessageRow }
  | { type: 'weflow-status'; connected: boolean }
  | { type: 'model-progress'; downloaded: number; total: number; ratio: number }
  | { type: 'model-status'; state: 'missing' | 'downloading' | 'ready' | 'failed'; error?: string }
  | { type: 'preflight'; state: PreflightState }

export interface PreflightState {
  weflowReachable: boolean
  tokenValid: boolean
  modelReady: boolean
  whitelistSize: number
  setupComplete: boolean
}
