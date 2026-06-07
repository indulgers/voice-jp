import { onBeforeUnmount, ref, shallowRef } from 'vue'
import type { MessageRow, StreamEvent } from '../types'

export function useStream() {
  const rows = shallowRef<MessageRow[]>([])
  const weflowConnected = ref(true)
  const streamConnected = ref(false)
  let es: EventSource | null = null

  const upsert = (row: MessageRow) => {
    const arr = rows.value.slice()
    const idx = arr.findIndex(r => r.server_id === row.server_id)
    if (idx === -1) arr.unshift(row)
    else arr[idx] = row
    arr.sort((a, b) => b.created_at - a.created_at)
    rows.value = arr
  }

  const loadInitial = async () => {
    try {
      const res = await fetch('/api/messages?limit=100')
      const data = (await res.json()) as { rows: MessageRow[] }
      rows.value = data.rows
    } catch (err) {
      console.warn('initial load failed', err)
    }
  }

  const connect = () => {
    es?.close()
    es = new EventSource('/events')
    es.onopen = () => { streamConnected.value = true }
    es.onerror = () => {
      streamConnected.value = false
      es?.close()
      setTimeout(connect, 2000)
    }
    const dispatch = (raw: string) => {
      try {
        const evt = JSON.parse(raw) as StreamEvent
        if (evt.type === 'new' || evt.type === 'update') upsert(evt.row)
        else if (evt.type === 'weflow-status') weflowConnected.value = evt.connected
      } catch {
        // ignore
      }
    }
    es.addEventListener('new', e => dispatch((e as MessageEvent).data))
    es.addEventListener('update', e => dispatch((e as MessageEvent).data))
    es.addEventListener('weflow-status', e => dispatch((e as MessageEvent).data))
  }

  void loadInitial().then(connect)

  onBeforeUnmount(() => es?.close())

  const retry = async (serverId: string) => {
    await fetch(`/api/messages/${encodeURIComponent(serverId)}/retry`, { method: 'POST' })
  }

  return { rows, weflowConnected, streamConnected, retry }
}
