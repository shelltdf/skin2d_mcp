<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AppMenuBar from './components/AppMenuBar.vue'
import AppStatusBar from './components/AppStatusBar.vue'
import FormatsHelpDialog from './components/FormatsHelpDialog.vue'
import LogPanelDialog from './components/LogPanelDialog.vue'
import EditorViewport from './components/EditorViewport.vue'
import HierarchyPanel from './components/HierarchyPanel.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import TimelinePanel from './components/TimelinePanel.vue'
import { importAssetFile } from './importers'
import { useAppLogStore } from './stores/appLog'
import { useEditorStore } from './stores/editor'
import { useLive2dRuntimeStore } from './stores/live2dRuntime'
import { useSpineRuntimeStore } from './stores/spineRuntime'
import { useHierarchySelectionStore } from './stores/hierarchySelection'
import { useViewportDisplayStore } from './stores/viewportDisplay'
import { useDockLayoutStore } from './stores/dockLayout'
import { useUiSettingsStore } from './stores/uiSettings'

const appLog = useAppLogStore()
const store = useEditorStore()
const live2dStore = useLive2dRuntimeStore()
const spineStore = useSpineRuntimeStore()
const viewportDisplay = useViewportDisplayStore()
const hierarchySelection = useHierarchySelectionStore()
const dock = useDockLayoutStore()
const ui = useUiSettingsStore()
const t = ui.t

/** 与「全部类型」一致的 accept（扩展名为主，便于各浏览器文件类型下拉一致） */
const ACCEPT_ALL_IMPORT =
  '.json,.gltf,.glb,.dbproj,.atlas,.png,.jpg,.jpeg,.webp,.moc3,.zip'

const fileInputRef = ref<HTMLInputElement | null>(null)
const formatsHelpOpen = ref(false)
const logPanelOpen = ref(false)
const canvasFullscreen = ref(false)
const displayFullscreen = ref(false)
const fullscreenEnabled = ref(false)
const canvasFullscreenBeforeDisplay = ref(false)
const shouldRestoreCanvasAfterDisplayExit = ref(false)
const viewportFsRef = ref<HTMLElement | null>(null)
const importBtnRef = ref<HTMLButtonElement | null>(null)
const importAccept = ref(ACCEPT_ALL_IMPORT)
const importMultiple = ref(true)
const importMode = ref<'any' | 'spine' | 'live2dZip' | 'live2dModel3' | 'dragonbones' | 'gltf'>('any')
const importChooserOpen = ref(false)
const importChooserRef = ref<HTMLElement | null>(null)
const dockSnapshotBeforeCanvasFs = ref<{ left: boolean; right: boolean; bottom: boolean } | null>(null)

const isResizing = ref<'left' | 'right' | 'bottom' | null>(null)
let resizePointerId = -1
let resizeStartX = 0
let resizeStartY = 0
let resizeStartLeft = 0
let resizeStartRight = 0
let resizeStartBottom = 0

function onWindowResize() {
  // Window resize can make the saved dock sizes too large.
  // Re-apply current values to trigger clamping in the store.
  dock.setBottomHeight(dock.bottomHeight)
  dock.setLeftWidth(dock.leftWidth)
  dock.setRightWidth(dock.rightWidth)
}

function triggerImportPicker() {
  fileInputRef.value?.click()
  appLog.info(t('打开文件选择对话框', 'Open file picker'))
  requestAnimationFrame(() => importBtnRef.value?.blur())
}

/** 菜单「导入/打开」：先恢复全类型再在下一帧打开，避免沿用上一次的 accept */
function openFilePickerFromMenu() {
  importAccept.value = ACCEPT_ALL_IMPORT
  importMultiple.value = true
  importMode.value = 'any'
  void nextTick(() => triggerImportPicker())
}

function triggerTypedImport(kind: typeof importMode.value) {
  importMode.value = kind
  if (kind === 'spine') {
    importAccept.value = '.json,.atlas,.png,.jpg,.jpeg,.webp'
    importMultiple.value = true
  } else if (kind === 'live2dZip') {
    importAccept.value = '.zip'
    importMultiple.value = false
  } else if (kind === 'live2dModel3') {
    // 多数浏览器不接受「.model3.json」作为筛选项，仅用 .json；用户需自选 *.model3.json
    importAccept.value = '.json'
    importMultiple.value = false
  } else if (kind === 'dragonbones') {
    importAccept.value = '.dbproj,.json'
    importMultiple.value = false
  } else if (kind === 'gltf') {
    importAccept.value = '.glb,.gltf'
    importMultiple.value = false
  } else {
    importAccept.value = ACCEPT_ALL_IMPORT
    importMultiple.value = true
  }
  // 必须等 Vue 把 :accept / :multiple 刷到 DOM 后再 click，否则对话框仍用旧过滤器
  void nextTick(() => triggerImportPicker())
}

