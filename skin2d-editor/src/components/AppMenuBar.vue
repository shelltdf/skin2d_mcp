<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  import: []
  newProject: []
  open: []
}>()

const fileOpen = ref(false)

function toggleFile() {
  fileOpen.value = !fileOpen.value
}

function closeMenus() {
  fileOpen.value = false
}

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
</script>

<template>
  <header class="chrome">
    <div class="title-drag">
      <span class="app-icon" aria-hidden="true">◇</span>
      <span class="app-title">Skin2D</span>
    </div>
    <nav class="menubar" @mouseleave="closeMenus">
      <div class="menu-wrap">
        <button type="button" class="menu-top" @click="toggleFile">文件</button>
        <div v-if="fileOpen" class="dropdown">
          <button type="button" class="menu-item" @click="onNew">新建工程</button>
          <button type="button" class="menu-item" @click="onOpen">打开…</button>
          <div class="sep" />
          <button type="button" class="menu-item accent" @click="onImport">导入…</button>
        </div>
      </div>
      <button type="button" class="menu-top" disabled title="即将推出">编辑</button>
      <button type="button" class="menu-top" disabled title="即将推出">视图</button>
      <button type="button" class="menu-top" disabled title="即将推出">帮助</button>
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

.menu-item {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 8px 12px;
  border-radius: var(--win-radius-sm);
  font-size: 13px;
  color: var(--win-text);
}

.menu-item:hover {
  background: rgba(0, 103, 192, 0.08);
}

.menu-item.accent {
  color: var(--win-accent);
  font-weight: 600;
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
