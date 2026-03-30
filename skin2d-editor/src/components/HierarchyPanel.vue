<script setup lang="ts">
import { computed } from 'vue'
import { boneTreeFromRigPreview, boneTreeFromSkeletonData } from '../lib/hierarchyTree'
import { useEditorStore } from '../stores/editor'
import { useHierarchySelectionStore } from '../stores/hierarchySelection'
import { useSpineRuntimeStore } from '../stores/spineRuntime'
import { useUiSettingsStore } from '../stores/uiSettings'
import HierarchyBoneBranch from './HierarchyBoneBranch.vue'

const store = useEditorStore()
const spineStore = useSpineRuntimeStore()
const hierarchy = useHierarchySelectionStore()
const ui = useUiSettingsStore()
const t = ui.t

function blendLabel(m: number): string {
  const labels = ['Normal', 'Additive', 'Multiply', 'Screen']
  return labels[m] ?? String(m)
}

const spineData = computed(() => (spineStore.ready && spineStore.bundle ? spineStore.bundle.skeletonData : null))

const boneTree = computed(() => {
  if (spineData.value) return boneTreeFromSkeletonData(spineData.value)
  const bones = store.lastImport?.rigPreview?.bones
  if (bones?.length) return boneTreeFromRigPreview(bones)
  return []
})

const slotRows = computed(() => {
  if (!spineData.value) return []
  return spineData.value.slots.map((s) => ({
    name: s.name,
    boneName: s.boneData.name,
    attachment: s.attachmentName,
    blend: blendLabel(s.blendMode),
    index: s.index,
  }))
})

const skinRows = computed(() => {
  if (!spineData.value) return []
  return spineData.value.skins.map((skin) => ({
    name: skin.name,
    attachments: skin.getAttachments().length,
  }))
})

const animationRows = computed(() => {
  if (spineData.value) {
    return spineData.value.animations.map((a) => ({
      name: a.name,
      duration: a.duration,
    }))
  }
  const names = store.lastImport?.animationNames ?? []
  return names.map((name) => ({ name, duration: null as number | null }))
})

const hint = computed(() => {
  if (!store.lastImport) return t('尚未导入骨架。使用「文件 → 导入…」', 'No skeleton imported. Use “File → Import…”')
  return ''
})

const formatSummary = computed(() => {
  const r = store.lastImport
  if (!r) return ''
  const parts: string[] = []
  parts.push(t('格式', 'Format') + ` ${r.formatId}`)
  if (r.versionHint) parts.push(r.versionHint)
  if (r.skeletonName) parts.push(`「${r.skeletonName}」`)
  return parts.join(' · ')
})

function isSlotSel(name: string) {
  return hierarchy.selected?.kind === 'slot' && hierarchy.selected.name === name
}

function isSkinSel(name: string) {
  return hierarchy.selected?.kind === 'skin' && hierarchy.selected.name === name
}

function isAnimSel(name: string) {
  return hierarchy.selected?.kind === 'animation' && hierarchy.selected.name === name
}
</script>

