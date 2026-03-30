import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { ImportResult } from '../importers/types'
import { extractLive2dMetaFromZip } from '../live2d/extractZipModel3'
import { ensurePixiLive2dZipLoader } from '../live2d/registerPixiZipLoader'
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
  /** 与 fit 同步的视口平移/缩放（像素偏移 + 倍数），供 Live2D 层绑定鼠标 */
  const live2dPanX = ref(0)
  const live2dPanY = ref(0)
  const live2dZoomMul = ref(1)
  let relayoutLive2d: (() => void) | null = null

  const showViewport = computed(() => pendingZip.value !== null || ready.value)

  function dispose() {
    resizeObs?.disconnect()
    resizeObs = null
    relayoutLive2d = null
    live2dPanX.value = 0
    live2dPanY.value = 0
    live2dZoomMul.value = 1
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
      const { Live2DModel, ZipLoader } = await import('pixi-live2d-display/cubism4')
      ensurePixiLive2dZipLoader(ZipLoader)
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

      const viewRoot = new PIXI.Container()
      app.stage.addChild(viewRoot)

      const model = await Live2DModel.from([zipFile], { autoInteract: true })
      viewRoot.addChild(model)
      model.anchor.set(0.5, 0.5)
      model.position.set(0, 0)

      live2dPanX.value = 0
      live2dPanY.value = 0
      live2dZoomMul.value = 1

      /** 仅当容器尺寸变化时重算；用 Cubism 逻辑画布尺寸，避免 model.width/height（含 scale + 动画）导致缩放正反馈闪烁 */
      let fitBaseScale = 1
      let lastLayoutCw = 0
      let lastLayoutCh = 0

      function recomputeFitBase(cw: number, ch: number) {
        const im = (model as unknown as { internalModel?: { width?: number; height?: number } })
          .internalModel
        const bw = Math.max(1, im?.width ?? 400)
        const bh = Math.max(1, im?.height ?? 400)
        const pad = 0.88
        fitBaseScale = Math.min((cw * pad) / bw, (ch * pad) / bh, 4)
        lastLayoutCw = cw
        lastLayoutCh = ch
      }

      /**
       * 平移/缩放只动 viewRoot（相机）与 model.scale；model.position 恒为 (0,0)。
       * 这样 focus(屏幕→模型) 的世界矩阵自洽，与中键拖移不再打架，无需关 autoInteract。
       */
      function fit() {
        const cw = Math.max(320, container.clientWidth)
        const ch = Math.max(240, container.clientHeight)
        app.renderer.resize(cw, ch)
        if (cw !== lastLayoutCw || ch !== lastLayoutCh) {
          recomputeFitBase(cw, ch)
        }
        const s = fitBaseScale * live2dZoomMul.value
        model.scale.set(s)
        viewRoot.position.set(cw / 2 + live2dPanX.value, ch / 2 + live2dPanY.value)
      }
      relayoutLive2d = fit
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

  /** 滚轮缩放（强度与 Spine 视口相近）；以模型中心为基准，需在 Live2D 容器上监听 */
  function live2dOnWheel(e: WheelEvent) {
    if (!relayoutLive2d) return
    const zoomIntensity = 0.0015
    const delta = -e.deltaY * zoomIntensity
    const factor = Math.exp(delta)
    live2dZoomMul.value = Math.min(8, Math.max(0.08, live2dZoomMul.value * factor))
    relayoutLive2d()
  }

  function live2dOnPanDelta(dx: number, dy: number) {
    if (!relayoutLive2d) return
    live2dPanX.value += dx
    live2dPanY.value += dy
    relayoutLive2d()
  }

  function live2dResetView() {
    if (!relayoutLive2d) return
    live2dPanX.value = 0
    live2dPanY.value = 0
    live2dZoomMul.value = 1
    relayoutLive2d()
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
    live2dOnWheel,
    live2dOnPanDelta,
    live2dResetView,
  }
})
