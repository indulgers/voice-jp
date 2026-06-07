<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useStream } from './composables/use-stream'
import { usePreflight } from './composables/use-preflight'
import MessageRow from './components/message-row.vue'
import Settings from './components/settings.vue'
import SetupWizard from './views/setup-wizard.vue'

const { state: preflight, refresh: refreshPreflight, startPolling, stopPolling } = usePreflight()
const { rows, weflowConnected, streamConnected, retry } = useStream()
const forceWizard = ref(false)

const showWizard = () => preflight.value.setupComplete === false || forceWizard.value

startPolling(2000)

watch(
  () => preflight.value.setupComplete,
  done => {
    if (done && !forceWizard.value) stopPolling()
    else startPolling(2000)
  },
)

const onWizardDone = async () => {
  forceWizard.value = false
  await refreshPreflight()
}

const onReopenWizard = () => {
  forceWizard.value = true
  startPolling(2000)
}

onBeforeUnmount(stopPolling)
</script>

<template>
  <main class="app">
    <SetupWizard
      v-if="showWizard()"
      :state="preflight"
      @refresh="refreshPreflight"
      @done="onWizardDone"
    />
    <template v-else>
      <h1>voice-jp <span class="badge">{{ rows.length }}</span></h1>

      <div v-if="!weflowConnected" class="banner danger">WeFlow に接続できません。WeFlow を起動してください。</div>
      <div v-else-if="!streamConnected" class="banner warn">サーバとの接続が切断されました。再接続中…</div>

      <Settings @saved="refreshPreflight" @reset="onReopenWizard" />

      <section v-if="rows.length === 0" class="empty">
        まだメッセージがありません。whitelist のユーザーから音声を受信すると、ここに転写結果が表示されます。
      </section>

      <MessageRow v-for="row in rows" :key="row.server_id" :row="row" @retry="retry" />
    </template>
  </main>
</template>

<style scoped>
.app {
  max-width: 480px;
  margin: 0 auto;
  padding: 14px;
}
h1 {
  font-size: 16px;
  margin: 4px 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge {
  background: var(--border);
  color: var(--fg-mute);
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 999px;
  font-weight: 500;
}
.banner {
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 10px;
}
.banner.danger { background: rgba(220, 38, 38, 0.12); color: var(--danger); }
.banner.warn { background: rgba(217, 119, 6, 0.12); color: var(--warn); }
.empty {
  padding: 30px 12px;
  text-align: center;
  color: var(--fg-mute);
  font-size: 13px;
}
</style>
