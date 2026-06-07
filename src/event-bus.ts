import type { StreamEvent } from './types.ts'

type Listener = (evt: StreamEvent) => void

const listeners = new Set<Listener>()

export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function publish(evt: StreamEvent): void {
  for (const fn of listeners) {
    try {
      fn(evt)
    } catch (err) {
      console.error('[event-bus] listener threw', err)
    }
  }
}