function openImportChooser() {
  importChooserOpen.value = !importChooserOpen.value
  requestAnimationFrame(() => importBtnRef.value?.blur())
}

function closeImportChooser() {
  importChooserOpen.value = false
}

function onDocumentPointerDown(e: PointerEvent) {
  if (!importChooserOpen.value) return
  const root = importChooserRef.value
  if (!root) return
  const target = e.target as Node | null
  if (target && root.contains(target)) return
  closeImportChooser()
}

function toggleCanvasFullscreen() {
  canvasFullscreen.value = !canvasFullscreen.value
  appLog.info(
    canvasFullscreen.value
      ? t('已进入画布全屏（隐藏侧栏与时间线）', 'Canvas fullscreen (hide docks)')
      : t('已退出画布全屏', 'Exit canvas fullscreen'),
  )
}

async function toggleDisplayFullscreen() {
  if (!fullscreenEnabled.value) return
  try {
    if (!document.fullscreenElement) {
      canvasFullscreenBeforeDisplay.value = canvasFullscreen.value
      shouldRestoreCanvasAfterDisplayExit.value = true
      canvasFullscreen.value = true
      await nextTick()
      if (!viewportFsRef.value) throw new Error('未找到画布容器')
      await viewportFsRef.value.requestFullscreen()
      appLog.info(t('已进入显示器全屏', 'Viewport fullscreen (display)'))
    } else {
      await document.exitFullscreen()
      appLog.info(t('已退出显示器全屏', 'Exit viewport fullscreen'))
    }
  } catch (e) {
    appLog.error(
      t('显示器全屏失败', 'Fullscreen failed'),
      e instanceof Error ? e.message : String(e),
    )
  }
}

function onFullscreenChange() {
  const now = Boolean(document.fullscreenElement && document.fullscreenElement === viewportFsRef.value)
  const was = displayFullscreen.value
  displayFullscreen.value = now
  // 用户按 Esc / 浏览器 UI 退出显示器全屏：恢复进入前的画布全屏状态
  if (was && !now && shouldRestoreCanvasAfterDisplayExit.value) {
    canvasFullscreen.value = canvasFullscreenBeforeDisplay.value
    shouldRestoreCanvasAfterDisplayExit.value = false
    appLog.info(
      canvasFullscreen.value
        ? t('退出显示器全屏：保持画布全屏', 'Exit fullscreen: keep canvas fullscreen')
        : t('退出显示器全屏：恢复侧栏与时间线', 'Exit fullscreen: restore docks'),
    )
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && canvasFullscreen.value) {
    e.preventDefault()
    canvasFullscreen.value = false
    appLog.info(t('已退出画布全屏 (Esc)', 'Exit canvas fullscreen (Esc)'))
  }
}

function beginResize(which: 'left' | 'right' | 'bottom', e: PointerEvent) {
  if (e.button !== 0) return
  if (canvasFullscreen.value) return
  e.preventDefault()
  isResizing.value = which
  resizePointerId = e.pointerId
  resizeStartX = e.clientX
  resizeStartY = e.clientY
  resizeStartLeft = dock.leftWidth
  resizeStartRight = dock.rightWidth
  resizeStartBottom = dock.bottomHeight
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function moveResize(e: PointerEvent) {
  if (!isResizing.value || e.pointerId !== resizePointerId) return
  const dx = e.clientX - resizeStartX
  const dy = e.clientY - resizeStartY
  if (isResizing.value === 'left') dock.setLeftWidth(resizeStartLeft + dx)
  else if (isResizing.value === 'right') dock.setRightWidth(resizeStartRight - dx)
  else if (isResizing.value === 'bottom') dock.setBottomHeight(resizeStartBottom - dy)
}

function endResize(e: PointerEvent) {
  if (!isResizing.value || e.pointerId !== resizePointerId) return
  isResizing.value = null
  resizePointerId = -1
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

function onFormatsHelp() {
  formatsHelpOpen.value = true
  appLog.info(t('打开「支持的文件格式」帮助', 'Open supported formats'))
}

function onNewProject() {
  spineStore.dispose()
  live2dStore.dispose()
  viewportDisplay.resetToDefaults()
  hierarchySelection.clear()
  store.setImportResult(null, null, null)
  appLog.info(t('新建工程：已清空导入与运行时', 'New project: cleared import and runtimes'))
}

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return

  const names = files.map((f) => f.name).join(', ')
  appLog.info(t(`开始导入（${files.length} 个文件）`, `Import start (${files.length} files)`), names)

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
    appLog.info(t(`已解析：${result.formatId}`, `Parsed: ${result.formatId}`), label)
    if (result.warnings?.length) {
      for (const w of result.warnings) appLog.warn(t('导入提示', 'Import warning'), w)
    }
  } catch (e) {
    const name = files.map((f) => f.name).join(', ')
    const msg = e instanceof Error ? e.message : String(e)
    store.setImportResult(name, null, msg)
    appLog.error(t('导入异常', 'Import failed'), msg)
  }
}

