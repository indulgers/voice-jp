import { onBeforeUnmount, ref } from 'vue'
import type { PreflightState } from '../types'

const DEFAULT_STATE: PreflightState = {
  weflowReachable: false,
  tokenValid: false,
  modelReady: false,
  whitelistSize: 0,
  setupComplete: false,
}

export function usePreflight() {
  const state = ref<PreflightState>({ ...DEFAULT_STATE })
  const loading = ref(true)
  let timer: number | null = null

  const refresh = async () => {
    try {
      const res = await fetch('/api/preflight')
      const data = (await res.json()) as PreflightState
      state.value = data
    } catch {
      state.value = { ...DEFAULT_STATE }
    } finally {
      loading.value = false
    }
  }

  const startPolling = (intervalMs = 3000) => {
    void refresh()
    if (timer != null) window.clearInterval(timer)
    timer = window.setInterval(refresh, intervalMs)
  }

  const stopPolling = () => {
    if (timer != null) {
      window.clearInterval(timer)
      timer = null
    }
  }

  onBeforeUnmount(stopPolling)

  return { state, loading, refresh, startPolling, stopPolling }
}
