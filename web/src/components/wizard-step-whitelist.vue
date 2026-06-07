<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { Contact } from '../types'

const emit = defineEmits<{ (e: 'saved'): void }>()

const query = ref('')
const contacts = ref<Contact[]>([])
const selected = ref<Set<string>>(new Set())
const language = ref<'ja' | 'zh' | 'auto'>('ja')
const saving = ref(false)
const loadingContacts = ref(false)
let searchTimer: number | null = null

const loadCurrentConfig = async () => {
  const res = await fetch('/api/config')
  const data = (await res.json()) as { config: { whitelist: string[]; whisperLanguage: string } }
  selected.value = new Set(data.config.whitelist)
  language.value = (data.config.whisperLanguage as 'ja' | 'zh' | 'auto') ?? 'ja'
}

const search = async () => {
  loadingContacts.value = true
  try {
    const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(query.value)}`)
    const data = (await res.json()) as { rows: Contact[] }
    contacts.value = data.rows
  } finally {
    loadingContacts.value = false
  }
}

watch(query, () => {
  if (searchTimer != null) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(search, 200)
})

const toggle = (id: string) => {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

const save = async () => {
  saving.value = true
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        whitelist: [...selected.value],
        whisperLanguage: language.value,
      }),
    })
    emit('saved')
  } finally {
    saving.value = false
  }
}

const nameOf = (c: Contact) => c.displayName || c.remark || c.nickname || c.username
const isSelected = (id: string) => selected.value.has(id)
const selectedCount = computed(() => selected.value.size)

onMounted(async () => {
  await loadCurrentConfig()
  await search()
})
</script>

<template>
  <section class="step">
    <h2>4. 監視する連絡先 + 音声言語を選択</h2>
    <p class="hint">
      ここで選んだ人の音声メッセージだけが自動転写されます。後で「設定」から変更できます。
    </p>

    <label class="lang-row">
      言語:
      <select v-model="language">
        <option value="ja">日本語</option>
        <option value="zh">中国語</option>
        <option value="auto">自動検出</option>
      </select>
    </label>

    <input
      v-model="query"
      type="text"
      placeholder="名前 / 微信号 / wxid で検索…"
      class="search"
    />

    <div class="list">
      <p v-if="loadingContacts" class="hint">読み込み中…</p>
      <button
        v-for="c in contacts"
        :key="c.username"
        :class="['contact', { picked: isSelected(c.username) }]"
        @click="toggle(c.username)"
      >
        <span class="check">{{ isSelected(c.username) ? '✓' : '' }}</span>
        <span class="name">{{ nameOf(c) }}</span>
        <span class="username">{{ c.alias || c.username }}</span>
      </button>
    </div>

    <footer>
      <span class="count">{{ selectedCount }} 人選択中</span>
      <button class="primary" @click="save" :disabled="saving || selectedCount === 0">
        {{ saving ? '保存中…' : '保存して完了' }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.step { padding: 8px 0; }
h2 { font-size: 16px; margin: 0 0 12px; }
.hint { color: var(--fg-mute); font-size: 13px; margin: 0 0 10px; }
.lang-row { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 12px; }
select {
  font: inherit;
  padding: 3px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  color: var(--fg);
}
.search {
  width: 100%;
  font-size: 14px;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--fg);
  margin-bottom: 10px;
}
.list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
}
.contact {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  text-align: left;
  font: inherit;
  color: var(--fg);
  cursor: pointer;
}
.contact:last-child { border-bottom: none; }
.contact:hover { background: rgba(37, 99, 235, 0.08); }
.contact.picked { background: rgba(37, 99, 235, 0.15); }
.check { width: 14px; color: var(--accent); font-weight: 700; }
.name { flex: 1; font-size: 13px; }
.username { font-size: 11px; color: var(--fg-mute); font-family: ui-monospace, Menlo, monospace; }
footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}
.count { font-size: 12px; color: var(--fg-mute); }
.primary {
  background: var(--accent);
  color: white;
  border: none;
  padding: 7px 16px;
  border-radius: 6px;
  font-size: 13px;
}
.primary:disabled { opacity: 0.4; }
</style>
