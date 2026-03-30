<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)

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

  const step = 32
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'
  ctx.lineWidth = 1
  for (let x = 0; x < w; x += step) {
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, h)
    ctx.stroke()
  }
  for (let y = 0; y < h; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(w, y + 0.5)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(0, 103, 192, 0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(w / 2, 0)
  ctx.lineTo(w / 2, h)
  ctx.moveTo(0, h / 2)
  ctx.lineTo(w, h / 2)
  ctx.stroke()

  ctx.fillStyle = '#1a1a1a'
  ctx.font = '12px Segoe UI, sans-serif'
  const imp = store.lastImport
  const lines: string[] = ['Skin2D 视口（MVP）']
  if (store.lastFileName) lines.push(`文件: ${store.lastFileName}`)
  if (imp) {
    lines.push(`格式: ${imp.formatId}`)
    if (imp.skeletonName) lines.push(`骨架: ${imp.skeletonName}`)
    if (imp.boneCount != null) lines.push(`骨骼数: ${imp.boneCount}`)
  } else {
    lines.push('请通过「文件 → 导入…」加载 Spine / DragonBones / glTF')
  }
  lines.forEach((line, i) => {
    ctx.fillText(line, 16, 24 + i * 18)
  })
}

onMounted(() => {
  draw()
  window.addEventListener('resize', draw)
})

watch(
  () => [store.lastImport, store.lastFileName],
  () => draw(),
  { deep: true },
)
</script>

<template>
  <div class="viewport-wrap">
    <canvas ref="canvasRef" class="canvas" />
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
}
</style>
