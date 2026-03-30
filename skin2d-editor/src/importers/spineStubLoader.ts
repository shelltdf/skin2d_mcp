import type { AttachmentLoader } from '@esotericsoftware/spine-core'

/** 不加载贴图，仅解析骨架数据；附件全部跳过（运行时对 null 有分支） */
export const spineStubAttachmentLoader = {
  newRegionAttachment() {
    return null
  },
  newMeshAttachment() {
    return null
  },
  newBoundingBoxAttachment() {
    return null
  },
  newPathAttachment() {
    return null
  },
  newPointAttachment() {
    return null
  },
  newClippingAttachment() {
    return null
  },
} as unknown as AttachmentLoader
