import type { ImportResult } from './types'
import { emptyResult } from './types'

/** 已知非 JSON 骨架的扩展名，给出可读提示（避免对图片做 JSON.parse 产生乱码报错） */
export function rejectKnownNonJsonFile(file: File): ImportResult | null {
  const name = file.name
  const lower = name.toLowerCase()

  if (/\.(png|jpe?g|gif|webp|bmp|ico|tga)$/i.test(lower)) {
    return emptyResult([
      `已选择图片「${name}」，不能作为骨架 JSON 解析。请选择 Spine 导出的 *.json，或一次多选 JSON + .atlas + 贴图。`,
    ])
  }

  if (lower.endsWith('.atlas')) {
    return emptyResult([
      `已选择图集「${name}」，不能单独导入。请一次多选 skeleton 的 .json、.atlas 与贴图文件。`,
    ])
  }

  if (lower.endsWith('.skel') || lower.endsWith('.bytes')) {
    return emptyResult([
      `「${name}」为 Spine 二进制骨架，当前仅支持 JSON 文本导出。请在 Spine 中导出 JSON。`,
    ])
  }

  if (lower.endsWith('.moc3') || lower.endsWith('.moc')) {
    return emptyResult([
      `「${name}」为 Live2D 模型二进制（.moc3 / .moc），不能单独当 JSON 打开。请导入 ***.model3.json**（可与贴图、.moc3 同次多选，后续版本将支持运行时加载）。`,
    ])
  }

  return null
}

/** 在 JSON.parse 前检查：合法 JSON 文本通常以 { 或 [ 开头（去 BOM 后） */
export function assertTextLooksLikeJson(text: string, fileName: string): string | null {
  const t = text.replace(/^\uFEFF/, '').trimStart()
  if (t.length === 0) {
    return `文件「${fileName}」为空。`
  }
  const c0 = t[0]
  if (c0 !== '{' && c0 !== '[') {
    return `「${fileName}」内容不是 JSON 文本（应以 { 或 [ 开头）。常见原因：误选了二进制文件、或文件已损坏。`
  }
  return null
}
