import JSZip from 'jszip'
import type { ImportResult } from '../importers/types'
import { emptyResult } from '../importers/types'
import { isLive2dModel3Json, parseLive2dModel3 } from '../importers/live2d'

/** 从 zip 中读取首个 .model3.json 并生成 ImportResult（用于属性面板） */
export async function extractLive2dMetaFromZip(file: File): Promise<ImportResult> {
  try {
    const zip = await JSZip.loadAsync(file)
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir)
    const modelPath = paths.find((n) => n.toLowerCase().endsWith('.model3.json'))
    if (!modelPath) {
      return emptyResult([
        'Zip 内未找到 .model3.json。请将模型目录打包为 zip（含 .moc3、贴图与 model3.json）。',
      ])
    }
    const text = await zip.file(modelPath)?.async('string')
    if (!text) {
      return emptyResult([`无法读取「${modelPath}」。`])
    }
    let obj: unknown
    try {
      obj = JSON.parse(text)
    } catch {
      return emptyResult([`「${modelPath}」不是合法 JSON。`])
    }
    if (!isLive2dModel3Json(obj, modelPath)) {
      return emptyResult([`「${modelPath}」不是 Live2D model3 描述。`])
    }
    const base = parseLive2dModel3(obj, modelPath.split(/[/\\]/).pop() ?? modelPath)
    return {
      ...base,
      warnings: ['已从 zip 读取模型描述，正在加载 Cubism 预览…'],
    }
  } catch (e) {
    return emptyResult([
      `解析 zip 失败：${e instanceof Error ? e.message : String(e)}`,
    ])
  }
}
