import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useUiSettingsStore } from './uiSettings'

export type AppLogLevel = 'info' | 'warn' | 'error'

export interface AppLogEntry {
  id: number
  time: number
  level: AppLogLevel
  message: string
  detail?: string
}

let nextId = 1

function formatTime(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export const useAppLogStore = defineStore('appLog', () => {
  const entries = ref<AppLogEntry[]>([])
  const maxEntries = 800

  function push(level: AppLogLevel, message: string, detail?: string) {
    entries.value.unshift({
      id: nextId++,
      time: Date.now(),
      level,
      message,
      detail,
    })
    if (entries.value.length > maxEntries) {
      entries.value.length = maxEntries
    }
  }

  function info(message: string, detail?: string) {
    push('info', message, detail)
  }

  function warn(message: string, detail?: string) {
    push('warn', message, detail)
  }

  function error(message: string, detail?: string) {
    push('error', message, detail)
  }

  function clear() {
    entries.value = []
  }

  const lastEntry = computed(() => entries.value[0] ?? null)

  const statusLine = computed(() => lastEntry.value?.message ?? useUiSettingsStore().t('就绪', 'Ready'))

  const statusLevel = computed(() => lastEntry.value?.level ?? 'info')

  function formatEntryLine(e: AppLogEntry): string {
    const t = formatTime(e.time)
    const tag = e.level.toUpperCase()
    let s = `[${t}] ${tag} ${e.message}`
    if (e.detail) s += `\n  ${e.detail}`
    return s
  }

  function copyAllText(): string {
    return [...entries.value].reverse().map(formatEntryLine).join('\n')
  }

  return {
    entries,
    push,
    info,
    warn,
    error,
    clear,
    lastEntry,
    statusLine,
    statusLevel,
    formatTime,
    formatEntryLine,
    copyAllText,
  }
})
