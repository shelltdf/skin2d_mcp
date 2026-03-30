<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useHierarchySelectionStore } from '../stores/hierarchySelection'
import { useSpineRuntimeStore } from '../stores/spineRuntime'

const store = useEditorStore()
const hierarchy = useHierarchySelectionStore()
const spineStore = useSpineRuntimeStore()

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

/** 依赖 poseRevision 以便播放时骨骼数值刷新 */
const selectionDetail = computed(() => {
  const sel = hierarchy.selected
  if (!sel) return null
  spineStore.poseRevision

  if (spineStore.ready && spineStore.bundle) {
    const sk = spineStore.bundle.skeleton
    const sd = spineStore.bundle.skeletonData

    if (sel.kind === 'bone') {
      const b = sk.findBone(sel.name)
      if (!b) return [`骨骼「${sel.name}」`, '未在运行时找到该骨骼。']
      const d = b.data
      return [
        `骨骼「${sel.name}」`,
        `索引 #${d.index} · 骨长 ${d.length.toFixed(2)}`,
        `世界位置 ${b.worldX.toFixed(2)}, ${b.worldY.toFixed(2)}`,
        `局部 位移 ${b.x.toFixed(2)}, ${b.y.toFixed(2)} · 旋转 ${b.rotation.toFixed(1)}° · 缩放 ${b.scaleX.toFixed(3)} × ${b.scaleY.toFixed(3)}`,
      ]
    }

    if (sel.kind === 'slot') {
      const slot = sk.findSlot(sel.name)
      const slotData = sd.findSlot(sel.name)
      if (!slot || !slotData) return [`插槽「${sel.name}」`, '未找到。']
      const att = slot.getAttachment()
      const attName = att?.name ?? '（无）'
      const setup = slotData.attachmentName ?? '—'
      return [
        `插槽「${sel.name}」`,
        `索引 #${slotData.index} · 父骨骼 ${slotData.boneData.name}`,
        `Setup 附件: ${setup}`,
        `当前附件: ${attName}`,
      ]
    }

    if (sel.kind === 'skin') {
      const skin = sd.findSkin(sel.name)
      if (!skin) return [`皮肤「${sel.name}」`, '未找到。']
      const n = skin.getAttachments().length
      return [`皮肤「${sel.name}」`, `附件条目 ${n}`]
    }

    if (sel.kind === 'animation') {
      const anim = sd.findAnimation(sel.name)
      if (!anim) return [`动画「${sel.name}」`, '未找到。']
      return [`动画「${sel.name}」`, `时长 ${anim.duration.toFixed(3)} s`]
    }
  }

  if (sel.kind === 'bone' && store.lastImport?.rigPreview?.bones) {
    const rb = store.lastImport.rigPreview.bones.find((x) => x.name === sel.name)
    if (rb) {
      return [
        `骨骼「${sel.name}」`,
        `世界位置（预览） ${rb.worldX.toFixed(2)}, ${rb.worldY.toFixed(2)}`,
        rb.parentName ? `父骨骼 ${rb.parentName}` : '根骨骼',
        '载入完整 Spine 包（JSON+atlas+贴图）后可显示更多字段。',
      ]
    }
  }

  if (sel.kind === 'animation' && store.lastImport?.animationNames?.includes(sel.name)) {
    return [`动画「${sel.name}」`, '（仅名称列表；完整时长需 Spine 运行时数据）']
  }

  return [`${sel.kind}「${sel.name}」`, '当前导入无可用的详细字段。']
})
</script>

<template>
  <aside class="panel">
    <div class="panel-head">属性</div>
    <div class="panel-body">
      <p v-if="store.importError" class="err">{{ store.importError }}</p>
      <template v-else>
        <section v-if="selectionDetail" class="section">
          <div class="sec-title">选中项</div>
          <pre class="pre selection">{{ selectionDetail.join('\n') }}</pre>
        </section>
        <section class="section">
          <div class="sec-title">导入摘要</div>
          <pre v-if="summary" class="pre">{{ summary }}</pre>
          <p v-else class="muted">导入文件后在此显示摘要。</p>
        </section>
        <div v-if="warningsText" class="warn-block">
          <div class="warn-title">提示</div>
          <pre class="pre warn">{{ warningsText }}</pre>
        </div>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  width: 300px;
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

.section {
  margin-bottom: 12px;
}

.sec-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--win-text-secondary);
  margin-bottom: 6px;
}

.pre {
  margin: 0;
  font-family: var(--win-mono);
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.pre.selection {
  background: rgba(0, 103, 192, 0.06);
  padding: 8px;
  border-radius: var(--win-radius-sm);
  border: 1px solid rgba(0, 103, 192, 0.15);
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
