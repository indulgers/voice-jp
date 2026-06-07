import { existsSync, readFileSync, writeFileSync, watch as fsWatch } from 'node:fs'
import type { AppConfig } from './types.ts'
import { configPath, modelPath, whisperBinPath } from './paths.ts'

let current: AppConfig | null = null
const listeners = new Set<(c: AppConfig) => void>()

function defaults(): AppConfig {
  return {
    weflowBase: 'http://127.0.0.1:5031',
    weflowToken: '',
    port: 7788,
    whisperBin: whisperBinPath(),
    whisperModel: modelPath(),
    whisperLanguage: 'ja',
    whisperThreads: 8,
    whisperTimeoutMs: 120_000,
    concurrency: 1,
    replayHours: 24,
    whitelist: [],
  }
}

export function loadConfig(): AppConfig {
  const path = configPath()
  if (!existsSync(path)) {
    const d = defaults()
    writeFileSync(path, JSON.stringify(d, null, 2))
    console.log(`[config] created default config at ${path}`)
    current = d
    return d
  }
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<AppConfig>
  current = { ...defaults(), ...raw }
  return current
}

export function getConfig(): AppConfig {
  return current ?? loadConfig()
}

export function saveConfig(patch: Partial<AppConfig>): AppConfig {
  const next: AppConfig = { ...getConfig(), ...patch }
  writeFileSync(configPath(), JSON.stringify(next, null, 2))
  current = next
  for (const fn of listeners) {
    try {
      fn(next)
    } catch (err) {
      console.error('[config] listener threw', err)
    }
  }
  return next
}

export function onConfigChange(fn: (c: AppConfig) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function watchConfigFile(): void {
  const path = configPath()
  let last = 0
  fsWatch(path, { persistent: false }, () => {
    const now = Date.now()
    if (now - last < 200) return
    last = now
    try {
      const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<AppConfig>
      const next = { ...defaults(), ...raw }
      const changed = JSON.stringify(next) !== JSON.stringify(current)
      if (!changed) return
      current = next
      console.log('[config] reloaded from disk')
      for (const fn of listeners) fn(next)
    } catch (err) {
      console.warn('[config] reload failed', (err as Error).message)
    }
  })
}
