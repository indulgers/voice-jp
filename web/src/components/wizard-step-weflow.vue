<script setup lang="ts">
defineProps<{ reachable: boolean }>()
defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <section class="step">
    <h2>1. WeFlow を起動してください</h2>
    <p class="hint">
      voice-jp は WeFlow を通して微信からメッセージを取得します。WeFlow が <code>http://127.0.0.1:5031</code> で動いている必要があります。
    </p>
    <ol class="steps">
      <li>Applications から WeFlow を起動</li>
      <li>WeChat にログイン（QR コードスキャン）</li>
      <li>WeFlow の設定で <strong>HTTP API</strong> と <strong>Message Push</strong> を有効化</li>
    </ol>
    <div class="state" :class="{ ok: reachable, fail: !reachable }">
      {{ reachable ? '✓ WeFlow を検出しました' : '✗ WeFlow に接続できません' }}
    </div>
    <button v-if="!reachable" @click="$emit('retry')">再試行</button>
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
