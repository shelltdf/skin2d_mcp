<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useUiSettingsStore } from '../stores/uiSettings'

const emit = defineEmits<{
  import: []
  newProject: []
  open: []
  formatsHelp: []
}>()

const ui = useUiSettingsStore()

const activeMenu = ref<'file' | 'help' | 'lang' | 'style' | null>(null)
const navRef = ref<HTMLElement | null>(null)

function toggleMenu(which: 'file' | 'help' | 'lang' | 'style') {
  activeMenu.value = activeMenu.value === which ? null : which
}

function closeMenus() {
  activeMenu.value = null
}

function onGlobalPointerDown(e: PointerEvent) {
  if (!activeMenu.value) return
  const nav = navRef.value
  if (!nav) return
  const t = e.target as Node | null
  if (t && nav.contains(t)) return
  closeMenus()
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && activeMenu.value) {
    e.preventDefault()
    closeMenus()
  }
}

function onTopHover(which: 'file' | 'help' | 'lang' | 'style') {
  if (!activeMenu.value) return
  activeMenu.value = which
}

onMounted(() => {
  document.addEventListener('pointerdown', onGlobalPointerDown)
  document.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onGlobalPointerDown)
  document.removeEventListener('keydown', onGlobalKeydown)
})

function onImport() {
  closeMenus()
  emit('import')
}

function onNew() {
  closeMenus()
  emit('newProject')
}

function onOpen() {
  closeMenus()
  emit('open')
}

function onFormatsHelp() {
  closeMenus()
  emit('formatsHelp')
}

function t(zh: string, en: string) {
  return ui.language === 'en' ? en : zh
}

function setLang(v: 'zh' | 'en') {
  closeMenus()
  ui.setLanguage(v)
}

function setTheme(v: 'system' | 'light' | 'dark') {
  closeMenus()
  ui.setTheme(v)
}
</script>

<template>
  <header class="chrome">
    <div class="title-drag">
      <span class="app-icon" aria-hidden="true">◇</span>
      <span class="app-title">Skin2D</span>
    </div>
    <nav ref="navRef" class="menubar">
      <div class="menu-wrap">
        <button
          type="button"
          class="menu-top"
          @click="toggleMenu('file')"
          @pointerenter="onTopHover('file')"
        >
          {{ t('文件', 'File') }}
        </button>
        <div v-if="activeMenu === 'file'" class="dropdown">
          <button type="button" class="menu-item" @click="onNew">{{ t('新建工程', 'New Project') }}</button>
          <button type="button" class="menu-item" @click="onOpen">{{ t('打开…', 'Open…') }}</button>
          <div class="sep" />
          <button type="button" class="menu-item accent" @click="onImport">{{ t('导入…', 'Import…') }}</button>
        </div>
      </div>
      <button type="button" class="menu-top" disabled :title="t('即将推出', 'Coming soon')">
        {{ t('编辑', 'Edit') }}
      </button>
      <button type="button" class="menu-top" disabled :title="t('即将推出', 'Coming soon')">
        {{ t('视图', 'View') }}
      </button>

      <div class="menu-wrap">
        <button
          type="button"
          class="menu-top"
          @click="toggleMenu('lang')"
          @pointerenter="onTopHover('lang')"
        >
          {{ t('语言', 'Language') }}
        </button>
        <div v-if="activeMenu === 'lang'" class="dropdown">
          <button type="button" class="menu-item" :class="{ checked: ui.language === 'zh' }" @click="setLang('zh')">
            {{ t('中文', 'Chinese') }}
          </button>
          <button type="button" class="menu-item" :class="{ checked: ui.language === 'en' }" @click="setLang('en')">
            English
          </button>
        </div>
      </div>

      <div class="menu-wrap">
        <button
          type="button"
          class="menu-top"
          @click="toggleMenu('style')"
          @pointerenter="onTopHover('style')"
        >
          {{ t('样式', 'Style') }}
        </button>
        <div v-if="activeMenu === 'style'" class="dropdown">
          <button
            type="button"
            class="menu-item"
            :class="{ checked: ui.theme === 'system' }"
            @click="setTheme('system')"
          >
            {{ t('跟随系统', 'Follow system') }}
          </button>
          <button
            type="button"
            class="menu-item"
            :class="{ checked: ui.theme === 'light' }"
            @click="setTheme('light')"
          >
            {{ t('浅色', 'Light') }}
          </button>
          <button
            type="button"
            class="menu-item"
            :class="{ checked: ui.theme === 'dark' }"
            @click="setTheme('dark')"
          >
            {{ t('深色', 'Dark') }}
          </button>
        </div>
      </div>

      <div class="menu-wrap">
        <button
          type="button"
          class="menu-top"
          @click="toggleMenu('help')"
          @pointerenter="onTopHover('help')"
        >
          {{ t('帮助', 'Help') }}
        </button>
        <div v-if="activeMenu === 'help'" class="dropdown dropdown-help">
          <button type="button" class="menu-item accent" @click="onFormatsHelp">
            {{ t('支持的文件格式…', 'Supported formats…') }}
          </button>
        </div>
      </div>
    </nav>
    <div class="window-btns" aria-hidden="true">
      <span class="win-btn min" />
      <span class="win-btn max" />
      <span class="win-btn close" />
    </div>
  </header>
</template>

<style scoped>
.chrome {
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 0 8px 0 12px;
  background: var(--win-titlebar);
  border-bottom: 1px solid var(--win-titlebar-border);
  user-select: none;
  gap: 8px;
}

.title-drag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 12px;
  border-right: 1px solid var(--win-border);
}

.app-icon {
  color: var(--win-accent);
  font-size: 16px;
  line-height: 1;
}

.app-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.menubar {
  display: flex;
  align-items: stretch;
  flex: 1;
  gap: 2px;
}

.menu-wrap {
  position: relative;
}

.menu-top {
  border: none;
  background: transparent;
  padding: 6px 10px;
  border-radius: var(--win-radius-sm);
  color: var(--win-text);
  font-size: 13px;
}

.menu-top:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.06);
}

.menu-top:disabled {
  opacity: 0.45;
  cursor: default;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  margin-top: 4px;
  padding: 4px;
  background: var(--win-surface);
  border: 1px solid var(--win-border-strong);
  border-radius: var(--win-radius-sm);
  box-shadow: var(--win-shadow);
  z-index: 100;
}

.dropdown-help {
  min-width: 220px;
}

.menu-item {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 8px 12px 8px 34px;
  border-radius: var(--win-radius-sm);
  font-size: 13px;
  color: var(--win-text);
  position: relative;
}

.menu-item:hover {
  background: rgba(0, 103, 192, 0.08);
}

.menu-item.accent {
  color: var(--win-accent);
  font-weight: 600;
}

.menu-item::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
}

.menu-item.checked::before {
  content: '✓';
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--win-accent);
}

.sep {
  height: 1px;
  margin: 4px 8px;
  background: var(--win-border);
}

.window-btns {
  display: flex;
  align-items: center;
  gap: 2px;
}

.win-btn {
  width: 46px;
  height: 28px;
  border-radius: var(--win-radius-sm);
  background: transparent;
}

.win-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.win-btn.close:hover {
  background: #e81123;
}
</style>
