<script setup lang="ts">
import { computed } from 'vue'
import type { PreflightState } from '../types'
import WizardStepWeflow from '../components/wizard-step-weflow.vue'
import WizardStepToken from '../components/wizard-step-token.vue'
import WizardStepModel from '../components/wizard-step-model.vue'
import WizardStepWhitelist from '../components/wizard-step-whitelist.vue'

const props = defineProps<{ state: PreflightState }>()
const emit = defineEmits<{ (e: 'refresh'): void; (e: 'done'): void }>()

const currentStep = computed<1 | 2 | 3 | 4>(() => {
  if (!props.state.weflowReachable) return 1
  if (!props.state.tokenValid) return 2
  if (!props.state.modelReady) return 3
  return 4
})
</script>

<template>
  <div class="wizard">
    <header class="header">
      <h1>voice-jp 初始化</h1>
      <ol class="dots">
        <li v-for="n in 4" :key="n" :class="{ active: n === currentStep, done: n < currentStep }">{{ n }}</li>
      </ol>
    </header>

    <main class="body">
      <WizardStepWeflow v-if="currentStep === 1" :reachable="state.weflowReachable" @retry="emit('refresh')" />
      <WizardStepToken v-else-if="currentStep === 2" :valid="state.tokenValid" @saved="emit('refresh')" />
      <WizardStepModel v-else-if="currentStep === 3" :ready="state.modelReady" />
      <WizardStepWhitelist v-else-if="currentStep === 4" @saved="emit('done')" />
    </main>
  </div>
</template>

<style scoped>
.wizard {
  max-width: 520px;
  margin: 40px auto;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px 28px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.header h1 { font-size: 15px; margin: 0; }
.dots { list-style: none; display: flex; gap: 8px; margin: 0; padding: 0; }
.dots li {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: var(--border);
  color: var(--fg-mute);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dots li.done { background: var(--ok); color: white; }
.dots li.active { background: var(--accent); color: white; }
</style>
