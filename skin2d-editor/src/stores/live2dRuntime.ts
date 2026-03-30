import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { ImportResult } from '../importers/types'
import { extractLive2dMetaFromZip } from '../live2d/extractZipModel3'
import { useAppLogStore } from './appLog'
import { useEditorStore } from './editor'
import { useUiSettingsStore } from './uiSettings'
export const useLive2dRuntimeStore = defineStore('live2dRuntime', () => {
  const pendingZip = shallowRef<File | null>(null)
  const ready = ref(false)
  const loadError = ref<string | null>(null)
  const previewImport = shallowRef<ImportResult | null>(null)

  let pixiApp: import('pixi.js').Application | null = null
  let resizeObs: ResizeObserver | null = null

  const showViewport = computed(() => pendingZip.value !== null || ready.value)

  function dispose() {
    resizeObs?.disconnect()
    resizeObs = null
    try {
      pixiApp?.destroy(true, { children: true, texture: true })
    } catch {
      /* ignore */
    }
    pixiApp = null
    pendingZip.value = null
    ready.value = false
    loadError.value = null
    previewImport.value = null
  }

  /** 选择 zip 后：解析元数据、排队待挂载 */
  async function queueZip(file: File): Promise<void> {
    dispose()
    loadError.value = null
    const appLog = useAppLogStore()
    const ui = useUiSettingsStore()
    const t = ui.t
    const meta = await extractLive2dMetaFromZip(file)
    if (meta.formatId !== 'live2d') {
      loadError.value = meta.warnings[0] ?? t('无法从 zip 识别 Live2D 模型', 'Unable to recognize Live2D model from zip')
      previewImport.value = meta
      appLog.warn(t('Live2D zip 未识别为模型', 'Live2D zip not recognized'), loadError.value)
      return
    }
    previewImport.value = meta
    pendingZip.value = file
    appLog.info(t('Live2D zip 元数据已解析', 'Live2D zip metadata parsed'), file.name)
  }

  /** 挂载 WebGL 视口并加载 zip 内模型（pixi-live2d-display ZipLoader） */
  async function mountInto(container: HTMLElement): Promise<void> {
    if (!pendingZip.value) return
    const zipFile = pendingZip.value
    loadError.value = null
    const appLog = useAppLogStore()
    const ui = useUiSettingsStore()
    const t = ui.t

    try {
      if (typeof (window as unknown as { Live2DCubismCore?: unknown }).Live2DCubismCore === 'undefined') {
        throw new Error(
          t(
            '未检测到 Live2DCubismCore。请在 index.html 中引入 Cubism Core 脚本（见官方 Cubism SDK for Web）。',
            'Live2DCubismCore not found. Include Cubism Core script in index.html (Cubism SDK for Web).',
          ),
        )
      }

      const PIXI = await import('pixi.js')
      const { Live2DModel } = await import('pixi-live2d-display/cubism4')
      ;(window as unknown as { PIXI: typeof PIXI }).PIXI = PIXI
      Live2DModel.registerTicker(PIXI.Ticker)

      const w = Math.max(320, container.clientWidth)
      const h = Math.max(240, container.clientHeight)

      const app = new PIXI.Application({
        width: w,
        height: h,
        backgroundColor: 0xececec,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })
      container.appendChild(app.view as HTMLCanvasElement)
      pixiApp = app

      const model = await Live2DModel.from([zipFile], { autoInteract: false })
      app.stage.addChild(model)

      function fit() {
        const cw = Math.max(320, container.clientWidth)
        const ch = Math.max(240, container.clientHeight)
        app.renderer.resize(cw, ch)
        const bw = model.width || 1
        const bh = model.height || 1
        const pad = 0.88
        const s = Math.min((cw * pad) / bw, (ch * pad) / bh, 4)
        model.scale.set(s)
        model.anchor.set(0.5, 0.5)
        model.position.set(cw / 2, ch / 2)
      }
      fit()

      resizeObs = new ResizeObserver(() => fit())
      resizeObs.observe(container)

      pendingZip.value = null
      ready.value = true

      const name = (model as unknown as { internalModel?: { settings?: { name?: string } } })
        .internalModel?.settings?.name
      if (previewImport.value) {
        previewImport.value = {
          ...previewImport.value,
          skeletonName: name ?? previewImport.value.skeletonName,
          warnings: [t('Live2D 预览已就绪（Cubism 4 + pixi-live2d-display）。', 'Live2D preview ready (Cubism 4 + pixi-live2d-display).')],
        }
      }
      const ed = useEditorStore()
      if (previewImport.value) {
        ed.setImportResult(ed.lastFileName, previewImport.value, null)
      }
      appLog.info(
        t('Live2D 预览加载成功', 'Live2D preview loaded'),
        (name ?? previewImport.value?.skeletonName) ?? zipFile.name,
      )
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : String(e)
      pendingZip.value = null
      ready.value = false
      try {
        pixiApp?.destroy(true, { children: true, texture: true })
      } catch {
        /* ignore */
      }
      pixiApp = null
      const ed = useEditorStore()
      ed.setImportResult(ed.lastFileName, previewImport.value, loadError.value)
      appLog.error(t('Live2D 预览加载失败', 'Live2D preview failed'), loadError.value)
    }
  }

  return {
    pendingZip,
    ready,
    loadError,
    previewImport,
    showViewport,
    dispose,
    queueZip,
    mountInto,
  }
})
