<script setup lang="ts">
import { ref } from 'vue'
import AppMenuBar from './components/AppMenuBar.vue'
import EditorViewport from './components/EditorViewport.vue'
import HierarchyPanel from './components/HierarchyPanel.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import TimelinePanel from './components/TimelinePanel.vue'
import { importAssetFile } from './importers'
import { useEditorStore } from './stores/editor'

const store = useEditorStore()
const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerImportPicker() {
  fileInputRef.value?.click()
}

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  store.setImportResult(null, null, null)
  try {
    const result = await importAssetFile(file)
    store.setImportResult(file.name, result, null)
  } catch (e) {
    store.setImportResult(file.name, null, e instanceof Error ? e.message : String(e))
  }
}
</script>

<template>
  <div class="app-root">
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      accept=".json,.gltf,.glb,application/json"
      @change="onFiles"
    />

    <AppMenuBar
      @import="triggerImportPicker"
      @new-project="() => store.setImportResult(null, null, null)"
      @open="triggerImportPicker"
    />

    <div class="toolbar">
      <button type="button" class="tb-btn primary" @click="triggerImportPicker">导入</button>
      <span class="tb-hint">支持 Spine JSON、DragonBones、glTF 2.0（.gltf / .glb）</span>
    </div>

    <div class="main-row">
      <HierarchyPanel />
      <EditorViewport />
      <PropertyPanel />
    </div>

    <TimelinePanel />
  </div>
</template>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 0;
  background: var(--win-bg);
}

.hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--win-surface);
  border-bottom: 1px solid var(--win-border);
}

.tb-btn {
  padding: 6px 16px;
  border-radius: var(--win-radius-sm);
  border: 1px solid var(--win-border-strong);
  background: var(--win-surface);
  font-size: 13px;
}

.tb-btn.primary {
  background: var(--win-accent);
  border-color: var(--win-accent);
  color: #fff;
}

.tb-btn.primary:hover {
  background: var(--win-accent-hover);
  border-color: var(--win-accent-hover);
}

.tb-hint {
  font-size: 12px;
  color: var(--win-text-secondary);
}

.main-row {
  display: flex;
  flex: 1;
  min-height: 0;
}
</style>
