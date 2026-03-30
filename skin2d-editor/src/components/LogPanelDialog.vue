<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAppLogStore } from '../stores/appLog'
import { useUiSettingsStore } from '../stores/uiSettings'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const log = useAppLogStore()
const ui = useUiSettingsStore()
const t = ui.t
const panelRef = ref<HTMLElement | null>(null)
const consoleRef = ref<HTMLPreElement | null>(null)

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) {
    e.preventDefault()
    emit('close')
  }
}

async function copyAll() {
  try {
    await navigator.clipboard.writeText(log.copyAllText())
    log.info(t('日志已复制到剪贴板', 'Copied logs to clipboard'))
  } catch {
    log.warn(t('复制失败', 'Copy failed'), t('浏览器未允许剪贴板权限', 'Clipboard permission not granted'))
  }
}

function clearLog() {
  log.clear()
  log.info(t('日志已清空', 'Logs cleared'))
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      document.body.style.overflow = 'hidden'
      void nextTick(() => panelRef.value?.focus())
    } else {
      document.body.style.overflow = ''
    }
  },
)

watch(
  () => log.entries.length,
  () => {
    if (!props.open) return
    void nextTick(() => {
      const el = consoleRef.value
      if (el) el.scrollTop = el.scrollHeight
    })
  },
)

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="backdrop"
      role="presentation"
      @click="onBackdropClick"
    >
      <div
        ref="panelRef"
        class="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-panel-title"
        tabindex="-1"
        @click.stop
      >
        <div class="panel-head">
          <h2 id="log-panel-title" class="title">{{ t('操作日志', 'Operation log') }}</h2>
          <div class="head-actions">
            <button type="button" class="btn-ghost" @click="copyAll">{{ t('复制全部', 'Copy all') }}</button>
            <button type="button" class="btn-ghost" @click="clearLog">{{ t('清空', 'Clear') }}</button>
            <button
              type="button"
              class="close-btn"
              :aria-label="t('关闭', 'Close')"
              @click="emit('close')"
            >
              ✕
            </button>
          </div>
        </div>
        <div class="panel-body">
          <p v-if="!log.entries.length" class="muted">
            {{ t('暂无记录。导入、全屏等操作会写在这里。', 'No entries yet. Import/fullscreen actions will appear here.') }}
          </p>
          <pre
            v-else
            ref="consoleRef"
            class="console"
            :aria-label="t('日志控制台（纯文本）', 'Log console (plain text)')"
          >{{ log.copyAllText() }}</pre>
        </div>
        <div class="panel-foot">
          <button type="button" class="btn-primary" @click="emit('close')">{{ t('关闭', 'Close') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.panel {
  width: min(720px, 100%);
  max-height: min(85vh, 640px);
  display: flex;
  flex-direction: column;
  background: var(--win-surface, #fff);
  border: 1px solid var(--win-titlebar-border, #cfcfcf);
  border-radius: 10px;
  box-shadow:
    0 18px 56px rgba(0, 0, 0, 0.22),
    0 2px 10px rgba(0, 0, 0, 0.12);
  outline: none;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 8px 8px 12px;
  background: var(--win-titlebar, #f5f5f5);
  border-bottom: 1px solid var(--win-titlebar-border, #e2e2e2);
  flex-shrink: 0;
}

.title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-ghost {
  padding: 4px 10px;
  border-radius: var(--win-radius-sm, 4px);
  border: 1px solid var(--win-border);
  background: color-mix(in srgb, var(--win-surface) 92%, transparent);
  font-size: 12px;
  cursor: pointer;
}

.btn-ghost:hover {
  background: rgba(0, 0, 0, 0.04);
}

.close-btn {
  width: 44px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 14px;
  color: var(--win-text-secondary, #5c5c5c);
}

.close-btn:hover {
  background: #e81123;
  color: #fff;
}

.panel-body {
  flex: 1;
  overflow: auto;
  padding: 10px 14px;
  font-size: 12px;
  line-height: 1.45;
  background: color-mix(in srgb, var(--win-bg) 70%, transparent);
}

.muted {
  margin: 0;
  color: var(--win-text-secondary);
}

.console {
  margin: 0;
  width: 100%;
  height: 100%;
  min-height: 260px;
  padding: 10px 12px;
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, 0.22);
  border-radius: 8px;
  background: #0c0f14;
  color: #e6edf3;
  font-family: var(--win-mono, Consolas, monospace);
  font-size: 11.5px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: auto;
}

.panel-foot {
  padding: 10px 14px 12px;
  border-top: 1px solid var(--win-border, #e5e5e5);
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  background: var(--win-surface, #fff);
}

.btn-primary {
  min-width: 88px;
  padding: 6px 16px;
  border: 1px solid var(--win-accent, #0067c0);
  border-radius: var(--win-radius-sm, 4px);
  background: var(--win-accent, #0067c0);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.btn-primary:hover {
  background: var(--win-accent-hover, #005a9e);
  border-color: var(--win-accent-hover, #005a9e);
}
</style>
