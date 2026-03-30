<script setup lang="ts">
import { useAppLogStore } from '../stores/appLog'
import { useUiSettingsStore } from '../stores/uiSettings'

const log = useAppLogStore()
const ui = useUiSettingsStore()
const t = ui.t
const emit = defineEmits<{ openLog: [] }>()
</script>

<template>
  <footer class="status-bar" role="contentinfo">
    <button
      type="button"
      class="status-click"
      :class="`lvl-${log.statusLevel}`"
      :title="t('点击查看完整日志（调试）', 'Click to open log (debug)')"
      @click="emit('openLog')"
    >
      <span class="status-label">{{ t('状态', 'Status') }}</span>
      <span class="status-text">{{ log.statusLine }}</span>
    </button>
  </footer>
</template>

<style scoped>
.status-bar {
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  min-height: 26px;
  background: color-mix(in srgb, var(--win-surface) 92%, var(--win-bg));
  border-top: 1px solid var(--win-border);
  font-size: 12px;
  color: var(--win-text-secondary);
}

.status-click {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 12px;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
}

.status-click:hover {
  background: rgba(0, 0, 0, 0.04);
}

.status-click:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--win-accent) 55%, transparent);
  outline-offset: -2px;
}

.status-label {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--win-text-secondary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 10px;
}

.status-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--win-text);
}

.status-click.lvl-warn .status-text {
  color: #8a5e00;
}

.status-click.lvl-error .status-text {
  color: #b10e1c;
  font-weight: 500;
}
</style>
