<script setup lang="ts">
import { SkeletonRenderer } from '@esotericsoftware/spine-canvas'
import { MeshAttachment, Physics, RegionAttachment } from '@esotericsoftware/spine-core'
import type { Skeleton, Slot } from '@esotericsoftware/spine-core'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { RigPreviewBone } from '../importers/types'
import { drawSpineMeshAttachments, drawSpineRegionAttachments, drawSpineRegionWires } from '../spine/spineAttachmentLayers'
import { useEditorStore } from '../stores/editor'
import { useSpineRuntimeStore } from '../stores/spineRuntime'
import { useLive2dRuntimeStore } from '../stores/live2dRuntime'
import Live2DViewport from './Live2DViewport.vue'
import { useHierarchySelectionStore } from '../stores/hierarchySelection'
import { useViewportDisplayStore } from '../stores/viewportDisplay'

const store = useEditorStore()
const spineStore = useSpineRuntimeStore()
const live2dStore = useLive2dRuntimeStore()
const display = useViewportDisplayStore()
const hierarchySel = useHierarchySelectionStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
let skRenderer: SkeletonRenderer | null = null

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

function screenToWorld(sx: number, sy: number, w: number, h: number) {
  const s = viewScale.value
  return {
    x: cameraCx.value + (sx - w / 2) / s,
    y: cameraCy.value + (sy - h / 2) / s,
  }
}

function pointInTri(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): boolean {
  const v0x = cx - ax
  const v0y = cy - ay
  const v1x = bx - ax
  const v1y = by - ay
  const v2x = px - ax
  const v2y = py - ay
  const dot00 = v0x * v0x + v0y * v0y
  const dot01 = v0x * v1x + v0y * v1y
  const dot02 = v0x * v2x + v0y * v2y
  const dot11 = v1x * v1x + v1y * v1y
  const dot12 = v1x * v2x + v1y * v2y
  const invDen = 1 / (dot00 * dot11 - dot01 * dot01 + 1e-12)
  const u = (dot11 * dot02 - dot01 * dot12) * invDen
  const v = (dot00 * dot12 - dot01 * dot02) * invDen
  return u >= 0 && v >= 0 && u + v <= 1
}

function pointInQuad(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): boolean {
  return (
    pointInTri(px, py, x0, y0, x1, y1, x2, y2) || pointInTri(px, py, x0, y0, x2, y2, x3, y3)
  )
}

function pickTopmostSlotAtWorldPoint(sk: Skeleton, wx: number, wy: number): Slot | null {
  // drawOrder is back->front; scan reverse for topmost.
  const order = sk.drawOrder
  const quad = new Float32Array(8)
  let meshBuf: Float32Array | null = null
  for (let i = order.length - 1; i >= 0; i--) {
    const slot = order[i]
    const att = slot.getAttachment()
    if (!att) continue

    if (att instanceof RegionAttachment) {
      att.computeWorldVertices(slot, quad, 0, 2)
      if (pointInQuad(wx, wy, quad[0], quad[1], quad[2], quad[3], quad[4], quad[5], quad[6], quad[7])) {
        return slot
      }
      continue
    }

    if (att instanceof MeshAttachment) {
      const count = att.worldVerticesLength
      if (!meshBuf || meshBuf.length < count) meshBuf = new Float32Array(count)
      att.computeWorldVertices(slot, 0, count, meshBuf, 0, 2)
      const tris = att.triangles
      for (let t = 0; t < tris.length; t += 3) {
        const i0 = tris[t] * 2
        const i1 = tris[t + 1] * 2
        const i2 = tris[t + 2] * 2
        if (
          pointInTri(
            wx,
            wy,
            meshBuf[i0],
            meshBuf[i0 + 1],
            meshBuf[i1],
            meshBuf[i1 + 1],
            meshBuf[i2],
            meshBuf[i2 + 1],
          )
        ) {
          return slot
        }
      }
    }
  }
  return null
}

