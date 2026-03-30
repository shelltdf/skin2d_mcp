import type { ImportResult } from './types'
import { emptyResult } from './types'

function getFileReferences(root: Record<string, unknown>): Record<string, unknown> | null {
  const fr = root.FileReferences ?? root.fileReferences
  if (fr && typeof fr === 'object') return fr as Record<string, unknown>
  return null
}

function collectMotionKeys(fr: Record<string, unknown>): string[] {
  const motions = fr.Motions ?? fr.motions
  if (!motions || typeof motions !== 'object') return []
  const out: string[] = []
  for (const [group, val] of Object.entries(motions)) {
    out.push(group)
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item && typeof item === 'object' && 'File' in item) {
          const f = (item as { File?: string }).File
          if (typeof f === 'string') out.push(`${group}/${f}`)
        }
      }
    }
  }
  return out.slice(0, 64)
}

/** 是否为 Live2D Cubism model3.json（或等价根结构） */
export function isLive2dModel3Json(obj: unknown, fileLabel: string): boolean {
  if (!obj || typeof obj !== 'object') return false
  const root = obj as Record<string, unknown>
  const fr = getFileReferences(root)
  if (!fr) return false

  const lower = fileLabel.toLowerCase()
  if (lower.endsWith('.model3.json')) return true

  const moc = fr.Moc ?? fr.moc
  if (typeof moc === 'string' && /\.moc3?$/i.test(moc)) return true

  if (typeof root.Version === 'number' && root.Version >= 3) {
    return (
      typeof fr.Textures !== 'undefined' ||
      typeof fr.Moc !== 'undefined' ||
      typeof fr.moc !== 'undefined'
    )
  }
  return false
}

export function parseLive2dModel3(obj: unknown, fileLabel: string): ImportResult {
  if (!obj || typeof obj !== 'object') {
    return emptyResult([`Live2D：根不是对象（${fileLabel}）`])
  }
  const root = obj as Record<string, unknown>
  const fr = getFileReferences(root)
  if (!fr) {
    return emptyResult([`Live2D：缺少 FileReferences（${fileLabel}）`])
  }

  const version = typeof root.Version === 'number' ? root.Version : undefined
  const moc = fr.Moc ?? fr.moc
  const textures = fr.Textures ?? fr.textures
  const physics = fr.Physics ?? fr.physics
  const pose = fr.Pose ?? fr.pose

  const textureCount = Array.isArray(textures) ? textures.length : 0
  const motionNames = collectMotionKeys(fr)

  const baseName = fileLabel.replace(/\.model3\.json$/i, '').replace(/\.json$/i, '')
  const skeletonName =
    typeof root.Name === 'string'
      ? root.Name
      : typeof (root as { name?: string }).name === 'string'
        ? (root as { name: string }).name
        : baseName

  const warnings: string[] = [
    '已识别 Live2D Cubism model3.json。单文件仅展示元数据；完整预览请将模型目录打包为 **zip** 后导入（含 .model3.json、.moc3、贴图）。',
  ]

  const mocHint = typeof moc === 'string' ? moc : undefined
  let versionHint = version != null ? `Live2D model3 · Version ${version}` : 'Live2D model3'
  if (mocHint) versionHint += ` · Moc ${mocHint}`
  if (typeof physics === 'string') versionHint += ` · Physics`
  if (typeof pose === 'string') versionHint += ` · Pose`

  return {
    formatId: 'live2d',
    versionHint,
    skeletonName,
    slotCount: textureCount > 0 ? textureCount : undefined,
    animationNames: motionNames.length ? motionNames : undefined,
    warnings,
  }
}
