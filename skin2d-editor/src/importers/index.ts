import type { ImportResult } from './types'
import { emptyResult } from './types'
import { parseDragonBonesJson } from './dragonbones'
import { parseGltfFile } from './gltf'
import { parseSpineJson } from './spine'

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
  const lower = file.name.toLowerCase()

  if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
    return parseGltfFile(file)
  }

  let text: string
  try {
    text = await file.text()
  } catch (e) {
    return emptyResult([`无法读取文件：${e instanceof Error ? e.message : String(e)}`])
  }

  let obj: unknown
  try {
    obj = tryParseJson(text)
  } catch (e) {
    return emptyResult([`JSON 解析失败：${e instanceof Error ? e.message : String(e)}`])
  }

  if (isSpineLike(obj)) {
    return parseSpineJson(obj, file.name)
  }
  if (isDragonBonesLike(obj)) {
    return parseDragonBonesJson(obj, file.name)
  }

  return emptyResult([
    `无法识别 JSON 骨架格式（非 Spine / DragonBones 特征）。文件：${file.name}`,
  ])
}

export type { ImportResult, ImportFormatId } from './types'
