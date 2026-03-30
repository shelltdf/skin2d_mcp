<script setup lang="ts">
import HierarchyBoneBranch from './HierarchyBoneBranch.vue'
import type { BoneTreeNode } from '../lib/hierarchyTree'
import { useHierarchySelectionStore } from '../stores/hierarchySelection'
import { useUiSettingsStore } from '../stores/uiSettings'

withDefaults(defineProps<{ nodes: BoneTreeNode[]; depth?: number }>(), { depth: 0 })

const hierarchy = useHierarchySelectionStore()
const ui = useUiSettingsStore()
const t = ui.t

function isSelected(name: string) {
  return hierarchy.selected?.kind === 'bone' && hierarchy.selected.name === name
}

function onClick(name: string) {
  hierarchy.toggle('bone', name)
}
</script>

<template>
  <ul class="branch" :class="{ indent: depth > 0 }">
    <li v-for="n in nodes" :key="n.name" class="node">
      <button type="button" class="node-row" :class="{ sel: isSelected(n.name) }" @click="onClick(n.name)">
        <span class="node-name">{{ n.name }}</span>
        <span v-if="n.index >= 0" class="node-meta">#{{ n.index }} · L{{ n.length.toFixed(0) }}</span>
        <span v-else class="node-meta muted">{{ t('预览', 'Preview') }}</span>
      </button>
      <HierarchyBoneBranch v-if="n.children.length" :nodes="n.children" :depth="depth + 1" />
    </li>
  </ul>
</template>

<style scoped>
.branch {
  list-style: none;
  margin: 0;
  padding: 0;
}

.branch.indent {
  padding-left: 12px;
  border-left: 1px solid var(--win-border);
  margin-left: 4px;
}

.node {
  margin: 0;
}

.node-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 4px 6px;
  margin: 1px 0;
  border: 1px solid transparent;
  border-radius: var(--win-radius-sm);
  background: transparent;
  font-size: 12px;
  color: var(--win-text);
  cursor: pointer;
}

.node-row:hover {
  background: rgba(0, 0, 0, 0.04);
}

.node-row.sel {
  background: rgba(0, 103, 192, 0.12);
  border-color: rgba(0, 103, 192, 0.35);
}

.node-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-meta {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--win-text-secondary);
  font-family: var(--win-mono, Consolas, monospace);
}

.node-meta.muted {
  opacity: 0.75;
}
</style>
