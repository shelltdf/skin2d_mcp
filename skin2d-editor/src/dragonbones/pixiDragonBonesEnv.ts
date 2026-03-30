import * as PIXI from 'pixi.js'
import { settings } from '@pixi/settings'

/** UMD 包，无 ES module 类型导出 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dragonBonesMod: any = null

/** dragonbones.js 依赖全局 PIXI 与 TARGET_FPMS（与官方示例一致） */
export async function ensureDragonBonesPixiEnv(): Promise<{ PIXI: typeof PIXI; dragonBones: any }> {
  ;(globalThis as unknown as { PIXI: typeof PIXI }).PIXI = PIXI
  if (settings.TARGET_FPMS == null) {
    ;(settings as unknown as { TARGET_FPMS: number }).TARGET_FPMS = 0.06
  }
  if (!dragonBonesMod) {
    const mod = await import('dragonbones.js')
    dragonBonesMod = (mod as { default?: unknown }).default ?? mod
  }
  return { PIXI, dragonBones: dragonBonesMod }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDragonBones(): any {
  if (!dragonBonesMod) {
    throw new Error('DragonBones：请先调用 ensureDragonBonesPixiEnv()')
  }
  return dragonBonesMod
}
