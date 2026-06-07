<script setup lang="ts">
import WizardStepWhitelist from './wizard-step-whitelist.vue'
const emit = defineEmits<{ (e: 'saved'): void; (e: 'reset'): void }>()
</script>

<template>
  <details class="panel">
    <summary>⚙ 設定 (whitelist / 言語)</summary>
    <div class="body">
      <WizardStepWhitelist @saved="emit('saved')" />
      <button class="reset" @click="emit('reset')">セットアップウィザードをやり直す</button>
    </div>
  </details>
</template>

<style scoped>
.panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px;
  margin: 10px 0;
}
summary { cursor: pointer; font-weight: 600; font-size: 13px; }
.body { padding-top: 6px; }
.reset {
  margin-top: 14px;
  background: transparent;
  color: var(--fg-mute);
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
}
</style>
