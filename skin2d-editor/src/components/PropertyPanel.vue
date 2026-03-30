<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()

const summary = computed(() => {
  const r = store.lastImport
  if (!r) return null
  const lines: string[] = [`格式: ${r.formatId}`]
  if (r.versionHint) lines.push(`版本/提示: ${r.versionHint}`)
  if (r.skeletonName) lines.push(`骨架名: ${r.skeletonName}`)
  if (r.boneCount != null) lines.push(`骨骼数: ${r.boneCount}`)
  if (r.slotCount != null) lines.push(`插槽数: ${r.slotCount}`)
  if (r.skinCount != null) lines.push(`皮肤数: ${r.skinCount}`)
  if (r.animationNames?.length) {
    const names = r.animationNames.slice(0, 10).join(', ')
    lines.push(`动画: ${names}${r.animationNames.length > 10 ? '…' : ''}`)
  }
  return lines.join('\n')
})

const warningsText = computed(() => {
  const r = store.lastImport
  if (!r?.warnings.length) return ''
  return r.warnings.join('\n')
})
</script>

<template>
  <aside class="panel">
    <div class="panel-head">属性</div>
    <div class="panel-body">
      <p v-if="store.importError" class="err">{{ store.importError }}</p>
      <pre v-else-if="summary" class="pre">{{ summary }}</pre>
      <p v-else class="muted">导入文件后在此显示摘要。</p>
      <div v-if="warningsText" class="warn-block">
        <div class="warn-title">提示</div>
        <pre class="pre warn">{{ warningsText }}</pre>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  width: 280px;
  min-width: 220px;
  background: var(--win-surface);
  border-left: 1px solid var(--win-border);
  display: flex;
  flex-direction: column;
}

.panel-head {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--win-text-secondary);
  border-bottom: 1px solid var(--win-border);
}

.panel-body {
  padding: 10px 12px;
  flex: 1;
  overflow: auto;
}

.pre {
  margin: 0;
  font-family: var(--win-mono);
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.muted {
  margin: 0;
  font-size: 12px;
  color: var(--win-text-secondary);
}

.err {
  margin: 0;
  font-size: 12px;
  color: #c42b1c;
  line-height: 1.4;
}

.warn-block {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--win-border);
}

.warn-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--win-text-secondary);
  margin-bottom: 6px;
}

.pre.warn {
  color: #8a6d3b;
}
</style>
