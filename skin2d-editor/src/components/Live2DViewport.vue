<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useLive2dRuntimeStore } from '../stores/live2dRuntime'
import { useEditorStore } from '../stores/editor'

const live2d = useLive2dRuntimeStore()
const editor = useEditorStore()
const el = ref<HTMLDivElement | null>(null)

onMounted(async () => {
  if (!el.value) return
  await live2d.mountInto(el.value)
  if (live2d.loadError) {
    editor.setImportResult(editor.lastFileName, live2d.previewImport, live2d.loadError)
  } else if (live2d.previewImport) {
    editor.setImportResult(editor.lastFileName, live2d.previewImport, null)
  }
})

onUnmounted(() => {
  live2d.dispose()
})
</script>

<template>
  <div class="live2d-root">
    <div ref="el" class="live2d-canvas-host" />
    <p v-if="live2d.pendingZip && !live2d.ready && !live2d.loadError" class="live2d-loading">
      正在加载 Live2D…
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
</style>
