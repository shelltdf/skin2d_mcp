import type JSZip from 'jszip'

function norm(p: string): string {
  return p.replace(/\\/g, '/')
}

/** model3.json 所在 zip 路径 + FileReferences 内相对路径 → zip 内绝对键 */
function joinZipRelative(modelPath: string, relative: string): string {
  const m = norm(modelPath)
  const dir = m.includes('/') ? m.slice(0, m.lastIndexOf('/') + 1) : ''
  const r = norm(relative).replace(/^\.\//, '')
  return dir + r
}

/**
 * 从 zip 中读取 cdi3.json（优先 FileReferences.DisplayInfo，否则同目录下 *.cdi3.json），
 * 统计参数与部件数（Cubism 无 Spine 式骨骼树，此项对应显示信息）。
 */
export async function tryGetLive2dCdi3Counts(
  zip: JSZip,
  modelPath: string,
  modelRoot: Record<string, unknown>,
): Promise<{ live2dParameterCount: number; live2dPartCount: number } | null> {
  const fr = modelRoot.FileReferences ?? modelRoot.fileReferences
  const pathsToTry: string[] = []

  if (fr && typeof fr === 'object') {
    const di =
      (fr as { DisplayInfo?: string; displayInfo?: string }).DisplayInfo ??
      (fr as { displayInfo?: string }).displayInfo
    if (typeof di === 'string' && di.trim().length) {
      pathsToTry.push(joinZipRelative(modelPath, di))
    }
  }

  const modelNorm = norm(modelPath)
  const folder =
    modelNorm.includes('/') ? modelNorm.slice(0, modelNorm.lastIndexOf('/') + 1) : ''

  const allCdi = Object.keys(zip.files).filter(
    (p) => !zip.files[p].dir && norm(p).toLowerCase().endsWith('.cdi3.json'),
  )
  for (const p of allCdi) {
    const np = norm(p)
    if (!folder || np.startsWith(folder)) pathsToTry.push(np)
  }

  const seen = new Set<string>()
  for (const path of pathsToTry) {
    if (seen.has(path)) continue
    seen.add(path)
    const raw = await zip.file(path)?.async('string')
    if (!raw) continue
    let o: unknown
    try {
      o = JSON.parse(raw)
    } catch {
      continue
    }
    if (!o || typeof o !== 'object') continue
    const v = o as { Version?: unknown; Parameters?: unknown[]; Parts?: unknown[] }
    if (typeof v.Version !== 'number' || !Array.isArray(v.Parts)) continue

    const live2dParameterCount = Array.isArray(v.Parameters) ? v.Parameters.length : 0
    const live2dPartCount = v.Parts.length
    return { live2dParameterCount, live2dPartCount }
  }
  return null
}
