import JSZip from 'jszip'
import { ZipLoader as CubismZipLoader } from './pixiCubism4'

type PixiZipLoader = typeof CubismZipLoader

/**
 * pixi-live2d-display 的 ZipLoader 默认可抛「Not implemented」；
 * 需用 JSZip 实现后方可 Live2DModel.from([zip File]).
 * 在已加载 `./pixiCubism4` 后传入 ZipLoader。
 * @see https://github.com/guansss/pixi-live2d-display/wiki/Additional-Features
 */
let done = false

export function ensurePixiLive2dZipLoader(ZipLoader: PixiZipLoader): void {
  if (done) return
  done = true

  ZipLoader.zipReader = (data: Blob) => JSZip.loadAsync(data)

  ZipLoader.readText = async (zip: JSZip, path: string) => {
    const f = zip.file(path)
    if (!f) throw new Error(`Zip: cannot find file: ${path}`)
    return f.async('text')
  }

  ZipLoader.getFilePaths = async (zip: JSZip) => {
    const paths: string[] = []
    zip.forEach((relativePath, entry) => {
      if (!entry.dir) paths.push(relativePath.replace(/\\/g, '/'))
    })
    return paths
  }

  ZipLoader.getFiles = async (zip: JSZip, paths: string[]) =>
    Promise.all(
      paths.map(async (path) => {
        const entry = zip.file(path)
        if (!entry) throw new Error(`Zip: cannot find file: ${path}`)
        const blob = await entry.async('blob')
        const fileName = path.slice(Math.max(0, path.lastIndexOf('/') + 1))
        return new File([blob], fileName)
      }),
    )

  ZipLoader.releaseReader = () => {
    /* in-memory JSZip */
  }
}
