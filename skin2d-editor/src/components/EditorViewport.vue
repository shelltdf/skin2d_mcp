<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useEditorStore } from '../stores/editor'
import type { RigPreviewBone } from '../importers/types'

const store = useEditorStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)

/** 世界空间中心（视口中心对准的点） */
const cameraCx = ref(0)
const cameraCy = ref(0)
/** 屏幕像素 / 世界单位 */
const viewScale = ref(1)
/** 最近一次「适配画布」时的 scale，用于显示相对缩放倍数 */
const baseFitScale = ref(1)

const isPanning = ref(false)
let panPointerId = -1
let lastPanX = 0
let lastPanY = 0

function getCanvasCssSize() {
  const c = canvasRef.value
  if (!c) return { w: 1, h: 1 }
  return { w: c.clientWidth, h: c.clientHeight }
}

function worldToScreen(wx: number, wy: number, w: number, h: number) {
  const s = viewScale.value
  return {
    x: w / 2 + (wx - cameraCx.value) * s,
    y: h / 2 + (wy - cameraCy.value) * s,
  }
}

function fitRigToView(bones: RigPreviewBone[] | undefined, w: number, h: number) {
  if (!bones?.length) {
    cameraCx.value = 0
    cameraCy.value = 0
    viewScale.value = 1
    baseFitScale.value = 1
    return
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const b of bones) {
    minX = Math.min(minX, b.worldX)
    maxX = Math.max(maxX, b.worldX)
    minY = Math.min(minY, b.worldY)
    maxY = Math.max(maxY, b.worldY)
  }
  const bw = maxX - minX || 1
  const bh = maxY - minY || 1
  const pad = 56
  const s = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 8)
  cameraCx.value = (minX + maxX) / 2
  cameraCy.value = (minY + maxY) / 2
  viewScale.value = Math.max(0.01, s)
  baseFitScale.value = viewScale.value
}

function drawWorldGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = cameraCx.value
  const cy = cameraCy.value
  const sc = viewScale.value
  const left = cx - w / (2 * sc)
  const right = cx + w / (2 * sc)
  const top = cy - h / (2 * sc)
  const bottom = cy + h / (2 * sc)

  let step = 50
  const targetPx = 40
  const raw = targetPx / sc
  const exp = Math.floor(Math.log10(raw))
  const base = Math.pow(10, exp)
  const candidates = [1, 2, 5, 10].map((m) => m * base)
  step = candidates.reduce((a, b) =>
    Math.abs(b * sc - targetPx) < Math.abs(a * sc - targetPx) ? b : a,
  )

  ctx.strokeStyle = 'rgba(0,0,0,0.07)'
  ctx.lineWidth = 1
  let x0 = Math.floor(left / step) * step
  for (let wx = x0; wx <= right; wx += step) {
    const sx = w / 2 + (wx - cx) * sc
    ctx.beginPath()
    ctx.moveTo(sx + 0.5, 0)
    ctx.lineTo(sx + 0.5, h)
    ctx.stroke()
  }
  let y0 = Math.floor(top / step) * step
  for (let wy = y0; wy <= bottom; wy += step) {
    const sy = h / 2 + (wy - cy) * sc
    ctx.beginPath()
    ctx.moveTo(0, sy + 0.5)
    ctx.lineTo(w, sy + 0.5)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(0, 103, 192, 0.28)'
  ctx.lineWidth = 1.5
  const o0 = worldToScreen(0, 0, w, h)
  if (o0.x >= 0 && o0.x <= w) {
    ctx.beginPath()
    ctx.moveTo(o0.x, 0)
    ctx.lineTo(o0.x, h)
    ctx.stroke()
  }
  if (o0.y >= 0 && o0.y <= h) {
    ctx.beginPath()
    ctx.moveTo(0, o0.y)
    ctx.lineTo(w, o0.y)
    ctx.stroke()
  }
}

