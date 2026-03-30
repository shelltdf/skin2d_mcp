import {
  AnimationState,
  AnimationStateData,
  AtlasAttachmentLoader,
  Physics,
  Skeleton,
  SkeletonData,
  SkeletonJson,
  TextureAtlas,
} from '@esotericsoftware/spine-core'
import { CanvasTexture } from '@esotericsoftware/spine-canvas'
import type { ImportResult, RigPreviewBone } from '../importers/types'

export interface LoadedSpineBundle {
  atlas: TextureAtlas
  skeleton: Skeleton
  skeletonData: SkeletonData
  animationState: AnimationState
  animationStateData: AnimationStateData
}

function bonesToRigPreview(sk: Skeleton): RigPreviewBone[] {
  return sk.bones.map((b) => ({
    name: b.data.name,
    worldX: b.worldX,
    worldY: b.worldY,
    parentName: b.parent ? b.parent.data.name : null,
  }))
}

function buildImportResult(skData: SkeletonData, fileLabel: string): ImportResult {
  const anims = skData.animations.map((a) => a.name)
  return {
    formatId: 'spine-json',
    versionHint: skData.version ? `spine data ${skData.version} · 已加载贴图` : '已加载贴图',
    skeletonName: skData.name ?? fileLabel.replace(/\.[^.]+$/, ''),
    boneCount: skData.bones.length,
    slotCount: skData.slots.length,
    skinCount: skData.skins.length,
    animationNames: anims.slice(0, 64),
    rigPreview: { bones: bonesToRigPreview(new Skeleton(skData)) },
    warnings: [],
  }
}

/** 从多文件中解析 Spine：skeleton.json + atlas + 各 page 贴图 */
export async function loadSpineBundle(files: File[]): Promise<{ bundle: LoadedSpineBundle; importResult: ImportResult } | null> {
  const lowerName = (f: File) => f.name.toLowerCase()
  const atlasFile = files.find((f) => lowerName(f).endsWith('.atlas'))
  if (!atlasFile) return null

  let jsonFile: File | undefined
  for (const f of files) {
    if (!lowerName(f).endsWith('.json')) continue
    try {
      const t = await f.text()
      const o = JSON.parse(t) as Record<string, unknown>
      if (o.skeleton && Array.isArray(o.bones)) {
        jsonFile = f
        break
      }
    } catch {
      /* skip */
    }
  }
  if (!jsonFile) return null

  const atlasText = await atlasFile.text()
  const atlas = new TextureAtlas(atlasText)

  for (const page of atlas.pages) {
    const base = page.name.replace(/\\/g, '/').split('/').pop() ?? page.name
    const need = base.toLowerCase()
    const img = files.find((f) => lowerName(f) === need)
    if (!img) {
      atlas.dispose()
      throw new Error(`缺少 atlas 引用的贴图文件：${page.name}`)
    }
    const bitmap = await createImageBitmap(img)
    const tex = new CanvasTexture(bitmap)
    page.setTexture(tex)
  }

  const jsonText = await jsonFile.text()
  const loader = new AtlasAttachmentLoader(atlas)
  const json = new SkeletonJson(loader)
  const skeletonData = json.readSkeletonData(jsonText)

  Skeleton.yDown = true
  const skeleton = new Skeleton(skeletonData)
  skeleton.setToSetupPose()
  if (skeletonData.defaultSkin) skeleton.setSkin(skeletonData.defaultSkin)
  else if (skeletonData.skins.length > 0) skeleton.setSkin(skeletonData.skins[0])
  skeleton.updateWorldTransform(Physics.none)

  const animationStateData = new AnimationStateData(skeletonData)
  const animationState = new AnimationState(animationStateData)

  const bundle: LoadedSpineBundle = {
    atlas,
    skeleton,
    skeletonData,
    animationState,
    animationStateData,
  }

  const importResult = buildImportResult(skeletonData, jsonFile.name)
  importResult.rigPreview = { bones: bonesToRigPreview(skeleton) }

  return { bundle, importResult }
}

export function disposeSpineBundle(bundle: LoadedSpineBundle | null) {
  if (!bundle) return
  try {
    bundle.atlas.dispose()
  } catch {
    /* ignore */
  }
}
