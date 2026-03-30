import type { ImportResult } from './types'
import { emptyResult } from './types'

function parseGlbJsonChunk(buffer: ArrayBuffer): Record<string, unknown> {
  const view = new DataView(buffer)
  const magic = view.getUint32(0, true)
  if (magic !== 0x46546c67) {
    throw new Error('不是有效的 glB 文件（魔数不符）')
  }
  const version = view.getUint32(4, true)
  if (version !== 2) {
    throw new Error(`glTF 版本 ${version}，当前仅摘要解析 v2`)
  }
  let offset = 12
  const jsonChunkLength = view.getUint32(offset, true)
  offset += 4
  const jsonChunkType = view.getUint32(offset, true)
  offset += 4
  if (jsonChunkType !== 0x4e4f534a) {
    throw new Error('glB 首个 chunk 不是 JSON')
  }
  const jsonBytes = buffer.slice(offset, offset + jsonChunkLength)
  const text = new TextDecoder().decode(jsonBytes)
  return JSON.parse(text) as Record<string, unknown>
}

export async function parseGltfFile(file: File): Promise<ImportResult> {
  const warnings: string[] = []
  const name = file.name.toLowerCase()
  try {
    let root: Record<string, unknown>
    if (name.endsWith('.glb')) {
      const buf = await file.arrayBuffer()
      root = parseGlbJsonChunk(buf)
    } else {
      const text = await file.text()
      root = JSON.parse(text) as Record<string, unknown>
    }
    const asset = root.asset as Record<string, unknown> | undefined
    const versionHint =
      asset && typeof asset.version === 'string' ? `glTF ${asset.version}` : 'glTF'
    const nodes = root.nodes as unknown[] | undefined
    const animations = root.animations as unknown[] | undefined
    const skins = root.skins as unknown[] | undefined
    const animationNames = Array.isArray(animations)
      ? animations
          .map((a) => (a as { name?: string }).name)
          .filter((n): n is string => typeof n === 'string')
          .slice(0, 32)
      : []

    if (!nodes?.length) warnings.push('glTF：nodes 为空或缺失（可能是仅数据扩展包）')

    return {
      formatId: 'gltf',
      versionHint,
      skeletonName: file.name.replace(/\.[^.]+$/, ''),
      boneCount: Array.isArray(nodes) ? nodes.length : undefined,
      slotCount: undefined,
      skinCount: Array.isArray(skins) ? skins.length : undefined,
      animationNames: animationNames.length ? animationNames : undefined,
      warnings,
    }
  } catch (e) {
    return emptyResult([`glTF 解析失败：${e instanceof Error ? e.message : String(e)}`])
  }
}
