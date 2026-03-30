import type { ImportResult } from './types'
import { emptyResult } from './types'
import { parseDragonBonesJson } from './dragonbones'

/**
 * DragonBonesPro / LoongBones 等生成的 .dbproj 多为 UTF-8 JSON，
 * 骨架数据可能在根上，也可能包在 dragonBones / library / document 等节点下。
 */
export function normalizeDbProjObject(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  if (Array.isArray(o.armature) && o.armature.length > 0) {
    return o
  }

  if (o.armature && typeof o.armature === 'object' && !Array.isArray(o.armature)) {
    return { ...o, armature: [o.armature] }
  }

  const db = o.dragonBones
  if (db && typeof db === 'object') {
    const ib = db as Record<string, unknown>
    if (Array.isArray(ib.armature) && ib.armature.length > 0) {
      return mergeDbMeta(o, ib)
    }
  }

  if (Array.isArray(o.library)) {
    const arms: unknown[] = []
    for (const item of o.library) {
      if (!item || typeof item !== 'object') continue
      const it = item as Record<string, unknown>
      if (Array.isArray(it.armature)) {
        arms.push(...it.armature)
      } else if (it.armature && typeof it.armature === 'object') {
        arms.push(it.armature)
      }
    }
    if (arms.length > 0) {
      return {
        name: o.name,
        frameRate: o.frameRate,
        version: o.version ?? o.Version,
        compatibleVersion: o.compatibleVersion,
        armature: arms,
      }
    }
  }

  const doc = o.document
  if (doc && typeof doc === 'object') {
    const d = doc as Record<string, unknown>
    if (Array.isArray(d.armature) && d.armature.length > 0) {
      return mergeDbMeta(o, d)
    }
  }

  const content = o.content
  if (content && typeof content === 'object') {
    const c = content as Record<string, unknown>
    if (Array.isArray(c.armature) && c.armature.length > 0) {
      return mergeDbMeta(o, c)
    }
  }

  return null
}

function mergeDbMeta(
  outer: Record<string, unknown>,
  inner: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...inner,
    name: inner.name ?? outer.name,
    frameRate: inner.frameRate ?? outer.frameRate,
    version: inner.version ?? outer.version ?? outer.Version,
    compatibleVersion: inner.compatibleVersion ?? outer.compatibleVersion,
  }
}

/** 已解析的 JSON 对象 → 若可识别为 dbproj 骨架则返回结果，否则 null */
export function tryParseDbprojObject(obj: unknown, fileLabel: string): ImportResult | null {
  const normalized = normalizeDbProjObject(obj)
  if (!normalized) return null

  const base = parseDragonBonesJson(normalized, fileLabel)

  return {
    ...base,
    versionHint: base.versionHint ? `${base.versionHint} · dbproj` : 'dbproj',
    warnings: [
      ...base.warnings,
      'dbproj 仅解析骨架/动画元数据，不包含贴图；贴图需单独导入或导出为 _tex 后匹配。',
    ],
  }
}

export function parseDbprojText(text: string, fileLabel: string): ImportResult {
  const t = text.replace(/^\uFEFF/, '').trimStart()
  // Heuristics: some editors produce binary/packed/encrypted project files.
  // `File.text()` will still return a string, but it won't be valid JSON.
  const head = t.slice(0, 64)
  const hasNul = text.includes('\u0000')
  const looksLikeZip = head.startsWith('PK') // ZIP magic
  let raw: unknown
  try {
    raw = JSON.parse(t)
  } catch {
    if (looksLikeZip) {
      return emptyResult([
        `dbproj：看起来是 ZIP/压缩包（以 "PK" 开头），不是可直接解析的 JSON（${fileLabel}）。请在编辑器中导出可读的骨架 JSON（如 *_ske.json）。`,
      ])
    }
    if (hasNul) {
      return emptyResult([
        `dbproj：检测到二进制内容（包含 NUL 字节），不是可直接解析的 JSON（${fileLabel}）。请在编辑器中导出可读的骨架 JSON（如 *_ske.json）。`,
      ])
    }
    return emptyResult([
      `dbproj：不是合法 JSON（${fileLabel}）。若为二进制或加密工程，请从编辑器导出 _ske.json。`,
    ])
  }

  const result = tryParseDbprojObject(raw, fileLabel)
  if (!result) {
    return emptyResult([
      `dbproj：未找到 armature 数据（${fileLabel}）。请确认为 DragonBones / LoongBones 工程 JSON。`,
    ])
  }
  return result
}