watch(
  () => store.importError,
  (err) => {
    if (err) appLog.error(t('属性面板：导入错误', 'Import error'), err)
  },
)

watch(
  () => canvasFullscreen.value,
  (v) => {
    if (v) {
      dockSnapshotBeforeCanvasFs.value = {
        left: dock.leftVisible,
        right: dock.rightVisible,
        bottom: dock.bottomVisible,
      }
      dock.setLeftVisible(false)
      dock.setRightVisible(false)
      dock.setBottomVisible(false)
    } else if (dockSnapshotBeforeCanvasFs.value) {
      dock.setLeftVisible(dockSnapshotBeforeCanvasFs.value.left)
      dock.setRightVisible(dockSnapshotBeforeCanvasFs.value.right)
      dock.setBottomVisible(dockSnapshotBeforeCanvasFs.value.bottom)
      dockSnapshotBeforeCanvasFs.value = null
    }
  },
)

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('pointerdown', onDocumentPointerDown)
  fullscreenEnabled.value = Boolean(document.fullscreenEnabled)
  onFullscreenChange()
  dock.loadFromStorage()
  window.addEventListener('resize', onWindowResize)
  appLog.info(t('应用已就绪', 'App ready'))
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  window.removeEventListener('resize', onWindowResize)
})
</script>

