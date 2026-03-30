import {
  Physics,
  Skeleton,
  SkeletonJson,
} from '@esotericsoftware/spine-core'
import type { RigPreviewBone } from './types'
import { spineStubAttachmentLoader } from './spineStubLoader'

/** 用官方运行时计算 setup 姿势下的骨骼世界坐标，供画布绘制 */
export function loadSpineRigPreview(jsonText: string): RigPreviewBone[] | null {
  try {
    const json = new SkeletonJson(spineStubAttachmentLoader)
    const data = json.readSkeletonData(jsonText)
    Skeleton.yDown = true
    const sk = new Skeleton(data)
    sk.setToSetupPose()
    if (data.defaultSkin) sk.setSkin(data.defaultSkin)
    else if (data.skins.length > 0) sk.setSkin(data.skins[0])
    sk.updateWorldTransform(Physics.none)

    return sk.bones.map((b) => ({
      name: b.data.name,
      worldX: b.worldX,
      worldY: b.worldY,
      parentName: b.parent ? b.parent.data.name : null,
    }))
  } catch {
    return null
  }
}
