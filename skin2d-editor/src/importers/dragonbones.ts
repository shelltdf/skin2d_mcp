import type { ImportResult } from './types'
import { emptyResult } from './types'

function countBonesInArmature(arm: Record<string, unknown>): number {
  const bones = arm.bone
  if (Array.isArray(bones)) return bones.length
  return 0
}

export function parseDragonBonesJson(obj: unknown, fileLabel: string): ImportResult {
  const warnings: string[] = []
  if (!obj || typeof obj !== 'object') {
    return emptyResult([`DragonBones：根不是对象（${fileLabel}）`])
  }
  const root = obj as Record<string, unknown>
  const frameRate = root.frameRate
  const versionHint =
    typeof root.version === 'string'
      ? `DB ${root.version}`
      : typeof frameRate === 'number'
        ? `frameRate ${frameRate}`
        : undefined

  const armatures = root.armature
  if (!Array.isArray(armatures) || armatures.length === 0) {
    return emptyResult([`DragonBones：缺少 armature 数组（${fileLabel}）`])
  }
  const first = armatures[0] as Record<string, unknown>
  const skeletonName =
    typeof first.name === 'string' ? first.name : fileLabel.replace(/\.[^.]+$/, '')
  let boneCount = 0
  for (const a of armatures) {
    if (a && typeof a === 'object') boneCount += countBonesInArmature(a as Record<string, unknown>)
  }
  const skin = first.skin
  const animation = first.animation
  const animationNames = Array.isArray(animation)
    ? (animation as { name?: string }[])
        .map((x) => x.name)
        .filter((n): n is string => typeof n === 'string')
        .slice(0, 32)
    : []

  if (boneCount === 0) warnings.push('DragonBones：未统计到骨骼')

  return {
    formatId: 'dragonbones',
    versionHint,
    skeletonName,
    boneCount,
    slotCount: undefined,
    skinCount: Array.isArray(skin) ? skin.length : undefined,
    animationNames: animationNames.length ? animationNames : undefined,
    warnings,
  }
}
