<script setup lang="ts">
import { ref } from 'vue'
import AppMenuBar from './components/AppMenuBar.vue'
import FormatsHelpDialog from './components/FormatsHelpDialog.vue'
import EditorViewport from './components/EditorViewport.vue'
import HierarchyPanel from './components/HierarchyPanel.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import TimelinePanel from './components/TimelinePanel.vue'
import { importAssetFile } from './importers'
import { useEditorStore } from './stores/editor'
import { useSpineRuntimeStore } from './stores/spineRuntime'

const store = useEditorStore()
const spineStore = useSpineRuntimeStore()
const fileInputRef = ref<HTMLInputElement | null>(null)
const formatsHelpOpen = ref(false)

function triggerImportPicker() {
  fileInputRef.value?.click()
}

function onNewProject() {
  spineStore.dispose()
  store.setImportResult(null, null, null)
}

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return

  spineStore.dispose()
  store.setImportResult(null, null, null)

  try {
    if (files.length >= 2) {
      const ok = await spineStore.loadFromFiles(files)
      if (ok) return
      if (spineStore.loadError) {
        store.setImportResult(
          files.map((f) => f.name).join(', '),
          null,
          spineStore.loadError,
        )
        return
      }
    }

    const file = files[0]
    const result = await importAssetFile(file)
    const label = files.length > 1 ? files.map((f) => f.name).join(', ') : file.name
    store.setImportResult(label, result, null)
  } catch (e) {
    const name = files.map((f) => f.name).join(', ')
    store.setImportResult(name, null, e instanceof Error ? e.message : String(e))
  }
}
</script>

<template>
  <div class="app-root">
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      multiple
      accept=".json,.gltf,.glb,.dbproj,.atlas,.png,.jpg,.jpeg,.webp,image/*,application/json"
      @change="onFiles"
    />

    <AppMenuBar
      @import="triggerImportPicker"
      @new-project="onNewProject"
      @open="triggerImportPicker"
      @formats-help="formatsHelpOpen = true"
    />

    <FormatsHelpDialog :open="formatsHelpOpen" @close="formatsHelpOpen = false" />

    <div class="toolbar">
      <button type="button" class="tb-btn primary" @click="triggerImportPicker">导入</button>
      <span class="tb-hint">Spine 请一次多选 JSON + .atlas + 贴图；亦支持单文件骨架与 DragonBones / glTF</span>
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
