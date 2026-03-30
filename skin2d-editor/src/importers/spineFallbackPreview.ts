/**
 * 当 SkeletonJson 无法解析（例如 3.8 导出与 4.2 运行时差异）时，
 * 从原始 JSON 按 Spine 骨骼公式计算 setup 姿势下的世界矩阵，供画布连线。
 */
import { Inherit, MathUtils } from '@esotericsoftware/spine-core'
import type { RigPreviewBone } from './types'

interface BoneState {
  a: number
  b: number
  c: number
  d: number
  worldX: number
  worldY: number
}

interface SkRef {
  x: number
  y: number
  scaleX: number
  /** 与 Skeleton.scaleY getter 一致（含 yDown 时取反） */
  scaleY: number
}

function readInherit(raw: unknown): Inherit {
  const s = typeof raw === 'string' && raw.length ? raw : 'normal'
  const key = s.charAt(0).toUpperCase() + s.slice(1)
  const v = (Inherit as unknown as Record<string, Inherit | undefined>)[key]
  return v ?? Inherit.Normal
}

function updateWorldTransformWith(
  out: BoneState,
  parent: BoneState | null,
  skeleton: SkRef,
  inherit: Inherit,
  x: number,
  y: number,
  rotation: number,
  scaleX: number,
  scaleY: number,
  shearX: number,
  shearY: number,
): void {
  if (!parent) {
    const sx = skeleton.scaleX
    const sy = skeleton.scaleY
    const rx = (rotation + shearX) * MathUtils.degRad
    const ry = (rotation + 90 + shearY) * MathUtils.degRad
    out.a = Math.cos(rx) * scaleX * sx
    out.b = Math.cos(ry) * scaleY * sx
    out.c = Math.sin(rx) * scaleX * sy
    out.d = Math.sin(ry) * scaleY * sy
    out.worldX = x * sx + skeleton.x
    out.worldY = y * sy + skeleton.y
    return
  }
  const pa = parent.a
  const pb = parent.b
  const pc = parent.c
  const pd = parent.d
  out.worldX = pa * x + pb * y + parent.worldX
  out.worldY = pc * x + pd * y + parent.worldY

  switch (inherit) {
    case Inherit.Normal: {
      const rx = (rotation + shearX) * MathUtils.degRad
      const ry = (rotation + 90 + shearY) * MathUtils.degRad
      const la = Math.cos(rx) * scaleX
      const lb = Math.cos(ry) * scaleY
      const lc = Math.sin(rx) * scaleX
      const ld = Math.sin(ry) * scaleY
      out.a = pa * la + pb * lc
      out.b = pa * lb + pb * ld
      out.c = pc * la + pd * lc
      out.d = pc * lb + pd * ld
      return
    }
    case Inherit.OnlyTranslation: {
      const rx = (rotation + shearX) * MathUtils.degRad
      const ry = (rotation + 90 + shearY) * MathUtils.degRad
      out.a = Math.cos(rx) * scaleX
      out.b = Math.cos(ry) * scaleY
      out.c = Math.sin(rx) * scaleX
      out.d = Math.sin(ry) * scaleY
      break
    }
    case Inherit.NoRotationOrReflection: {
      let pa2 = pa
      let pb2 = pb
      let pc2 = pc
      let pd2 = pd
      const invSx = 1 / skeleton.scaleX
      const invSy = 1 / skeleton.scaleY
      pa2 *= invSx
      pc2 *= invSy
      let s = pa2 * pa2 + pc2 * pc2
      let prx = 0
      if (s > 0.0001) {
        s = Math.abs(pa2 * pd2 * invSy - pb2 * invSx * pc2) / s
        pb2 = pc2 * s
        pd2 = pa2 * s
        prx = Math.atan2(pc2, pa2) * MathUtils.radDeg
      } else {
        pa2 = 0
        pc2 = 0
        prx = 90 - Math.atan2(pd2, pb2) * MathUtils.radDeg
      }
      const rx = (rotation + shearX - prx) * MathUtils.degRad
      const ry = (rotation + shearY - prx + 90) * MathUtils.degRad
      const la = Math.cos(rx) * scaleX
      const lb = Math.cos(ry) * scaleY
      const lc = Math.sin(rx) * scaleX
      const ld = Math.sin(ry) * scaleY
      out.a = pa2 * la - pb2 * lc
      out.b = pa2 * lb - pb2 * ld
      out.c = pc2 * la + pd2 * lc
      out.d = pc2 * lb + pd2 * ld
      break
    }
    case Inherit.NoScale:
    case Inherit.NoScaleOrReflection: {
      let rot = rotation * MathUtils.degRad
      const cos = Math.cos(rot)
      const sin = Math.sin(rot)
      let za = (pa * cos + pb * sin) / skeleton.scaleX
      let zc = (pc * cos + pd * sin) / skeleton.scaleY
      let s = Math.sqrt(za * za + zc * zc)
      if (s > 0.00001) s = 1 / s
      za *= s
      zc *= s
      s = Math.sqrt(za * za + zc * zc)
      if (
        inherit === Inherit.NoScale &&
        (pa * pd - pb * pc < 0) !== (skeleton.scaleX < 0 !== skeleton.scaleY < 0)
      ) {
        s = -s
      }
      rot = Math.PI / 2 + Math.atan2(zc, za)
      const zb = Math.cos(rot) * s
      const zd = Math.sin(rot) * s
      const shx = shearX * MathUtils.degRad
      const shy = (90 + shearY) * MathUtils.degRad
      const la = Math.cos(shx) * scaleX
      const lb = Math.cos(shy) * scaleY
      const lc = Math.sin(shx) * scaleX
      const ld = Math.sin(shy) * scaleY
      out.a = za * la + zb * lc
      out.b = za * lb + zb * ld
      out.c = zc * la + zd * lc
      out.d = zc * lb + zd * ld
      break
    }
    default: {
      const rx = (rotation + shearX) * MathUtils.degRad
      const ry = (rotation + 90 + shearY) * MathUtils.degRad
      const la = Math.cos(rx) * scaleX
      const lb = Math.cos(ry) * scaleY
      const lc = Math.sin(rx) * scaleX
      const ld = Math.sin(ry) * scaleY
      out.a = pa * la + pb * lc
      out.b = pa * lb + pb * ld
      out.c = pc * la + pd * lc
      out.d = pc * lb + pd * ld
      return
    }
  }
  out.a *= skeleton.scaleX
  out.b *= skeleton.scaleX
  out.c *= skeleton.scaleY
  out.d *= skeleton.scaleY
}

