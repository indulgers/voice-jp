import { existsSync, statSync } from 'node:fs'
import type { AppConfig, PreflightState } from '../types.ts'
import { authHeaders, weflowUrl } from '../weflow-http.ts'

let cachedTokenValid: { value: boolean; checkedAt: number; token: string } | null = null

export async function computePreflight(config: AppConfig): Promise<PreflightState> {
  const weflowReachable = await ping(config)
  let tokenValid = false
  if (weflowReachable) {
    if (
      cachedTokenValid &&
      cachedTokenValid.token === config.weflowToken &&
      Date.now() - cachedTokenValid.checkedAt < 10_000
    ) {
      tokenValid = cachedTokenValid.value
    } else {
      tokenValid = await checkToken(config)
      cachedTokenValid = { value: tokenValid, checkedAt: Date.now(), token: config.weflowToken }
    }
  }
  const modelReady = existsSync(config.whisperModel) && statSync(config.whisperModel).size > 100 * 1024 * 1024
  const whitelistSize = config.whitelist.length
  const setupComplete = weflowReachable && tokenValid && modelReady && whitelistSize > 0
  return { weflowReachable, tokenValid, modelReady, whitelistSize, setupComplete }
}

export async function handlePreflight(config: AppConfig): Promise<Response> {
  const state = await computePreflight(config)
  return Response.json(state)
}

async function ping(config: AppConfig): Promise<boolean> {
  try {
    const res = await fetch(weflowUrl(config, '/health'), { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

async function checkToken(config: AppConfig): Promise<boolean> {
  if (!config.weflowToken) return false
  try {
    const res = await fetch(weflowUrl(config, '/api/v1/sessions'), {
      headers: authHeaders(config),
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}