<template>
  <div class="app-root" :class="{ fullscreen: canvasFullscreen }">
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      :multiple="importMultiple"
      :accept="importAccept"
      @change="onFiles"
    />

    <AppMenuBar
      @import="openFilePickerFromMenu"
      @new-project="onNewProject"
      @open="openFilePickerFromMenu"
      @formats-help="onFormatsHelp"
    />

    <FormatsHelpDialog :open="formatsHelpOpen" @close="formatsHelpOpen = false" />
    <LogPanelDialog :open="logPanelOpen" @close="logPanelOpen = false" />

    <div class="app-workspace">
      <div class="toolbar">
        <div class="tb-left">
          <div class="tb-import-wrap">
            <button
              ref="importBtnRef"
              type="button"
              class="tb-icon-btn primary"
              :title="t('导入', 'Import')"
              :aria-label="t('导入', 'Import')"
              @click="openImportChooser"
            >
              <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"
                />
              </svg>
            </button>
            <div v-if="importChooserOpen" ref="importChooserRef" class="tb-import-chooser" role="dialog">
              <div class="chooser-title">{{ t('选择导入类型', 'Choose import type') }}</div>
              <button type="button" class="chooser-item" @click="closeImportChooser(); triggerTypedImport('spine')">
                <div class="ci-main">Spine</div>
                <div class="ci-sub">
                  {{ t('多选：.json + .atlas + 贴图', 'Multi-select: .json + .atlas + textures') }}
                </div>
              </button>
              <button type="button" class="chooser-item" @click="closeImportChooser(); triggerTypedImport('live2dZip')">
                <div class="ci-main">Live2D</div>
                <div class="ci-sub">{{ t('单选：.zip（画布预览）', 'Single: .zip (canvas preview)') }}</div>
              </button>
              <button
                type="button"
                class="chooser-item"
                @click="closeImportChooser(); triggerTypedImport('live2dModel3')"
              >
                <div class="ci-main">Live2D</div>
                <div class="ci-sub">{{ t('单选：.model3.json（仅元数据）', 'Single: .model3.json (metadata only)') }}</div>
              </button>
              <button type="button" class="chooser-item" @click="closeImportChooser(); triggerTypedImport('dragonbones')">
                <div class="ci-main">DragonBones</div>
                <div class="ci-sub">{{ t('单选：.dbproj 或 *_ske.json', 'Single: .dbproj or *_ske.json') }}</div>
              </button>
              <button type="button" class="chooser-item" @click="closeImportChooser(); triggerTypedImport('gltf')">
                <div class="ci-main">glTF</div>
                <div class="ci-sub">{{ t('单选：.glb / .gltf', 'Single: .glb / .gltf') }}</div>
              </button>
              <button type="button" class="chooser-item" @click="closeImportChooser(); triggerTypedImport('any')">
                <div class="ci-main">{{ t('全部类型', 'All types') }}</div>
                <div class="ci-sub">{{ t('允许多选（自动识别）', 'Multi-select allowed (auto-detect)') }}</div>
              </button>
              <button type="button" class="chooser-link" @click="closeImportChooser(); onFormatsHelp()">
                {{ t('查看支持的文件格式与导入方式…', 'View supported formats and import modes…') }}
              </button>
            </div>
          </div>
        </div>

        <div class="tb-center" role="group" :aria-label="t('Dock 显示/隐藏', 'Dock toggles')">
          <button
            type="button"
            class="tb-icon-btn"
            :class="{ on: dock.leftVisible }"
            :title="t('层级 Dock（显示/隐藏）', 'Hierarchy dock (toggle)')"
            :aria-label="t('层级 Dock（显示/隐藏）', 'Hierarchy dock (toggle)')"
            @click="dock.toggleLeft()"
          >
            <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M4 5h16v2H4V5zm0 6h10v2H4v-2zm0 6h16v2H4v-2z" />
            </svg>
          </button>
          <button
            type="button"
            class="tb-icon-btn"
            :class="{ on: dock.rightVisible }"
            :title="t('属性 Dock（显示/隐藏）', 'Properties dock (toggle)')"
            :aria-label="t('属性 Dock（显示/隐藏）', 'Properties dock (toggle)')"
            @click="dock.toggleRight()"
          >
            <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M4 6h10v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2zm12-10h4v12h-4V6z"
              />
            </svg>
          </button>
          <button
            type="button"
            class="tb-icon-btn"
            :class="{ on: dock.bottomVisible }"
            :title="t('时间轴 Dock（显示/隐藏）', 'Timeline dock (toggle)')"
            :aria-label="t('时间轴 Dock（显示/隐藏）', 'Timeline dock (toggle)')"
            @click="dock.toggleBottom()"
          >
            <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M4 5h16v14H4V5zm2 2v2h12V7H6zm0 4v6h12v-6H6z" />
            </svg>
          </button>
        </div>

        <div class="tb-right">
          <button
            type="button"
            class="tb-icon-btn"
            :title="canvasFullscreen ? t('退出画布全屏', 'Exit canvas fullscreen') : t('画布全屏', 'Canvas fullscreen')"
            :aria-label="canvasFullscreen ? t('退出画布全屏', 'Exit canvas fullscreen') : t('画布全屏', 'Canvas fullscreen')"
            @click="toggleCanvasFullscreen"
          >
            <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
              />
            </svg>
          </button>
          <button
            type="button"
            class="tb-icon-btn"
            :disabled="!fullscreenEnabled"
            :title="displayFullscreen ? t('退出显示器全屏', 'Exit fullscreen') : t('显示器全屏', 'Fullscreen')"
            :aria-label="displayFullscreen ? t('退出显示器全屏', 'Exit fullscreen') : t('显示器全屏', 'Fullscreen')"
            @click="toggleDisplayFullscreen"
          >
            <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="dock-root">
        <div
          v-if="dock.leftVisible"
          class="dock-left"
          :style="{ width: `${dock.leftWidth}px` }"
        >
          <HierarchyPanel />
        </div>
        <div
          v-if="dock.leftVisible"
          class="splitter v"
          :title="t('拖动调整层级宽度', 'Drag to resize hierarchy')"
          @pointerdown="beginResize('left', $event)"
          @pointermove="moveResize"
          @pointerup="endResize"
          @pointercancel="endResize"
        />

        <div class="dock-center">
          <div ref="viewportFsRef" class="viewport-fs-host">
            <EditorViewport />
          </div>
        </div>

        <div
          v-if="dock.rightVisible"
          class="splitter v"
          :title="t('拖动调整属性宽度', 'Drag to resize properties')"
          @pointerdown="beginResize('right', $event)"
          @pointermove="moveResize"
          @pointerup="endResize"
          @pointercancel="endResize"
        />
        <div
          v-if="dock.rightVisible"
          class="dock-right"
          :style="{ width: `${dock.rightWidth}px` }"
        >
          <PropertyPanel />
        </div>
      </div>

      <div
        v-if="dock.bottomVisible"
        class="splitter h bottom-split"
        :title="t('拖动调整时间轴高度', 'Drag to resize timeline')"
        @pointerdown="beginResize('bottom', $event)"
        @pointermove="moveResize"
        @pointerup="endResize"
        @pointercancel="endResize"
      />
      <div
        v-if="dock.bottomVisible"
        class="dock-bottom"
        :style="{ height: `${dock.bottomHeight}px` }"
      >
        <TimelinePanel />
      </div>
    </div>

    <AppStatusBar @open-log="logPanelOpen = true" />
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

