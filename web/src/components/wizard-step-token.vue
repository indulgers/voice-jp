<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ valid: boolean }>()
const emit = defineEmits<{ (e: 'saved'): void }>()
const token = ref('')
const saving = ref(false)
const error = ref('')

const save = async () => {
  if (!token.value.trim()) {
    error.value = 'token を入力してください'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weflowToken: token.value.trim() }),
    })
    if (!res.ok) {
      error.value = `保存に失敗 (${res.status})`
      return
    }
    token.value = ''
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="step">
    <h2>2. WeFlow の access_token を貼り付け</h2>
    <p class="hint">
      WeFlow を開き、<strong>設定 → HTTP API</strong> の項目にある access_token をコピーしてください（UUID 形式の文字列）。
    </p>
    <textarea
      v-model="token"
      placeholder="例: 0123456789abcdef0123456789abcdef"
      rows="2"
    />
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="valid" class="ok">✓ 現在保存されている token は有効です</p>
    <button @click="save" :disabled="saving || !token.trim()">
      {{ saving ? '保存中…' : '保存して検証' }}
    </button>
  </section>
</template>

<style scoped>
.step { padding: 8px 0; }
h2 { font-size: 16px; margin: 0 0 12px; }
.hint { color: var(--fg-mute); font-size: 13px; margin: 0 0 10px; }
textarea {
  width: 100%;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 13px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--fg);
  resize: vertical;
}
button {
  margin-top: 8px;
  background: var(--accent);
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
}
button:disabled { opacity: 0.4; }
.error { color: var(--danger); font-size: 12px; margin: 6px 0; }
.ok { color: var(--ok); font-size: 12px; margin: 6px 0; }
</style>
