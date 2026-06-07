import { existsSync, unlinkSync } from 'node:fs'
import type { AppConfig } from './types.ts'
import { markDone, markFailed } from './store.ts'
import { publish } from './event-bus.ts'

interface Job {
  serverId: string
  audioPath: string
}

const queue: Job[] = []
let running = 0

export function enqueue(job: Job, config: AppConfig): void {
  queue.push(job)
  pump(config)
}

function pump(config: AppConfig): void {
  while (running < config.concurrency && queue.length > 0) {
    const job = queue.shift()!
    running++
    void process(job, config).finally(() => {
      running--
      pump(config)
    })
  }
}

async function process(job: Job, config: AppConfig): Promise<void> {
  console.log(`[whisper] start ${job.serverId}`)
  const t0 = Date.now()
  try {
    const wavPath = await ensureWav(job.audioPath)
    const text = await runWhisper(wavPath, config)
    const row = markDone(job.serverId, text)
    if (row) publish({ type: 'update', row })
    console.log(`[whisper] done ${job.serverId} (${Date.now() - t0}ms) "${text.slice(0, 40)}…"`)
  } catch (err) {
    const msg = (err as Error).message
    const row = markFailed(job.serverId, msg)
    if (row) publish({ type: 'update', row })
    console.warn(`[whisper] fail ${job.serverId}: ${msg}`)
  }
}

async function ensureWav(audioPath: string): Promise<string> {
  if (audioPath.endsWith('.wav')) {
    const transcoded = audioPath.replace(/\.wav$/, '.16k.wav')
    if (existsSync(transcoded)) return transcoded
    await ffmpegTranscode(audioPath, transcoded)
    return transcoded
  }
  const transcoded = audioPath.replace(/\.[^.]+$/, '.16k.wav')
  if (existsSync(transcoded)) return transcoded
  await ffmpegTranscode(audioPath, transcoded)
  return transcoded
}

async function ffmpegTranscode(input: string, output: string): Promise<void> {
  // macOS-native CoreAudio; no ffmpeg dependency.
  const proc = Bun.spawn(['/usr/bin/afconvert', '-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', input, output], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const code = await proc.exited
  if (code !== 0) {
    const err = await new Response(proc.stderr).text()
    throw new Error(`afconvert failed (${code}): ${err.split('\n').slice(-5).join(' ').slice(0, 300)}`)
  }
}

async function runWhisper(wavPath: string, config: AppConfig): Promise<string> {
  const outBase = wavPath.replace(/\.wav$/, '.whisper')
  const outJson = `${outBase}.json`
  if (existsSync(outJson)) unlinkSync(outJson)

  const args = [
    '-m', config.whisperModel,
    '-l', config.whisperLanguage || 'ja',
    '-oj',
    '-of', outBase,
    '-t', String(config.whisperThreads),
    '-nt',
    '-f', wavPath,
  ]
  const proc = Bun.spawn([config.whisperBin, ...args], { stdout: 'pipe', stderr: 'pipe' })

  const timer = setTimeout(() => proc.kill('SIGKILL'), config.whisperTimeoutMs)
  const code = await proc.exited
  clearTimeout(timer)

  if (code !== 0) {
    const err = await new Response(proc.stderr).text()
    throw new Error(`whisper exit ${code}: ${err.split('\n').slice(-5).join(' ').slice(0, 300)}`)
  }
  if (!existsSync(outJson)) throw new Error(`whisper produced no output json at ${outJson}`)

  const raw = (await Bun.file(outJson).json()) as { transcription?: Array<{ text?: string }> }
  const segments = raw.transcription ?? []
  const text = segments.map(s => (s.text ?? '').trim()).filter(Boolean).join('').trim()
  if (!text) throw new Error('whisper produced empty transcription')
  return text
}

export function queueDepth(): number {
  return queue.length + running
}
