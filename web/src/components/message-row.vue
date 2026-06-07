<script setup lang="ts">
import { computed } from 'vue'
import type { MessageRow } from '../types'

const props = defineProps<{ row: MessageRow }>()
const emit = defineEmits<{ (e: 'retry', serverId: string): void }>()

const audioUrl = computed(() => `/api/audio/${encodeURIComponent(props.row.server_id)}`)
const displayName = computed(() => props.row.sender_name || props.row.sender_username)
const timeLabel = computed(() => {
  const d = new Date(props.row.created_at * 1000)
  return d.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
})
const durationLabel = computed(() => (props.row.duration_sec ? `${props.row.duration_sec}s` : ''))
const statusClass = computed(() => `status status-${props.row.status}`)
const statusLabel = computed(() => {
  switch (props.row.status) {
    case 'pending': return '转写中…'
    case 'done': return '完成'
    case 'failed': return '失败'
  }
})
</script>

<template>
  <article class="card">
    <header>
      <span class="name">{{ displayName }}</span>
      <span class="meta">{{ timeLabel }} <span v-if="durationLabel">· {{ durationLabel }}</span></span>
      <span :class="statusClass">{{ statusLabel }}</span>
    </header>
    <p v-if="row.status === 'done'" class="text">{{ row.text }}</p>
    <p v-else-if="row.status === 'failed'" class="error">{{ row.error }}</p>
    <p v-else class="placeholder">…</p>
    <footer>
      <audio v-if="row.audio_path" :src="audioUrl" controls preload="none" />
      <button v-if="row.status === 'failed'" class="retry" @click="emit('retry', row.server_id)">重试</button>
    </footer>
  </article>
</template>

<style scoped>
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  margin: 10px 0;
}
header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 6px;
}
.name { font-weight: 600; }
.meta { color: var(--fg-mute); flex: 1; }
.status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid currentColor;
}
.status-pending { color: var(--warn); }
.status-done { color: var(--ok); }
.status-failed { color: var(--danger); }
.text {
  margin: 4px 0 10px;
  font-size: 15px;
  line-height: 1.55;
  white-space: pre-wrap;
}
.placeholder { color: var(--fg-mute); margin: 4px 0 10px; }
.error {
  color: var(--danger);
  font-size: 12px;
  margin: 4px 0 10px;
  word-break: break-all;
}
footer {
  display: flex;
  gap: 10px;
  align-items: center;
}
audio { width: 100%; max-width: 280px; height: 32px; }
.retry {
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
}
</style>
