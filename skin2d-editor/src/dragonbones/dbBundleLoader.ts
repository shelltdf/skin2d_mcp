/**
 * DragonBones 多文件：*_ske.json（或含 armature 的运行时骨架）+ *_tex.json + 图集 PNG/WebP。
 */
import type { ImportResult } from '../importers/types'
import { parseDragonBonesJson } from '../importers/dragonbones'
import { ensureDragonBonesPixiEnv, getDragonBones } from './pixiDragonBonesEnv'

/** PixiArmatureDisplay（dragonbones.js）；避免对 UMD 包做强类型依赖 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbPixiArmatureDisplay = any

function isSpineSkeletonJson(o: Record<string, unknown>): boolean {
  return o.skeleton !== undefined && Array.isArray(o.bones)
}

function isDbSkeJson(o: Record<string, unknown>): boolean {
  return Array.isArray(o.armature) && (o.armature as unknown[]).length > 0 && !isSpineSkeletonJson(o)
}

function isDbTexJson(o: Record<string, unknown>): boolean {
  if (isSpineSkeletonJson(o) || isDbSkeJson(o)) return false
  if (typeof o.imagePath === 'string') return true
  if (Array.isArray(o.SubTexture)) return true
  if (Array.isArray(o.subTexture)) return true
  return false
}

function basename(p: string): string {
  return p.replace(/\\/g, '/').split('/').pop() ?? p
}

function findTextureFile(files: File[], texObj: Record<string, unknown>, texFile: File): File | undefined {
  const want = new Set<string>()
  const ip = texObj.imagePath
  if (typeof ip === 'string' && ip.length) {
    want.add(basename(ip).toLowerCase())
  }
  const stem = texFile.name.replace(/\.json$/i, '')
  for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
    want.add(`${stem}${ext}`.toLowerCase())
  }
  const altStem = stem.replace(/_tex$/i, '')
  if (altStem !== stem) {
    for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
      want.add(`${altStem}${ext}`.toLowerCase())
    }
  }
  for (const f of files) {
    if (want.has(f.name.toLowerCase())) return f
  }
  const imgs = files.filter((f) => /\.(png|jpe?g|webp)$/i.test(f.name))
  if (imgs.length === 1) return imgs[0]
  return undefined
}

export interface DbArmatureBuilt {
  display: DbPixiArmatureDisplay
  /** parseDragonBonesData 的缓存名 */
  dragonBonesDataName: string
  /** buildArmatureDisplay 使用的骨架名 */
  armatureName: string
  importResult: ImportResult
}

/**
 * 若文件集合不构成 DragonBones 包，返回 null（非错误）。
 * 若构成但不完整/解析失败，抛出 Error。
 */
export async function tryLoadDragonBonesArmature(files: File[]): Promise<DbArmatureBuilt | null> {
  if (files.length < 2) return null

  const jsonFiles = files.filter((f) => f.name.toLowerCase().endsWith('.json'))
  if (jsonFiles.length < 1) return null

  let skeFile: File | undefined
  let skeObj: Record<string, unknown> | undefined
  let texFile: File | undefined
  let texObj: Record<string, unknown> | undefined

  for (const f of jsonFiles) {
    let text: string
    try {
      text = await f.text()
    } catch {
      continue
    }
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      continue
    }
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    if (isDbSkeJson(o)) {
      skeFile = f
      skeObj = o
      continue
    }
    if (isDbTexJson(o)) {
      texFile = f
      texObj = o
    }
  }

   if (!skeFile || !skeObj || !texFile || !texObj) return null

  const texImage = findTextureFile(files, texObj, texFile)
  if (!texImage) {
    throw new Error(
      `DragonBones：未找到图集贴图。请与「${texFile.name}」同一批选择 PNG/WebP（或与 imagePath 同名文件）。`,
    )
  }

  const { PIXI } = await ensureDragonBonesPixiEnv()
  const dragonBones = getDragonBones()
  const factory = dragonBones.PixiFactory.factory
  factory.clear(true)

  const bitmap = await createImageBitmap(texImage)
  const baseTexture = PIXI.BaseTexture.from(bitmap)

  try {
    const atlasCacheName = texFile.name.replace(/\.json$/i, '')
    factory.parseTextureAtlasData(texObj, baseTexture, atlasCacheName, 1)

    const dbDataName = skeFile.name.replace(/\.json$/i, '')
    const dbData = factory.parseDragonBonesData(skeObj, dbDataName, 1)
    if (!dbData) {
      throw new Error(`DragonBones：无法解析骨架 JSON「${skeFile.name}」。`)
    }

    /** 工厂里 `DragonBonesData` 的缓存键是 parse 时传入的 `name`（此处 = 文件名 stem），不是 JSON 里的 `dbData.name` */
    const armaturesRaw = (skeObj.armature as unknown[]).filter((x) => x && typeof x === 'object')
    const armatureNames = armaturesRaw
      .map((a) => (a as Record<string, unknown>).name)
      .filter((n): n is string => typeof n === 'string')
    if (armatureNames.length === 0) {
      armatureNames.push('Armature')
    }

    const tryDisplay = (
      armName: string,
      dataKey: string,
      atlasKey: string,
    ): DbPixiArmatureDisplay | null => {
      const a1 = factory.buildArmatureDisplay(armName, dataKey, '', atlasKey)
      if (a1) return a1
      const a2 = factory.buildArmatureDisplay(armName, dataKey, '', '')
      if (a2) return a2
      return null
    }

    let display: DbPixiArmatureDisplay | null = null
    let armatureName = armatureNames[0]!
    for (const armName of armatureNames) {
      display = tryDisplay(armName, dbDataName, atlasCacheName)
      if (display) {
        armatureName = armName
        break
      }
    }
    if (!display) {
      for (const armName of armatureNames) {
        display = tryDisplay(armName, '', atlasCacheName) || tryDisplay(armName, '', '')
        if (display) {
          armatureName = armName
          break
        }
      }
    }
    if (!display) {
      throw new Error(
        `DragonBones：buildArmatureDisplay 失败。请确认 skeleton 中 armature 名与导出一致；数据缓存名：「${dbDataName}」；尝试过的骨架名：${armatureNames.join(', ')}。`,
      )
    }

    const importResult = parseDragonBonesJson(skeObj, skeFile.name)
    importResult.versionHint = importResult.versionHint
      ? `${importResult.versionHint} · 已加载贴图`
      : 'DragonBones · 已加载贴图'

    return { display, dragonBonesDataName: dbDataName, armatureName, importResult }
  } catch (e) {
    baseTexture.destroy()
    factory.clear(true)
    throw e
  }
}