interface ParsedBone {
  name: string
  parent?: string
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
  shearX: number
  shearY: number
  inherit: Inherit
}

function sortBonesTopologically(bones: ParsedBone[]): ParsedBone[] {
  const byName = new Map(bones.map((b) => [b.name, b]))
  const visited = new Set<string>()
  const out: ParsedBone[] = []
  function visit(b: ParsedBone) {
    if (visited.has(b.name)) return
    if (b.parent) {
      const p = byName.get(b.parent)
      if (p) visit(p)
    }
    visited.add(b.name)
    out.push(b)
  }
  for (const b of bones) visit(b)
  return out
}

/** 与 spineRuntime 一致：画布 Y 向下 */
const Y_DOWN = true

export function computeSpineFallbackPreview(jsonText: string): RigPreviewBone[] | null {
  let root: Record<string, unknown>
  try {
    root = JSON.parse(jsonText) as Record<string, unknown>
  } catch {
    return null
  }
  const bonesRaw = root.bones
  if (!Array.isArray(bonesRaw) || bonesRaw.length === 0) return null

  const skMap = (root.skeleton as Record<string, unknown> | undefined) ?? {}
  const skX = typeof skMap.x === 'number' ? skMap.x : 0
  const skY = typeof skMap.y === 'number' ? skMap.y : 0
  const skScaleX = typeof skMap.scaleX === 'number' ? skMap.scaleX : 1
  const skScaleYRaw = typeof skMap.scaleY === 'number' ? skMap.scaleY : 1
  const skScaleY = Y_DOWN ? -skScaleYRaw : skScaleYRaw

  const jsonScale = 1

  const skeleton: SkRef = {
    x: skX,
    y: skY,
    scaleX: skScaleX,
    scaleY: skScaleY,
  }

  const bonesParsed: ParsedBone[] = bonesRaw.map((b) => {
    const m = b as Record<string, unknown>
    const name = typeof m.name === 'string' ? m.name : ''
    const parent = typeof m.parent === 'string' ? m.parent : undefined
    return {
      name,
      parent,
      x: (typeof m.x === 'number' ? m.x : 0) * jsonScale,
      y: (typeof m.y === 'number' ? m.y : 0) * jsonScale,
      rotation: typeof m.rotation === 'number' ? m.rotation : 0,
      scaleX: typeof m.scaleX === 'number' ? m.scaleX : 1,
      scaleY: typeof m.scaleY === 'number' ? m.scaleY : 1,
      shearX: typeof m.shearX === 'number' ? m.shearX : 0,
      shearY: typeof m.shearY === 'number' ? m.shearY : 0,
      inherit: readInherit(m.inherit),
    }
  })

  const ordered = sortBonesTopologically(bonesParsed)
  const stateByName = new Map<string, BoneState>()

  for (const b of ordered) {
    if (!b.name) continue
    const parentState = b.parent ? stateByName.get(b.parent) ?? null : null
    const out: BoneState = { a: 1, b: 0, c: 0, d: 1, worldX: 0, worldY: 0 }
    updateWorldTransformWith(
      out,
      parentState,
      skeleton,
      b.inherit,
      b.x,
      b.y,
      b.rotation,
      b.scaleX,
      b.scaleY,
      b.shearX,
      b.shearY,
    )
    stateByName.set(b.name, out)
  }

  return ordered.map((b) => ({
    name: b.name,
    worldX: stateByName.get(b.name)!.worldX,
    worldY: stateByName.get(b.name)!.worldY,
    parentName: b.parent ?? null,
  }))
}
