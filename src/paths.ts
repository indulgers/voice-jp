import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'

const APP_NAME = 'voice-jp'

let _resourcesDir: string | null = null
let _userDataDir: string | null = null

export function isBundled(): boolean {
  return process.execPath.includes('/Contents/MacOS/')
}

export function resourcesDir(): string {
  if (_resourcesDir) return _resourcesDir
  if (isBundled()) {
    // .../voice-jp.app/Contents/MacOS/voice-jp → Resources is sibling of MacOS
    _resourcesDir = resolve(dirname(process.execPath), '..', 'Resources')
  } else {
    _resourcesDir = process.cwd()
  }
  return _resourcesDir
}

export function userDataDir(): string {
  if (_userDataDir) return _userDataDir
  if (isBundled()) {
    _userDataDir = resolve(homedir(), 'Library', 'Application Support', APP_NAME)
  } else {
    _userDataDir = process.cwd()
  }
  mkdirSync(_userDataDir, { recursive: true })
  return _userDataDir
}

export function configPath(): string {
  return resolve(userDataDir(), 'config.json')
}

export function dbPath(): string {
  return resolve(userDataDir(), 'voice-jp.db')
}

export function cacheDir(): string {
  const dir = resolve(userDataDir(), 'cache')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function modelsDir(): string {
  const dir = resolve(userDataDir(), 'models')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function modelPath(name = 'ggml-large-v3.bin'): string {
  return resolve(modelsDir(), name)
}

export function whisperBinPath(): string {
  const bundled = resolve(resourcesDir(), 'bin', 'whisper-cli')
  if (isBundled() || existsSync(bundled)) return bundled
  return resolve(process.cwd(), 'bin', 'whisper-cli')
}

export function webDistDir(): string {
  if (isBundled()) return resolve(resourcesDir(), 'web')
  return resolve(process.cwd(), 'web', 'dist')
}
