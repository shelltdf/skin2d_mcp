import type { ImportResult } from './types'
import { emptyResult } from './types'
import { assertTextLooksLikeJson, rejectKnownNonJsonFile } from './importGuards'
import { parseDragonBonesJson } from './dragonbones'
import { parseGltfFile } from './gltf'
import { isLive2dModel3Json } from './live2d'
import { parseSpineJsonString } from './spine'
import { useUiSettingsStore } from '../stores/uiSettings'

function tryParseJson(text: string): unknown {
  return JSON.parse(text) as unknown
}

function isSpineLike(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  return o.skeleton !== undefined && Array.isArray(o.bones)
}

function isDragonBonesLike(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  return Array.isArray(o.armature)
}

export async function importAssetFile(file: File): Promise<ImportResult> {
  const t = useUiSettingsStore().t
  const lower = file.name.toLowerCase()

  if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
    return parseGltfFile(file)
  }

  const rejected = rejectKnownNonJsonFile(file)
  if (rejected) {
    return rejected
  }

  let text: string
  try {
    text = await file.text()
  } catch (e) {
    return emptyResult([
      t(`无法读取文件：${e instanceof Error ? e.message : String(e)}`, `Unable to read file: ${e instanceof Error ? e.message : String(e)}`),
    ])
  }

  const shapeHint = assertTextLooksLikeJson(text, file.name)
  if (shapeHint) {
    return emptyResult([shapeHint])
  }

  let obj: unknown
  try {
    obj = tryParseJson(text)
  } catch {
    return emptyResult([
      t(
        `「${file.name}」无法解析为合法 JSON。请确认文件为 UTF-8 编码的 Spine / DragonBones / Live2D 文本导出，且未被截断或混入二进制数据。`,
        `“${file.name}” is not valid JSON. Ensure it is a UTF-8 text export from Spine/DragonBones/Live2D and not truncated or mixed with binary data.`,
      ),
    ])
  }

  if (isLive2dModel3Json(obj, file.name)) {
    return emptyResult([
      t(
        `Live2D 仅支持导入 **单个 .zip**（内含 *.model3.json、.moc3、贴图等）。请勿单独打开 *.model3.json。`,
        'Live2D only supports a single **.zip** (containing *.model3.json, .moc3, textures, etc.). Do not open *.model3.json alone.',
      ),
    ])
  }

  if (isSpineLike(obj)) {
    return parseSpineJsonString(text, file.name)
  }
  if (isDragonBonesLike(obj)) {
    return parseDragonBonesJson(obj, file.name)
  }

  return emptyResult([
    t(
      `无法识别 JSON 骨架格式（非 Spine / DragonBones 特征）。文件：${file.name}`,
      `Unrecognized JSON rig format (not Spine/DragonBones). File: ${file.name}`,
    ),
  ])
}

export type { ImportResult, ImportFormatId } from './types'
