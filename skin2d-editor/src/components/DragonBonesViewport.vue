<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDragonbonesRuntimeStore } from '../stores/dragonbonesRuntime'
import { useEditorStore } from '../stores/editor'
import { useViewportDisplayStore } from '../stores/viewportDisplay'
import { useUiSettingsStore } from '../stores/uiSettings'

const db = useDragonbonesRuntimeStore()
const { playing: dbPlaying, userZoomMul: dbUserZoom } = storeToRefs(db)
const editor = useEditorStore()
const display = useViewportDisplayStore()
const ui = useUiSettingsStore()
const t = ui.t
const { lastImport, lastFileName } = storeToRefs(editor)
const el = ref<HTMLDivElement | null>(null)

const isPanning = ref(false)
let panPointerId = -1
let lastPanX = 0
let lastPanY = 0

const hudLines = computed(() => {
  if (!display.showHud) return []
  const lines: string[] = [t('Skin2D 视口', 'Skin2D viewport')]
  if (lastFileName.value) {
    lines.push(`${t('文件', 'File')}: ${lastFileName.value}`)
  }
  const imp = lastImport.value
  if (imp) {
    lines.push(`${t('格式', 'Format')}: ${imp.formatId}`)
    if (imp.skeletonName) {
      lines.push(`${t('骨架', 'Skeleton')}: ${imp.skeletonName}`)
    }
    if (imp.boneCount != null) {
      lines.push(`${t('骨骼数', 'Bones')}: ${imp.boneCount}`)
    }
  }
  lines.push(dbPlaying.value ? t('动画：播放中', 'Animation: playing') : t('动画：已暂停', 'Animation: paused'))
  lines.push(`${t('缩放', 'Zoom')} ×${dbUserZoom.value.toFixed(2)}`)
  return lines
})

function onWheel(e: WheelEvent) {
  if (!el.value) return
  db.dbOnWheel(e)
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 1) return
  e.preventDefault()
  const host = el.value
  if (!host) return
  isPanning.value = true
  panPointerId = e.pointerId
  lastPanX = e.clientX
  lastPanY = e.clientY
  host.setPointerCapture(e.pointerId)
  host.style.cursor = 'grabbing'
}

function onPointerMove(e: PointerEvent) {
  if (!isPanning.value || e.pointerId !== panPointerId) return
  const dx = e.clientX - lastPanX
  const dy = e.clientY - lastPanY
  lastPanX = e.clientX
  lastPanY = e.clientY
  db.dbOnPanDelta(dx, dy)
}

function onPointerUp(e: PointerEvent) {
  if (!isPanning.value || e.pointerId !== panPointerId) return
  const host = el.value
  if (host) {
    try {
      host.releasePointerCapture(panPointerId)
    } catch {
      /* ignore */
    }
    host.style.cursor = ''
  }
  isPanning.value = false
  panPointerId = -1
}

function onDblClick(e: MouseEvent) {
  e.preventDefault()
  db.dbResetView()
}

onMounted(async () => {
  if (!el.value) return
  await db.mountInto(el.value)
})

watch(
  () => [display.showGridLines, display.showWorldOrigin] as const,
  ([g, o]) => {
    db.setWorldOverlayVisible(g, o)
  },
  { immediate: true },
)

onUnmounted(() => {
  db.unmount()
})
</script>

<template>
  <div class="db-root">
    <div
      class="db-stack"
      @wheel.capture.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dblclick.prevent="onDblClick"
    >
      <div ref="el" class="db-canvas-host" />
    </div>
    <div v-if="display.showHud && hudLines.length" class="db-hud">
      <p v-for="(line, i) in hudLines" :key="i">{{ line }}</p>
    </div>
  </div>
</template>

<style scoped>
.db-root {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: #ececec;
}

.db-stack {
  position: absolute;
  inset: 0;
  isolation: isolate;
}

.db-canvas-host {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.db-hud {
  position: absolute;
  left: 16px;
  top: 12px;
  margin: 0;
  padding: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #1a1a1a;
  pointer-events: none;
  text-shadow: 0 0 6px #ececec;
  z-index: 10;
}

.db-hud p {
  margin: 0 0 2px;
}
</style>
