<script setup lang="ts">
defineProps<{ reachable: boolean }>()
defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <section class="step">
    <h2>1. 启动 WeFlow</h2>
    <p class="hint">
      voice-jp 通过 WeFlow 从微信获取消息。请先确保 WeFlow 正在 <code>http://127.0.0.1:5031</code> 上运行。
    </p>
    <ol class="steps">
      <li>从 Applications 启动 WeFlow</li>
      <li>扫码登录微信</li>
      <li>在 WeFlow 设置里勾选 <strong>HTTP API</strong> 和 <strong>Message Push</strong></li>
    </ol>
    <div class="state" :class="{ ok: reachable, fail: !reachable }">
      {{ reachable ? '✓ 已检测到 WeFlow' : '✗ 还连不上 WeFlow' }}
    </div>
    <button v-if="!reachable" @click="$emit('retry')">重试</button>
  </section>
</template>

<style scoped>
.step { padding: 8px 0; }
h2 { font-size: 16px; margin: 0 0 12px; }
.hint { color: var(--fg-mute); font-size: 13px; margin: 0 0 12px; }
.steps { font-size: 13px; padding-left: 20px; line-height: 1.8; }
.state {
  margin: 14px 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
}
.state.ok { background: rgba(5, 150, 105, 0.12); color: var(--ok); }
.state.fail { background: rgba(220, 38, 38, 0.12); color: var(--danger); }
button {
  background: var(--accent);
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
}
code { background: rgba(0,0,0,0.05); padding: 1px 5px; border-radius: 3px; }
@media (prefers-color-scheme: dark) { code { background: rgba(255,255,255,0.08); } }
</style>
