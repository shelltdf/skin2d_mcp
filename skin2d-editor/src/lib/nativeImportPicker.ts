/**
 * 使用 File System Access API（Chromium）按导入类型分别记住「上次打开位置」：
 * `showOpenFilePicker({ id })` 中不同 id 会复用各自上次目录。
 * 不支持时由调用方回退到多个独立 `<input type="file">`（多数浏览器会按控件分别记忆路径）。
 */

/** 与 DOM File System Access 对齐的取名（部分 TS lib 未包含） */
type FilePickerAcceptType = {
  description?: string
  accept: Record<string, string | string[]>
}

type OpenFilePickerOptions = {
  excludeAcceptAllOption?: boolean
  id?: string
  multiple?: boolean
  types?: FilePickerAcceptType[]
}

export type ImportPickerKind = 'any' | 'spine' | 'live2dZip' | 'dragonbones' | 'gltf'

const PICKER_ID: Record<ImportPickerKind, string> = {
  any: 'skin2d-import-any',
  spine: 'skin2d-import-spine',
  live2dZip: 'skin2d-import-live2d-zip',
  dragonbones: 'skin2d-import-dragonbones',
  gltf: 'skin2d-import-gltf',
}

function typesFor(kind: ImportPickerKind): FilePickerAcceptType[] {
  switch (kind) {
    case 'spine':
      return [
        {
          description: 'Spine',
          accept: {
            'application/json': ['.json'],
            'text/plain': ['.atlas'],
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/webp': ['.webp'],
          },
        },
      ]
    case 'live2dZip':
      return [
        {
          description: 'Live2D zip',
          accept: {
            'application/zip': ['.zip'],
            'application/x-zip-compressed': ['.zip'],
          },
        },
      ]
    case 'dragonbones':
      return [
        {
          description: 'DragonBones',
          accept: {
            'application/json': ['.json'],
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/webp': ['.webp'],
          },
        },
      ]
    case 'gltf':
      return [
        {
          description: 'glTF',
          accept: {
            'model/gltf-binary': ['.glb'],
            'model/gltf+json': ['.gltf'],
          },
        },
      ]
    case 'any':
    default:
      return [
        {
          description: 'Skin2D import',
          accept: {
            'application/json': ['.json'],
            'application/zip': ['.zip'],
            'application/octet-stream': ['.moc3'],
            'model/gltf-binary': ['.glb'],
            'model/gltf+json': ['.gltf'],
            'text/plain': ['.atlas'],
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/webp': ['.webp'],
          },
        },
      ]
  }
}

export type NativeImportPickResult =
  | { outcome: 'picked'; files: File[] }
  | { outcome: 'cancelled' }
  | { outcome: 'fallback' }

/**
 * 在支持 `showOpenFilePicker` 的环境尝试原生选择；否则返回 `fallback`。
 * 用户取消对话框返回 `cancelled`（勿再弹出备用 input）。
 */
export async function tryPickImportFiles(kind: ImportPickerKind): Promise<NativeImportPickResult> {
  const g = globalThis as unknown as Window & {
    showOpenFilePicker?: (opt?: OpenFilePickerOptions) => Promise<Array<{ getFile: () => Promise<File> }>>
  }
  if (typeof g.showOpenFilePicker !== 'function') {
    return { outcome: 'fallback' }
  }

  const multiple = kind !== 'live2dZip' && kind !== 'gltf'

  try {
    const handles = await g.showOpenFilePicker({
      id: PICKER_ID[kind],
      multiple,
      types: typesFor(kind),
      excludeAcceptAllOption: false,
    })
    const files = await Promise.all(handles.map((h) => h.getFile()))
    return { outcome: 'picked', files }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { outcome: 'cancelled' }
    }
    console.warn('[import] showOpenFilePicker failed, falling back to <input type=file>', e)
    return { outcome: 'fallback' }
  }
}
