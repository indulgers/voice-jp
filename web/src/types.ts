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

export type StreamEvent =
  | { type: 'new'; row: MessageRow }
  | { type: 'update'; row: MessageRow }
  | { type: 'weflow-status'; connected: boolean }
  | { type: 'model-progress'; downloaded: number; total: number; ratio: number }
  | { type: 'model-status'; state: 'missing' | 'downloading' | 'ready' | 'failed'; error?: string }

export interface PreflightState {
  weflowReachable: boolean
  tokenValid: boolean
  modelReady: boolean
  whitelistSize: number
  setupComplete: boolean
}

export interface Contact {
  username: string
  displayName?: string
  remark?: string
  nickname?: string
  alias?: string
  type?: string
}

export interface AppConfigSummary {
  weflowToken: string
  whitelist: string[]
  whisperLanguage: string
  replayHours: number
  concurrency: number
}
