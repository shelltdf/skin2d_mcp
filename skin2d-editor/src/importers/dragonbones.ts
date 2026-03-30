import type { ImportResult, RigPreviewBone } from './types'
import { emptyResult } from './types'

type Affine = { a: number; b: number; c: number; d: number; tx: number; ty: number }

const IDENTITY: Affine = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }

function mul(parent: Affine, local: Affine): Affine {
  return {
    a: parent.a * local.a + parent.b * local.c,
    b: parent.a * local.b + parent.b * local.d,
    c: parent.c * local.a + parent.d * local.c,
    d: parent.c * local.b + parent.d * local.d,
    tx: parent.a * local.tx + parent.b * local.ty + parent.tx,
    ty: parent.c * local.tx + parent.d * local.ty + parent.ty,
  }
}

/** 与 Spine 画布预览类似：由 armature 的 bone + transform 估算世界位置（不做完整 DragonBones 约束求解） */
function computeDragonBonesRigPreview(bonesArr: unknown[]): RigPreviewBone[] | undefined {
  if (!Array.isArray(bonesArr) || bonesArr.length === 0) return undefined

  type Raw = {
    name?: string
    parent?: string | number
    transform?: Record<string, unknown>
  }
  const rawList = bonesArr.filter((x) => x && typeof x === 'object') as Raw[]

  function resolveParentName(b: Raw): string | null {
    const p = b.parent
    if (p === undefined || p === '') return null
    if (typeof p === 'string') return p || null
    if (typeof p === 'number') {
      const pb = rawList[p]
      return typeof pb?.name === 'string' ? pb.name : null
    }
    return null
  }

  function localFromTransform(t: Record<string, unknown> | undefined): Affine {
    if (!t || typeof t !== 'object') return { ...IDENTITY }
    const x = typeof t.x === 'number' ? t.x : 0
    const y = typeof t.y === 'number' ? t.y : 0
    const scX = typeof t.scX === 'number' ? t.scX : 1
    const scY = typeof t.scY === 'number' ? t.scY : 1
    const rotDeg =
      typeof t.rot === 'number'
        ? t.rot
        : typeof t.skX === 'number'
          ? t.skX
          : typeof t.rotate === 'number'
            ? t.rotate
            : 0
    const rad = (rotDeg * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return {
      a: cos * scX,
      b: sin * scX,
      c: -sin * scY,
      d: cos * scY,
      tx: x,
      ty: y,
    }
  }

  const world = new Map<string, Affine>()
  const pending = new Set<string>()
  const nameList: string[] = []

  for (let i = 0; i < rawList.length; i++) {
    const b = rawList[i]
    const n = typeof b.name === 'string' ? b.name : ''
    if (!n) continue
    nameList.push(n)
    pending.add(n)
  }

  let guard = 0
  const maxIter = rawList.length + 2
  while (pending.size && guard < maxIter) {
    guard++
    let progressed = false
    for (const n of [...pending]) {
      const b = rawList.find((x) => x.name === n)
      if (!b) continue
      const pn = resolveParentName(b)
      if (pn == null) {
        world.set(n, mul(IDENTITY, localFromTransform(b.transform)))
        pending.delete(n)
        progressed = true
      } else if (world.has(pn)) {
        world.set(n, mul(world.get(pn)!, localFromTransform(b.transform)))
        pending.delete(n)
        progressed = true
      }
    }
    if (!progressed) break
  }

  if (world.size === 0) return undefined

  const out: RigPreviewBone[] = []
  for (const n of nameList) {
    const m = world.get(n)
    if (!m) continue
    const b = rawList.find((x) => x.name === n)
    const pn = b ? resolveParentName(b) : null
    out.push({
      name: n,
      worldX: m.tx,
      worldY: m.ty,
      parentName: pn && world.has(pn) ? pn : null,
    })
  }
  return out.length ? out : undefined
}

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

  const boneArr = first.bone
  const rigBones = Array.isArray(boneArr) ? computeDragonBonesRigPreview(boneArr) : undefined
  if (boneCount > 0 && !rigBones?.length) {
    warnings.push('DragonBones：未能从 bone 列表生成画布骨骼预览（层级或 transform 异常）。')
  }

  return {
    formatId: 'dragonbones',
    versionHint,
    skeletonName,
    boneCount,
    slotCount: undefined,
    skinCount: Array.isArray(skin) ? skin.length : undefined,
    animationNames: animationNames.length ? animationNames : undefined,
    rigPreview: rigBones?.length ? { bones: rigBones } : undefined,
    warnings,
  }
}
