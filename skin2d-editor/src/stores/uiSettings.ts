import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type UiLanguage = 'zh' | 'en'
export type UiTheme = 'system' | 'light' | 'dark'

type Snapshot = {
  language: UiLanguage
  theme: UiTheme
}

const LS_KEY = 'skin2d.uiSettings.v1'

export const useUiSettingsStore = defineStore('uiSettings', () => {
  const language = ref<UiLanguage>('zh')
  const theme = ref<UiTheme>('system')

  function applyToDom() {
    try {
      document.documentElement.lang = language.value === 'en' ? 'en' : 'zh-CN'
      if (theme.value === 'system') {
        document.documentElement.removeAttribute('data-theme')
      } else {
        document.documentElement.setAttribute('data-theme', theme.value)
      }
    } catch {
      /* ignore */
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const obj = JSON.parse(raw) as Partial<Snapshot>
      if (obj.language === 'zh' || obj.language === 'en') language.value = obj.language
      if (obj.theme === 'system' || obj.theme === 'light' || obj.theme === 'dark') theme.value = obj.theme
    } catch {
      /* ignore */
    }
  }

  function save() {
    try {
      const snap: Snapshot = { language: language.value, theme: theme.value }
      localStorage.setItem(LS_KEY, JSON.stringify(snap))
    } catch {
      /* ignore */
    }
  }

  function setLanguage(v: UiLanguage) {
    language.value = v
    save()
    applyToDom()
  }

  function setTheme(v: UiTheme) {
    theme.value = v
    save()
    applyToDom()
  }

  const isEnglish = computed(() => language.value === 'en')

  function t(zh: string, en: string) {
    return isEnglish.value ? en : zh
  }

  return {
    language,
    theme,
    isEnglish,
    t,
    load,
    save,
    applyToDom,
    setLanguage,
    setTheme,
  }
})

