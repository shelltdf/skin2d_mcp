/**
 * Cubism4 入口固定为静态导出，避免 dev 下 `import('pixi-live2d-display/cubism4')`
 * 走预构建分块时偶发「Failed to fetch dynamically imported module」.
 */
export { Live2DModel, ZipLoader } from 'pixi-live2d-display/cubism4'
