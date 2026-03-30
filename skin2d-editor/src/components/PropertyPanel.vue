<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useHierarchySelectionStore } from '../stores/hierarchySelection'
import { useSpineRuntimeStore } from '../stores/spineRuntime'
import { useUiSettingsStore } from '../stores/uiSettings'

const store = useEditorStore()
const hierarchy = useHierarchySelectionStore()
const spineStore = useSpineRuntimeStore()
const ui = useUiSettingsStore()
const t = ui.t

const summary = computed(() => {
  const r = store.lastImport
  if (!r) return null
  const lines: string[] = [`${t('格式', 'Format')}: ${r.formatId}`]
  if (r.versionHint) lines.push(`${t('版本/提示', 'Version/Hint')}: ${r.versionHint}`)
  if (r.skeletonName) lines.push(`${t('骨架名', 'Skeleton')}: ${r.skeletonName}`)
  if (r.boneCount != null) lines.push(`${t('骨骼数', 'Bones')}: ${r.boneCount}`)
  if (r.slotCount != null) lines.push(`${t('插槽数', 'Slots')}: ${r.slotCount}`)
  if (r.skinCount != null) lines.push(`${t('皮肤数', 'Skins')}: ${r.skinCount}`)
  if (r.animationNames?.length) {
    const names = r.animationNames.slice(0, 10).join(', ')
    lines.push(`${t('动画', 'Animations')}: ${names}${r.animationNames.length > 10 ? '…' : ''}`)
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
      if (!b) return [`${t('骨骼', 'Bone')}「${sel.name}」`, t('未在运行时找到该骨骼。', 'Bone not found in runtime.')]
      const d = b.data
      return [
        `${t('骨骼', 'Bone')}「${sel.name}」`,
        `${t('索引', 'Index')} #${d.index} · ${t('骨长', 'Length')} ${d.length.toFixed(2)}`,
        `${t('世界位置', 'World')} ${b.worldX.toFixed(2)}, ${b.worldY.toFixed(2)}`,
        `${t('局部', 'Local')} ${t('位移', 'Pos')} ${b.x.toFixed(2)}, ${b.y.toFixed(2)} · ${t('旋转', 'Rot')} ${b.rotation.toFixed(1)}° · ${t('缩放', 'Scale')} ${b.scaleX.toFixed(3)} × ${b.scaleY.toFixed(3)}`,
      ]
    }

    if (sel.kind === 'slot') {
      const slot = sk.findSlot(sel.name)
      const slotData = sd.findSlot(sel.name)
      if (!slot || !slotData) return [`${t('插槽', 'Slot')}「${sel.name}」`, t('未找到。', 'Not found.')]
      const att = slot.getAttachment()
      const attName = att?.name ?? t('（无）', '(none)')
      const setup = slotData.attachmentName ?? '—'
      return [
        `${t('插槽', 'Slot')}「${sel.name}」`,
        `${t('索引', 'Index')} #${slotData.index} · ${t('父骨骼', 'Bone')} ${slotData.boneData.name}`,
        `Setup ${t('附件', 'Attachment')}: ${setup}`,
        `${t('当前附件', 'Current attachment')}: ${attName}`,
      ]
    }

    if (sel.kind === 'skin') {
      const skin = sd.findSkin(sel.name)
      if (!skin) return [`${t('皮肤', 'Skin')}「${sel.name}」`, t('未找到。', 'Not found.')]
      const n = skin.getAttachments().length
      return [`${t('皮肤', 'Skin')}「${sel.name}」`, `${t('附件条目', 'Attachment entries')} ${n}`]
    }

    if (sel.kind === 'animation') {
      const anim = sd.findAnimation(sel.name)
      if (!anim) return [`${t('动画', 'Animation')}「${sel.name}」`, t('未找到。', 'Not found.')]
      return [`${t('动画', 'Animation')}「${sel.name}」`, `${t('时长', 'Duration')} ${anim.duration.toFixed(3)} s`]
    }
  }

  if (sel.kind === 'bone' && store.lastImport?.rigPreview?.bones) {
    const rb = store.lastImport.rigPreview.bones.find((x) => x.name === sel.name)
    if (rb) {
      return [
        `${t('骨骼', 'Bone')}「${sel.name}」`,
        `${t('世界位置（预览）', 'World (preview)')} ${rb.worldX.toFixed(2)}, ${rb.worldY.toFixed(2)}`,
        rb.parentName ? `${t('父骨骼', 'Parent')} ${rb.parentName}` : t('根骨骼', 'Root bone'),
        t('载入完整 Spine 包（JSON+atlas+贴图）后可显示更多字段。', 'Load full Spine package (JSON+atlas+textures) to see more fields.'),
      ]
    }
  }

  if (sel.kind === 'animation' && store.lastImport?.animationNames?.includes(sel.name)) {
    return [
      `${t('动画', 'Animation')}「${sel.name}」`,
      t('（仅名称列表；完整时长需 Spine 运行时数据）', '(Name only; duration requires Spine runtime data)'),
    ]
  }

  return [`${sel.kind}「${sel.name}」`, t('当前导入无可用的详细字段。', 'No details available for this import.')]
})
</script>

<template>
  <aside class="panel">
    <div class="panel-head">{{ t('属性', 'Properties') }}</div>
    <div class="panel-body">
      <p v-if="store.importError" class="err">{{ store.importError }}</p>
      <template v-else>
        <section v-if="selectionDetail" class="section">
          <div class="sec-title">{{ t('选中项', 'Selection') }}</div>
          <pre class="pre selection">{{ selectionDetail.join('\n') }}</pre>
        </section>
        <section class="section">
          <div class="sec-title">{{ t('导入摘要', 'Import summary') }}</div>
          <pre v-if="summary" class="pre">{{ summary }}</pre>
          <p v-else class="muted">{{ t('导入文件后在此显示摘要。', 'Import files to see a summary here.') }}</p>
        </section>
        <div v-if="warningsText" class="warn-block">
          <div class="warn-title">{{ t('提示', 'Hints') }}</div>
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
