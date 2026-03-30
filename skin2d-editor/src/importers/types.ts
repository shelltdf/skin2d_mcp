export type ImportFormatId = 'spine-json' | 'dragonbones' | 'gltf' | 'live2d' | 'unknown'

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
  /** Live2D：来自 cdi3.json 的参数量（与 Spine「骨骼」不同语义） */
  live2dParameterCount?: number
  /** Live2D：来自 cdi3.json 的部件数 */
  live2dPartCount?: number
  slotCount?: number
  skinCount?: number
  animationNames?: string[]
  warnings: string[]
  /** 有则视口绘制骨骼线（Spine / DragonBones 骨架 JSON 会填充） */
  rigPreview?: { bones: RigPreviewBone[] }
}

export function emptyResult(warnings: string[] = []): ImportResult {
  return { formatId: 'unknown', warnings }
}
