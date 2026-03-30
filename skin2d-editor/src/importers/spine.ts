import type { ImportResult } from './types'
import { emptyResult } from './types'
import { computeSpineFallbackPreview } from './spineFallbackPreview'
import { loadSpineRigPreview } from './spineRuntime'

export function parseSpineJsonString(text: string, fileLabel: string): ImportResult {
  let obj: unknown
  try {
    obj = JSON.parse(text)
  } catch {
    return emptyResult([`Spine：JSON 无效（${fileLabel}）`])
  }
  const warnings: string[] = []
  if (!obj || typeof obj !== 'object') {
    return emptyResult([`Spine：根不是对象（${fileLabel}）`])
  }
  const root = obj as Record<string, unknown>
  const bones = root.bones
  if (!Array.isArray(bones)) {
    return emptyResult([`Spine：缺少 bones 数组（${fileLabel}）`])
  }
  const sk = root.skeleton as Record<string, unknown> | undefined
  const versionHint =
    typeof sk?.spine === 'string'
      ? sk.spine
      : typeof sk?.hash === 'string'
        ? `hash ${sk.hash}`
        : undefined
  const skeletonName =
    typeof sk?.name === 'string' ? sk.name : fileLabel.replace(/\.[^.]+$/, '')
  const slots = root.slots
  const skins = root.skins
  const animations = root.animations as Record<string, unknown> | undefined
  const animationNames = animations ? Object.keys(animations).slice(0, 32) : []

  if (bones.length === 0) warnings.push('Spine：bones 为空')

  let rigBones = loadSpineRigPreview(text)
  if (!rigBones?.length) {
    rigBones = computeSpineFallbackPreview(text)
    if (rigBones?.length) {
      warnings.push('已使用 JSON 回退解析绘制骨骼（官方运行时未成功加载该导出，常见于 3.8/4.x 与运行时版本不一致）。')
    } else {
      warnings.push(
        '骨骼预览未生成：无法从 JSON 计算骨骼坐标。请确认文件为完整 Spine skeleton 导出。',
      )
    }
  }

  return {
    formatId: 'spine-json',
    versionHint,
    skeletonName,
    boneCount: bones.length,
    slotCount: Array.isArray(slots) ? slots.length : undefined,
    skinCount: Array.isArray(skins) ? skins.length : undefined,
    animationNames: animationNames.length ? animationNames : undefined,
    rigPreview: rigBones?.length ? { bones: rigBones } : undefined,
    warnings,
  }
}
