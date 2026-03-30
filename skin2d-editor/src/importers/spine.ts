import type { ImportResult } from './types'
import { emptyResult } from './types'

export function parseSpineJson(obj: unknown, fileLabel: string): ImportResult {
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

  return {
    formatId: 'spine-json',
    versionHint,
    skeletonName,
    boneCount: bones.length,
    slotCount: Array.isArray(slots) ? slots.length : undefined,
    skinCount: Array.isArray(skins) ? skins.length : undefined,
    animationNames: animationNames.length ? animationNames : undefined,
    warnings,
  }
}