function strokeWidthForHighlight(ctx: CanvasRenderingContext2D): number {
  const sc = Math.abs(ctx.getTransform().a) || 1
  return Math.max(1.3, 2.8 / sc)
}

function drawSelectedSlotHighlight(ctx: CanvasRenderingContext2D, sk: Skeleton) {
  const sel = hierarchySel.selected
  if (!sel || sel.kind !== 'slot') return
  const slot = sk.findSlot(sel.name)
  if (!slot) return
  const att = slot.getAttachment()
  if (!att) return

  ctx.save()
  ctx.globalAlpha = 1
  ctx.strokeStyle = '#c47d00'
  ctx.fillStyle = 'rgba(196, 125, 0, 0.18)'
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.lineWidth = strokeWidthForHighlight(ctx)
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur = 8

  if (att instanceof RegionAttachment) {
    const quad = new Float32Array(8)
    att.computeWorldVertices(slot, quad, 0, 2)
    ctx.beginPath()
    ctx.moveTo(quad[0], quad[1])
    ctx.lineTo(quad[2], quad[3])
    ctx.lineTo(quad[4], quad[5])
    ctx.lineTo(quad[6], quad[7])
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    return
  }

  if (att instanceof MeshAttachment) {
    const count = att.worldVerticesLength
    const verts = new Float32Array(count)
    att.computeWorldVertices(slot, 0, count, verts, 0, 2)
    const tris = att.triangles
    // 只描边三角轮廓（避免铺满整个网格导致太乱）
    for (let t = 0; t < tris.length; t += 3) {
      const i0 = tris[t] * 2
      const i1 = tris[t + 1] * 2
      const i2 = tris[t + 2] * 2
      ctx.beginPath()
      ctx.moveTo(verts[i0], verts[i0 + 1])
      ctx.lineTo(verts[i1], verts[i1 + 1])
      ctx.lineTo(verts[i2], verts[i2 + 1])
      ctx.closePath()
      ctx.stroke()
    }
    ctx.restore()
    return
  }

  ctx.restore()
}