function drawSpineRig(ctx: CanvasRenderingContext2D, w: number, h: number, bones: RigPreviewBone[]) {
  if (!bones.length) return

  const map = new Map(bones.map((b) => [b.name, b]))

  ctx.save()
  ctx.strokeStyle = '#0067c0'
  ctx.lineWidth = Math.max(1, 2 / Math.sqrt(viewScale.value / 4))
  ctx.lineCap = 'round'
  for (const b of bones) {
    if (!b.parentName) continue
    const p = map.get(b.parentName)
    if (!p) continue
    const s0 = worldToScreen(p.worldX, p.worldY, w, h)
    const s1 = worldToScreen(b.worldX, b.worldY, w, h)
    ctx.beginPath()
    ctx.moveTo(s0.x, s0.y)
    ctx.lineTo(s1.x, s1.y)
    ctx.stroke()
  }

  const jointR = Math.max(2, Math.min(6, 4 * Math.sqrt(4 / viewScale.value)))
  ctx.fillStyle = '#0f6cbd'
  for (const b of bones) {
    const s = worldToScreen(b.worldX, b.worldY, w, h)
    ctx.beginPath()
    ctx.arc(s.x, s.y, jointR, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function draw() {
  const c = canvasRef.value
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const w = c.clientWidth
  const h = c.clientHeight
  c.width = Math.max(1, Math.floor(w * dpr))
  c.height = Math.max(1, Math.floor(h * dpr))
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ctx.fillStyle = '#ececec'
  ctx.fillRect(0, 0, w, h)

  drawWorldGrid(ctx, w, h)

  const imp = store.lastImport
  const rigBones = imp?.rigPreview?.bones
  if (rigBones?.length) {
    drawSpineRig(ctx, w, h, rigBones)
  }

  ctx.fillStyle = '#1a1a1a'
  ctx.font = '12px Segoe UI, sans-serif'
  const lines: string[] = ['Skin2D 视口']
  if (store.lastFileName) lines.push(`文件: ${store.lastFileName}`)
  if (imp) {
    lines.push(`格式: ${imp.formatId}`)
    if (imp.skeletonName) lines.push(`骨架: ${imp.skeletonName}`)
    if (imp.boneCount != null) lines.push(`骨骼数: ${imp.boneCount}`)
    if (imp.formatId === 'spine-json' && !rigBones?.length) {
      lines.push('（未生成骨骼线：见右侧「提示」）')
    }
  } else {
    lines.push('请通过「文件 → 导入…」加载 Spine / DragonBones / glTF')
  }
  const z = baseFitScale.value > 0 ? viewScale.value / baseFitScale.value : 1
  lines.push(`缩放 ×${z.toFixed(2)} · 中键拖移 · 滚轮缩放 · 双击复位`)
  lines.forEach((line, i) => {
    ctx.fillText(line, 16, 24 + i * 18)
  })
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const c = canvasRef.value
  if (!c) return
  const rect = c.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const { w, h } = getCanvasCssSize()
  const oldS = viewScale.value
  const zoomIntensity = 0.0015
  const delta = -e.deltaY * zoomIntensity
  const factor = Math.exp(delta)
  const newS = Math.min(400, Math.max(0.005, oldS * factor))
  const wx = cameraCx.value + (mx - w / 2) / oldS
  const wy = cameraCy.value + (my - h / 2) / oldS
  cameraCx.value = wx - (mx - w / 2) / newS
  cameraCy.value = wy - (my - h / 2) / newS
  viewScale.value = newS
  draw()
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 1) return
  e.preventDefault()
  const c = canvasRef.value
  if (!c) return
  isPanning.value = true
  panPointerId = e.pointerId
  lastPanX = e.clientX
  lastPanY = e.clientY
  c.setPointerCapture(e.pointerId)
  c.style.cursor = 'grabbing'
}

function onPointerMove(e: PointerEvent) {
  if (!isPanning.value || e.pointerId !== panPointerId) return
  const dx = e.clientX - lastPanX
  const dy = e.clientY - lastPanY
  lastPanX = e.clientX
  lastPanY = e.clientY
  const s = viewScale.value
  cameraCx.value -= dx / s
  cameraCy.value -= dy / s
  draw()
}

function onPointerUp(e: PointerEvent) {
  if (!isPanning.value || e.pointerId !== panPointerId) return
  const c = canvasRef.value
  if (c) {
    try {
      c.releasePointerCapture(panPointerId)
    } catch {
      /* ignore */
    }
    c.style.cursor = ''
  }
  isPanning.value = false
  panPointerId = -1
}

function onDblClick(e: MouseEvent) {
  e.preventDefault()
  const { w, h } = getCanvasCssSize()
  fitRigToView(store.lastImport?.rigPreview?.bones, w, h)
  draw()
}

let resizeObs: ResizeObserver | null = null

onMounted(() => {
  draw()
  window.addEventListener('resize', draw)
  const c = canvasRef.value
  if (c && typeof ResizeObserver !== 'undefined') {
    resizeObs = new ResizeObserver(() => draw())
    resizeObs.observe(c)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', draw)
  resizeObs?.disconnect()
})

watch(
  () => [store.lastImport, store.lastFileName],
  () => {
    const { w, h } = getCanvasCssSize()
    fitRigToView(store.lastImport?.rigPreview?.bones, w, h)
    draw()
  },
  { deep: true },
)
</script>

<template>
  <div class="viewport-wrap">
    <canvas
      ref="canvasRef"
      class="canvas"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dblclick="onDblClick"
    />
  </div>
</template>

<style scoped>
.viewport-wrap {
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: var(--win-surface);
  position: relative;
}

.canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}
</style>