<template>
  <aside class="panel">
    <div class="panel-head">{{ t('层级', 'Hierarchy') }}</div>
    <div class="panel-body">
      <p v-if="hint" class="hint">{{ hint }}</p>
      <template v-else>
        <p class="meta">{{ formatSummary }}</p>
        <p v-if="store.lastImport?.boneCount != null" class="counts">
          {{ t('骨骼', 'Bones') }} {{ store.lastImport.boneCount }}
          <template v-if="store.lastImport.slotCount != null"> · {{ t('插槽', 'Slots') }} {{ store.lastImport.slotCount }}</template>
          <template v-if="store.lastImport.skinCount != null"> · {{ t('皮肤', 'Skins') }} {{ store.lastImport.skinCount }}</template>
          <template v-if="(store.lastImport.animationNames?.length ?? 0) > 0">
            · {{ t('动画', 'Animations') }} {{ store.lastImport.animationNames!.length }}
          </template>
        </p>

        <details v-if="boneTree.length" open class="block">
          <summary>{{ t('骨骼', 'Bones') }}</summary>
          <HierarchyBoneBranch :nodes="boneTree" />
        </details>

        <details v-if="slotRows.length" open class="block">
          <summary>{{ t('插槽', 'Slots') }}（{{ slotRows.length }}）</summary>
          <ul class="flat-list">
            <li v-for="row in slotRows" :key="row.name">
              <button
                type="button"
                class="row-btn"
                :class="{ sel: isSlotSel(row.name) }"
                @click="hierarchy.toggle('slot', row.name)"
              >
                <span class="row-main">{{ row.name }}</span>
                <span class="row-sub">
                  #{{ row.index }} · {{ row.boneName }} · {{ row.blend
                  }}<template v-if="row.attachment"> · {{ row.attachment }}</template>
                </span>
              </button>
            </li>
          </ul>
        </details>

        <details v-if="skinRows.length" open class="block">
          <summary>{{ t('皮肤', 'Skins') }}（{{ skinRows.length }}）</summary>
          <ul class="flat-list">
            <li v-for="row in skinRows" :key="row.name">
              <button
                type="button"
                class="row-btn"
                :class="{ sel: isSkinSel(row.name) }"
                @click="hierarchy.toggle('skin', row.name)"
              >
                <span class="row-main">{{ row.name }}</span>
                <span class="row-sub">{{ t('附件条目', 'Attachment entries') }} {{ row.attachments }}</span>
              </button>
            </li>
          </ul>
        </details>

        <details v-if="animationRows.length" open class="block">
          <summary>{{ t('动画', 'Animations') }}（{{ animationRows.length }}）</summary>
          <ul class="flat-list">
            <li v-for="row in animationRows" :key="row.name">
              <button
                type="button"
                class="row-btn"
                :class="{ sel: isAnimSel(row.name) }"
                @click="hierarchy.toggle('animation', row.name)"
              >
                <span class="row-main">{{ row.name }}</span>
                <span v-if="row.duration != null" class="row-sub">{{ row.duration.toFixed(2) }}s</span>
                <span v-else class="row-sub muted">{{ t('时长未知', 'Duration unknown') }}</span>
              </button>
            </li>
          </ul>
        </details>

        <p v-if="!boneTree.length && !slotRows.length && !animationRows.length" class="muted small">
          {{ t('当前导入未提供可列出的层级节点。', 'This import has no listable hierarchy nodes.') }}
        </p>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  width: 280px;
  min-width: 200px;
  background: var(--win-surface-alt);
  border-right: 1px solid var(--win-border);
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

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--win-text-secondary);
  line-height: 1.4;
}

.meta {
  margin: 0 0 6px;
  font-size: 11px;
  color: var(--win-text-secondary);
  line-height: 1.35;
}

.counts {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--win-text);
}

.block {
  margin-bottom: 10px;
}

.block summary {
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--win-text-secondary);
  padding: 4px 0;
  list-style: none;
}

.block summary::-webkit-details-marker {
  display: none;
}

.block summary::before {
  content: '▾';
  display: inline-block;
  width: 1em;
  font-size: 10px;
  opacity: 0.7;
}

.block:not([open]) summary::before {
  content: '▸';
}

.flat-list {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
}

.row-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  text-align: left;
  padding: 5px 6px;
  margin: 2px 0;
  border: 1px solid transparent;
  border-radius: var(--win-radius-sm);
  background: transparent;
  font-size: 12px;
  color: var(--win-text);
  cursor: pointer;
}

.row-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.row-btn.sel {
  background: rgba(0, 103, 192, 0.12);
  border-color: rgba(0, 103, 192, 0.35);
}

.row-main {
  font-weight: 500;
}

.row-sub {
  font-size: 10px;
  color: var(--win-text-secondary);
  line-height: 1.3;
  word-break: break-word;
}

.row-sub.muted {
  opacity: 0.8;
}

.muted.small {
  margin: 8px 0 0;
  font-size: 11px;
}
</style>
