import type { BoneData, SkeletonData } from '@esotericsoftware/spine-core'
import type { RigPreviewBone } from '../importers/types'

export interface BoneTreeNode {
  name: string
  index: number
  length: number
  children: BoneTreeNode[]
}

export function boneTreeFromSkeletonData(data: SkeletonData): BoneTreeNode[] {
  const byParent = new Map<string | null, BoneData[]>()
  for (const b of data.bones) {
    const pk = b.parent?.name ?? null
    if (!byParent.has(pk)) byParent.set(pk, [])
    byParent.get(pk)!.push(b)
  }
  function walk(parentKey: string | null): BoneTreeNode[] {
    const list = byParent.get(parentKey) ?? []
    return list.map((bd) => ({
      name: bd.name,
      index: bd.index,
      length: bd.length,
      children: walk(bd.name),
    }))
  }
  return walk(null)
}

export function boneTreeFromRigPreview(bones: RigPreviewBone[]): BoneTreeNode[] {
  const names = new Set(bones.map((b) => b.name))
  const byParent = new Map<string | null, RigPreviewBone[]>()
  for (const b of bones) {
    const pk = b.parentName && names.has(b.parentName) ? b.parentName : null
    if (!byParent.has(pk)) byParent.set(pk, [])
    byParent.get(pk)!.push(b)
  }
  function walk(parentKey: string | null): BoneTreeNode[] {
    const list = byParent.get(parentKey) ?? []
    return list.map((b) => ({
      name: b.name,
      index: -1,
      length: 0,
      children: walk(b.name),
    }))
  }
  return walk(null)
}