.app-workspace {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  padding: 6px 10px;
  background: var(--win-surface);
  border-bottom: 1px solid var(--win-border);
}

.tb-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.tb-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 0;
}

.tb-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  justify-content: flex-end;
}

.tb-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: var(--win-radius-sm);
  border: 1px solid var(--win-border-strong);
  background: var(--win-surface);
  color: var(--win-text);
  cursor: pointer;
}

.tb-import-chooser {
  position: absolute;
  left: 0;
  top: calc(100% + 8px);
  z-index: 30;
  width: min(420px, 72vw);
  padding: 10px;
  border-radius: var(--win-radius-sm);
  border: 1px solid var(--win-border);
  background: color-mix(in srgb, var(--win-surface) 96%, transparent);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.14);
  backdrop-filter: blur(8px);
}

.chooser-title {
  font-weight: 800;
  font-size: 12px;
  color: var(--win-text);
  margin: 0 0 8px;
}

.chooser-item {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  color: var(--win-text);
}

.chooser-item:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.06);
}

.ci-main {
  font-weight: 700;
  font-size: 12px;
}

.ci-sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--win-text-secondary);
}

.chooser-link {
  width: 100%;
  margin-top: 8px;
  padding: 6px 10px;
  border: 1px solid var(--win-border);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.02);
  cursor: pointer;
  font-size: 12px;
  color: var(--win-text);
}

.chooser-link:hover {
  background: rgba(0, 0, 0, 0.04);
}

.tb-icon-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
}

.tb-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tb-icon-btn.primary {
  background: var(--win-accent);
  border-color: var(--win-accent);
  color: #fff;
}

.tb-icon-btn.primary:hover:not(:disabled) {
  background: var(--win-accent-hover);
  border-color: var(--win-accent-hover);
}

.tb-icon-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--win-accent) 65%, transparent);
  outline-offset: 2px;
}

.tb-icon-btn.on {
  background: rgba(0, 103, 192, 0.12);
  border-color: rgba(0, 103, 192, 0.35);
}

.ico {
  width: 20px;
  height: 20px;
  display: block;
}

.tb-import-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.dock-root {
  display: flex;
  flex: 1;
  min-height: 0;
}

.dock-left,
.dock-right {
  min-height: 0;
  overflow: hidden;
}

.dock-center {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.dock-bottom {
  flex-shrink: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dock-bottom > * {
  flex: 1;
  min-height: 0;
}

.bottom-split {
  /* 让时间轴分隔条横跨整个工作区 */
  width: 100%;
}

.splitter {
  background: transparent;
  position: relative;
  flex-shrink: 0;
}

.splitter.v {
  width: 6px;
  cursor: col-resize;
}

.splitter.h {
  height: 6px;
  cursor: row-resize;
}

.splitter::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.06);
  opacity: 0;
  transition: opacity 120ms ease;
}

.splitter:hover::before {
  opacity: 1;
}

.splitter:active::before {
  opacity: 1;
  background: color-mix(in srgb, var(--win-accent) 20%, rgba(0, 0, 0, 0.06));
}

.viewport-fs-host {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
}

.viewport-fs-host > * {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

/* 当画布容器进入浏览器全屏时，确保背景一致 */
.viewport-fs-host:fullscreen {
  background: #ececec;
}
</style>
