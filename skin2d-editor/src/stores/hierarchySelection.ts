import { defineStore } from 'pinia'
import { ref } from 'vue'

export type HierarchyKind = 'bone' | 'slot' | 'skin' | 'animation'

export interface HierarchySelection {
  kind: HierarchyKind
  name: string
}

export const useHierarchySelectionStore = defineStore('hierarchySelection', () => {
  const selected = ref<HierarchySelection | null>(null)

  function select(kind: HierarchyKind, name: string) {
    selected.value = { kind, name }
  }

  function toggle(kind: HierarchyKind, name: string) {
    if (selected.value?.kind === kind && selected.value.name === name) {
      selected.value = null
    } else {
      selected.value = { kind, name }
    }
  }

  function clear() {
    selected.value = null
  }

  return { selected, select, toggle, clear }
})
