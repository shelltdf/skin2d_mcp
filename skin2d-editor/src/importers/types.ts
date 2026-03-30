export type ImportFormatId = 'spine-json' | 'dragonbones' | 'gltf' | 'unknown'

/** 画布绘制用：骨骼世界坐标（与 Spine 运行时一致） */
export interface RigPreviewBone {
  name: string
  worldX: number
  worldY: number
  parentName: string | null
}

export interface ImportResult {
  formatId: ImportFormatId
  versionHint?: string
  skeletonName?: string
  boneCount?: number
  slotCount?: number
  skinCount?: number
  animationNames?: string[]
  warnings: string[]
  /** 有则视口绘制骨骼线（当前 Spine 导入会填充） */
  rigPreview?: { bones: RigPreviewBone[] }
}

export function emptyResult(warnings: string[] = []): ImportResult {
  return { formatId: 'unknown', warnings }
}
