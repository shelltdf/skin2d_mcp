<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()

const hint = computed(() => {
  if (!store.lastImport) return '尚未导入骨架。使用「文件 → 导入…」'
  return `骨架：${store.lastImport.skeletonName ?? '（未命名）'}`
})
</script>

<template>
  <aside class="panel">
    <div class="panel-head">层级</div>
    <div class="panel-body">
      <p class="hint">{{ hint }}</p>
      <ul v-if="store.lastImport && store.lastImport.boneCount != null" class="tree">
        <li class="tree-item">骨骼（{{ store.lastImport.boneCount }}）</li>
        <li v-if="store.lastImport.slotCount != null" class="tree-item muted">
          插槽（{{ store.lastImport.slotCount }}）
        </li>
      </ul>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  width: 240px;
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
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--win-text-secondary);
  line-height: 1.4;
}

.tree {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
}

.tree-item {
  padding: 4px 0;
}

.tree-item.muted {
  color: var(--win-text-secondary);
  font-size: 12px;
}
</style>
