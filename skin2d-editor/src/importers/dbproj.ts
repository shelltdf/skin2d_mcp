import type { ImportResult } from './types'
import { emptyResult } from './types'
import { parseDragonBonesJson } from './dragonbones'

/**
 * `.dbproj` 在不同编辑器/版本下可能是：
 * - 文本 UTF-8 JSON（本函数可尝试归一化并解析）
 * - 二进制或 ZIP 等封装（常见）：浏览器端无法用 JSON.parse，须用户在编辑器中导出可读骨架 `*_ske.json`
 *
 * 文本型 dbproj 的骨架可能在根上，也可能包在 dragonBones / library / document 等节点下。
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
  // 许多 `.dbproj` 为二进制/ZIP；`File.text()` 读入后仍无法 JSON.parse，属预期情况，应引导导出 *_ske.json。
  const head = t.slice(0, 64)
  const hasNul = text.includes('\u0000')
  const looksLikeZip = head.startsWith('PK') // ZIP magic
  let raw: unknown
  try {
    raw = JSON.parse(t)
  } catch {
    if (looksLikeZip) {
      return emptyResult([
        `dbproj：该文件为 ZIP/压缩封装工程（${fileLabel}），不是文本 JSON。本工具只解析 UTF-8 骨架文本，请在 DragonBones / LoongBones 中导出 *_ske.json（或文本型工程）后再导入。`,
      ])
    }
    if (hasNul) {
      return emptyResult([
        `dbproj：该文件含二进制数据（${fileLabel}），属于正常现象——多数 .dbproj 并非 JSON。本工具只支持文本骨架；请从编辑器导出 *_ske.json（或可读的文本工程）后再导入。`,
      ])
    }
    return emptyResult([
      `dbproj：无法作为文本 JSON 解析（${fileLabel}）。若为二进制或专有工程，请导出 *_ske.json；若确为 JSON，请检查编码是否为 UTF-8。`,
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
