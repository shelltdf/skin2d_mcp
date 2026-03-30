<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useLive2dRuntimeStore } from '../stores/live2dRuntime'
import { useUiSettingsStore } from '../stores/uiSettings'

const live2d = useLive2dRuntimeStore()
const ui = useUiSettingsStore()
const t = ui.t
const el = ref<HTMLDivElement | null>(null)

const isPanning = ref(false)
let panPointerId = -1
let lastPanX = 0
let lastPanY = 0

/** Live2D 模式下主 Spine canvas 隐藏，滚轮/中键需绑在容器上，行为与 EditorViewport 一致 */
function onWheel(e: WheelEvent) {
  if (!el.value) return
  live2d.live2dOnWheel(e)
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
  live2d.live2dOnPanDelta(dx, dy)
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
  live2d.live2dResetView()
}

onMounted(async () => {
  if (!el.value) return
  await live2d.mountInto(el.value)
})

onUnmounted(() => {
  live2d.dispose()
})
</script>

<template>
  <div class="live2d-root">
    <div
      ref="el"
      class="live2d-canvas-host"
      @wheel.capture.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dblclick.prevent="onDblClick"
    />
    <p v-if="live2d.pendingZip && !live2d.ready && !live2d.loadError" class="live2d-loading">
      {{ t('正在加载 Live2D…', 'Loading Live2D…') }}
    </p>
    <p v-else-if="live2d.ready" class="live2d-hint">
      {{
        t(
          '中键拖视口 · 滚轮缩放 · 双击复位 · 左键与模型视线/点击（视口与 Live2D 不冲突）',
          'Middle-drag viewport · wheel zoom · double-click reset · left-click model (viewport uses camera layer)',
        )
      }}
    </p>
  </div>
</template>

<style scoped>
.live2d-root {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: #ececec;
}

.live2d-canvas-host {
  width: 100%;
  height: 100%;
}

.live2d-loading {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  font-size: 13px;
  color: var(--win-text-secondary);
  pointer-events: none;
}

.live2d-hint {
  position: absolute;
  left: 12px;
  bottom: 10px;
  margin: 0;
  font-size: 11px;
  color: var(--win-text-secondary);
  pointer-events: none;
  text-shadow: 0 0 4px var(--win-surface);
}
</style>
