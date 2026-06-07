<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const props = defineProps<{ ready: boolean }>()
const downloading = ref(false)
const ratio = ref(0)
const downloaded = ref(0)
const total = ref(0)
const errorMsg = ref('')

let es: EventSource | null = null

const startDownload = async () => {
  errorMsg.value = ''
  downloading.value = true
  await fetch('/api/model/download', { method: 'POST' })
  subscribe()
}

const subscribe = () => {
  es?.close()
  es = new EventSource('/events')
  es.addEventListener('model-progress', e => {
    try {
      const d = JSON.parse((e as MessageEvent).data) as {
        downloaded: number; total: number; ratio: number
      }
      downloaded.value = d.downloaded
      total.value = d.total
      ratio.value = d.ratio
    } catch {
      // ignore
    }
  })
  es.addEventListener('model-status', e => {
    try {
      const d = JSON.parse((e as MessageEvent).data) as { state: string; error?: string }
      if (d.state === 'ready') { downloading.value = false; ratio.value = 1 }
      else if (d.state === 'failed') {
        downloading.value = false
        errorMsg.value = d.error ?? 'unknown error'
      }
    } catch {
      // ignore
    }
  })
}

const fmtGB = (n: number) => (n / 1024 / 1024 / 1024).toFixed(2)

onBeforeUnmount(() => es?.close())
</script>

<template>
  <section class="step">
    <h2>3. 音声認識モデル (ggml-large-v3, 約 3GB) をダウンロード</h2>
    <p class="hint">
      最初の 1 回だけ、Whisper モデルをローカルに保存します。インターネット回線にもよりますが 5–15 分かかります。
    </p>
    <div v-if="ready && !downloading" class="state ok">✓ モデル準備完了</div>
    <div v-else-if="downloading" class="progress-wrap">
      <div class="bar"><div class="fill" :style="{ width: (ratio * 100) + '%' }" /></div>
      <div class="progress-text">
        {{ (ratio * 100).toFixed(1) }}%
        <span v-if="total">· {{ fmtGB(downloaded) }} / {{ fmtGB(total) }} GB</span>
      </div>
    </div>
    <p v-if="errorMsg" class="error">エラー: {{ errorMsg }}（再試行してください）</p>
    <button
      v-if="!ready"
      @click="startDownload"
      :disabled="downloading"
    >
      {{ downloading ? 'ダウンロード中…' : 'ダウンロード開始' }}
    </button>
  </section>
</template>

<style scoped>
.step { padding: 8px 0; }
h2 { font-size: 16px; margin: 0 0 12px; }
.hint { color: var(--fg-mute); font-size: 13px; margin: 0 0 14px; }
.state.ok { background: rgba(5, 150, 105, 0.12); color: var(--ok); padding: 10px 12px; border-radius: 8px; font-size: 13px; }
.progress-wrap { margin: 14px 0; }
.bar { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
.fill { height: 100%; background: var(--accent); transition: width 300ms ease; }
.progress-text { font-size: 12px; color: var(--fg-mute); margin-top: 6px; }
.error { color: var(--danger); font-size: 12px; }
button {
  background: var(--accent);
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
}
button:disabled { opacity: 0.4; }
</style>