function rigBonesFromSkeleton(sk: Skeleton): RigPreviewBone[] {
  return sk.bones.map((b) => ({
    name: b.data.name,
    worldX: b.worldX,
    worldY: b.worldY,
    parentName: b.parent ? b.parent.data.name : null,
  }))
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

/** 有 Spine 附件包围盒时优先用其适配视口 */
function fitSpineAttachmentBounds(w: number, h: number) {
  const sk = spineStore.bundle?.skeleton
  if (!sk) return
  try {
    const r = sk.getBoundsRect()
    if (r.width > 0 && r.height > 0) {
      const pad = 56
      const sx = Math.min((w - pad * 2) / r.width, (h - pad * 2) / r.height, 8)
      cameraCx.value = r.x + r.width / 2
      cameraCy.value = r.y + r.height / 2
      viewScale.value = Math.max(0.01, sx)
      baseFitScale.value = viewScale.value
      return
    }
  } catch {
    /* fall through */
  }
  fitRigToView(rigBonesFromSkeleton(sk), w, h)
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

  if (display.showGridLines) {
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
  }

  if (display.showWorldOrigin) {
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
}

function drawSpineRig(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bones: RigPreviewBone[],
  selectedBoneName: string | null,
) {
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
  const selR = jointR + 3
  for (const b of bones) {
    const s = worldToScreen(b.worldX, b.worldY, w, h)
    const sel = selectedBoneName === b.name
    ctx.fillStyle = sel ? '#c47d00' : '#0f6cbd'
    ctx.beginPath()
    ctx.arc(s.x, s.y, sel ? selR : jointR, 0, Math.PI * 2)
    ctx.fill()
    if (sel) {
      ctx.strokeStyle = 'rgba(196, 125, 0, 0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(s.x, s.y, selR + 2, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function draw() {
  if (live2dStore.showViewport) return
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

  if (display.showGridLines || display.showWorldOrigin) {
    drawWorldGrid(ctx, w, h)
  }

  const imp = store.lastImport
  const skLive = spineStore.ready && spineStore.bundle ? spineStore.bundle.skeleton : null
  const rigBones = skLive ? rigBonesFromSkeleton(skLive) : imp?.rigPreview?.bones

  const bundle = spineStore.bundle
  const showSpineLayer =
    spineStore.ready &&
    bundle &&
    (display.showSpineTexture || display.showSpineMeshWire || display.showSpineRegionWire)

  if (showSpineLayer && bundle) {
    if (!skRenderer) skRenderer = new SkeletonRenderer(ctx)
    skRenderer.debugRendering = Boolean(display.showSpineDebug)
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.scale(viewScale.value, viewScale.value)
    ctx.translate(-cameraCx.value, -cameraCy.value)
    const sk = bundle.skeleton
    if (display.showSpineTexture) {
      drawSpineRegionAttachments(skRenderer, sk)
    }
    // MeshAttachment 的贴图属于「贴图」层；「贴图网格线」仅控制绿色线框可视性
    if (display.showSpineTexture || display.showSpineMeshWire) {
      drawSpineMeshAttachments(skRenderer, sk, {
        drawTexture: Boolean(display.showSpineTexture),
        drawWire: Boolean(display.showSpineMeshWire),
      })
    }
    // 普通贴图（RegionAttachment）四边形边框线（与 Mesh 三角网格线分开开关）
    if (display.showSpineRegionWire) {
      drawSpineRegionWires(ctx, sk, { drawWire: true })
    }
    // 选中高亮：画在贴图层之上、骨骼层之下
    drawSelectedSlotHighlight(ctx, sk)
    ctx.restore()
  }

  if (display.showBones && rigBones?.length) {
    const selBone =
      hierarchySel.selected?.kind === 'bone' ? hierarchySel.selected.name : null
    drawSpineRig(ctx, w, h, rigBones, selBone)
  }

  if (display.showHud) {
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
    if (imp.formatId === 'live2d' && !live2dStore.ready) {
      lines.push('（Live2D：单文件导入仅元数据；zip 导入可画布预览）')
    }
    } else {
      lines.push('请通过「文件 → 导入…」加载 Spine / DragonBones / glTF')
    }
    if (spineStore.ready) {
      lines.push(spineStore.playing ? '动画：播放中' : '动画：已暂停')
    }
    const z = baseFitScale.value > 0 ? viewScale.value / baseFitScale.value : 1
    lines.push(`缩放 ×${z.toFixed(2)} · 中键拖移 · 滚轮缩放 · 双击复位`)
    lines.forEach((line, i) => {
      ctx.fillText(line, 16, 24 + i * 18)
    })
  }
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
  // 左键：点击选择对象（Spine slot）并同步左侧层次选择
  if (e.button === 0) {
    const c = canvasRef.value
    if (!c) return
    if (live2dStore.showViewport) return
    if (!spineStore.ready || !spineStore.bundle) {
      hierarchySel.clear()
      draw()
      return
    }
    const rect = c.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const { w, h } = getCanvasCssSize()
    const p = screenToWorld(sx, sy, w, h)

    const sk = spineStore.bundle.skeleton
    try {
      // 暂停时也确保 attachment vertices 是最新姿态
      sk.updateWorldTransform(Physics.update)
    } catch {
      /* ignore */
    }
    const hit = pickTopmostSlotAtWorldPoint(sk, p.x, p.y)
    if (hit) hierarchySel.select('slot', hit.data.name)
    else hierarchySel.clear()
    draw()
    return
  }

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
  if (spineStore.ready) fitSpineAttachmentBounds(w, h)
  else fitRigToView(store.lastImport?.rigPreview?.bones, w, h)
  draw()
}

let resizeObs: ResizeObserver | null = null
let rafId = 0
let lastFrameTime = performance.now()

function frameLoop(now: number) {
  rafId = requestAnimationFrame(frameLoop)
  const delta = Math.min(0.1, (now - lastFrameTime) / 1000)
  lastFrameTime = now
  if (spineStore.ready && spineStore.playing) {
    spineStore.tick(delta)
  }
  draw()
}

onMounted(() => {
  lastFrameTime = performance.now()
  rafId = requestAnimationFrame(frameLoop)
  window.addEventListener('resize', draw)
  const c = canvasRef.value
  if (c && typeof ResizeObserver !== 'undefined') {
    resizeObs = new ResizeObserver(() => draw())
    resizeObs.observe(c)
  }
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', draw)
  resizeObs?.disconnect()
})

watch(
  () => [store.lastImport, store.lastFileName],
  () => {
    const { w, h } = getCanvasCssSize()
    if (spineStore.ready) fitSpineAttachmentBounds(w, h)
    else fitRigToView(store.lastImport?.rigPreview?.bones, w, h)
    draw()
  },
  { deep: true },
)

watch(
  () => spineStore.ready,
  (ready) => {
    if (ready) {
      const { w, h } = getCanvasCssSize()
      fitSpineAttachmentBounds(w, h)
      draw()
    }
  },
)

watch(
  () => live2dStore.showViewport,
  () => draw(),
)

watch(
  () => [display.showSpineTexture, display.showSpineMeshWire, display.showSpineRegionWire] as const,
  ([tex, meshWire, regionWire]) => {
    if (!tex && !meshWire && !regionWire) display.showSpineDebug = false
  },
)
</script>

<template>
  <div class="viewport-wrap">
    <div class="layer-bar" @pointerdown.stop @wheel.stop>
      <span class="layer-bar-title">显示</span>
      <label class="layer-item">
        <input v-model="display.showGridLines" type="checkbox" />
        坐标网格
      </label>
      <label class="layer-item">
        <input v-model="display.showWorldOrigin" type="checkbox" />
        世界原点
      </label>
      <label class="layer-item" :class="{ disabled: !spineStore.ready }">
        <input v-model="display.showSpineTexture" type="checkbox" :disabled="!spineStore.ready" />
        贴图
      </label>
      <label class="layer-item" :class="{ disabled: !spineStore.ready }">
        <input v-model="display.showSpineMeshWire" type="checkbox" :disabled="!spineStore.ready" />
        Mesh 网格线
      </label>
      <label class="layer-item" :class="{ disabled: !spineStore.ready }">
        <input v-model="display.showSpineRegionWire" type="checkbox" :disabled="!spineStore.ready" />
        Region 边框线
      </label>
      <label class="layer-item">
        <input v-model="display.showBones" type="checkbox" />
        骨骼
      </label>
      <label
        class="layer-item"
        :class="{
          disabled:
            !spineStore.ready ||
            (!display.showSpineTexture && !display.showSpineMeshWire && !display.showSpineRegionWire),
        }"
      >
        <input
          v-model="display.showSpineDebug"
          type="checkbox"
          :disabled="
            !spineStore.ready ||
            (!display.showSpineTexture &&
              !display.showSpineMeshWire &&
              !display.showSpineRegionWire)
          "
        />
        Spine 调试线
      </label>
      <label class="layer-item">
        <input v-model="display.showHud" type="checkbox" />
        状态信息
      </label>
    </div>
    <Live2DViewport v-if="live2dStore.showViewport" />
    <canvas
      v-show="!live2dStore.showViewport"
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

.layer-bar {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  max-width: min(420px, calc(100% - 16px));
  padding: 6px 10px;
  border: 1px solid var(--win-border);
  border-radius: var(--win-radius-sm);
  background: color-mix(in srgb, var(--win-surface) 92%, transparent);
  backdrop-filter: blur(6px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  font-size: 12px;
  color: var(--win-text);
  pointer-events: auto;
}

.layer-bar-title {
  font-weight: 600;
  color: var(--win-text-secondary);
  margin-right: 4px;
}

.layer-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.layer-item.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.layer-item input {
  accent-color: var(--win-accent);
}

.canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}
</style>
