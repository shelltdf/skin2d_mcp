<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AppMenuBar from './components/AppMenuBar.vue'
import FormatsHelpDialog from './components/FormatsHelpDialog.vue'
import EditorViewport from './components/EditorViewport.vue'
import HierarchyPanel from './components/HierarchyPanel.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import TimelinePanel from './components/TimelinePanel.vue'
import { importAssetFile } from './importers'
import { useEditorStore } from './stores/editor'
import { useLive2dRuntimeStore } from './stores/live2dRuntime'
import { useSpineRuntimeStore } from './stores/spineRuntime'
import { useHierarchySelectionStore } from './stores/hierarchySelection'
import { useViewportDisplayStore } from './stores/viewportDisplay'

const store = useEditorStore()
const live2dStore = useLive2dRuntimeStore()
const spineStore = useSpineRuntimeStore()
const viewportDisplay = useViewportDisplayStore()
const hierarchySelection = useHierarchySelectionStore()
const fileInputRef = ref<HTMLInputElement | null>(null)
const formatsHelpOpen = ref(false)
const canvasFullscreen = ref(false)

function triggerImportPicker() {
  fileInputRef.value?.click()
}

function toggleCanvasFullscreen() {
  canvasFullscreen.value = !canvasFullscreen.value
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && canvasFullscreen.value) {
    e.preventDefault()
    canvasFullscreen.value = false
  }
}

function onNewProject() {
  spineStore.dispose()
  live2dStore.dispose()
  viewportDisplay.resetToDefaults()
  hierarchySelection.clear()
  store.setImportResult(null, null, null)
}

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return

  spineStore.dispose()
  live2dStore.dispose()
  hierarchySelection.clear()
  store.setImportResult(null, null, null)

  try {
    const first = files[0]
    if (files.length === 1 && first.name.toLowerCase().endsWith('.zip')) {
      await live2dStore.queueZip(first)
      store.setImportResult(first.name, live2dStore.previewImport, live2dStore.loadError)
      return
    }

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

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="app-root" :class="{ fullscreen: canvasFullscreen }">
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      multiple
      accept=".json,.gltf,.glb,.dbproj,.atlas,.png,.jpg,.jpeg,.webp,.moc3,.zip,application/zip,image/*,application/json"
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
      <div class="tb-import-wrap">
        <button type="button" class="tb-btn primary" @click="triggerImportPicker">导入</button>
        <button
          type="button"
          class="tb-help"
          aria-label="导入格式提示"
          title="将鼠标悬浮在此查看提示"
        >
          ?
        </button>
        <div class="tb-tooltip" role="tooltip" aria-hidden="true">
          <div class="tb-tooltip-title">导入方式（每行一个格式）</div>
          <div class="tb-tooltip-body">
            <div class="tb-tip-line"><strong>Spine</strong>：同一次多选 <code>.json</code> + <code>.atlas</code> + 贴图</div>
            <div class="tb-tip-line"><strong>Live2D</strong>：画布预览导入单个 <code>.zip</code>（含 <code>.model3.json</code> / <code>.moc3</code> / 贴图）</div>
            <div class="tb-tip-line"><strong>Live2D</strong>：单个 <code>.model3.json</code> 仅元数据</div>
            <div class="tb-tip-line"><strong>DragonBones</strong>：单文件 <code>*.dbproj</code> 或 <code>*_ske.json</code></div>
            <div class="tb-tip-line"><strong>glTF</strong>：单文件 <code>.glb</code>（或 <code>.gltf</code>）</div>
          </div>
        </div>
      </div>
      <button type="button" class="tb-btn" @click="toggleCanvasFullscreen">
        {{ canvasFullscreen ? '退出全屏' : '画布全屏' }}
      </button>
    </div>

    <div class="main-row">
      <HierarchyPanel v-show="!canvasFullscreen" />
      <EditorViewport />
      <PropertyPanel v-show="!canvasFullscreen" />
    </div>

    <TimelinePanel v-show="!canvasFullscreen" />
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

.app-root.fullscreen {
  height: 100vh;
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

.tb-import-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.tb-help {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 1px solid var(--win-border-strong);
  background: var(--win-surface);
  color: var(--win-text-secondary);
  font-size: 13px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tb-help:hover {
  background: rgba(0, 0, 0, 0.04);
}

.tb-help:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--win-accent) 65%, transparent);
  outline-offset: 2px;
}

.tb-tooltip {
  position: absolute;
  left: 0;
  top: calc(100% + 8px);
  z-index: 20;
  width: min(520px, 78vw);
  padding: 10px 12px;
  border-radius: var(--win-radius-sm);
  border: 1px solid var(--win-border);
  background: color-mix(in srgb, var(--win-surface) 96%, transparent);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(8px);
  font-size: 12px;
  color: var(--win-text);
  display: none;
}

.tb-import-wrap:hover .tb-tooltip,
.tb-import-wrap:focus-within .tb-tooltip {
  display: block;
}

.tb-tooltip-title {
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--win-text);
}

.tb-tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--win-text-secondary);
}

.tb-tip-line strong {
  color: var(--win-text);
}

.main-row {
  display: flex;
  flex: 1;
  min-height: 0;
}
</style>
