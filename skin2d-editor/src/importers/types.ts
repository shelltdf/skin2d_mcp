export type ImportFormatId = 'spine-json' | 'dragonbones' | 'gltf' | 'unknown'

export interface ImportResult {
  formatId: ImportFormatId
  versionHint?: string
  skeletonName?: string
  boneCount?: number
  slotCount?: number
  skinCount?: number
  animationNames?: string[]
  warnings: string[]
}

export function emptyResult(warnings: string[] = []): ImportResult {
  return { formatId: 'unknown', warnings }
}
