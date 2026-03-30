import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ImportResult } from '../importers/types'

export const useEditorStore = defineStore('editor', () => {
  const lastFileName = ref<string | null>(null)
  const lastImport = ref<ImportResult | null>(null)
  const importError = ref<string | null>(null)

  function setImportResult(fileName: string | null, result: ImportResult | null, error: string | null) {
    lastFileName.value = fileName
    lastImport.value = result
    importError.value = error
  }

  return { lastFileName, lastImport, importError, setImportResult }
})
