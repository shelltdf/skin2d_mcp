import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { ImportResult } from '../importers/types'
import { extractLive2dMetaFromZip } from '../live2d/extractZipModel3'
import { Live2DModel, ZipLoader } from '../live2d/pixiCubism4'
import { ensurePixiLive2dZipLoader } from '../live2d/registerPixiZipLoader'
import { useAppLogStore } from './appLog'
import { useEditorStore } from './editor'
import { useUiSettingsStore } from './uiSettings'

export type Live2dMotionOption = { id: string; label: string }

type Live2dModelInstance = InstanceType<typeof Live2DModel>

/** Cubism / pixi-live2d-display 内部队列条目（仅时间轴同步用） */
interface MotionQueueEntryInternal {
  _motion?: { getDuration: () => number; getLoopDuration: () => number }
  isFinished: () => boolean
  getStartTime: () => number
  setStartTime: (t: number) => void
  setFadeInStartTime: (t: number) => void
}

function buildMotionOptions(definitions: Record<string, { File?: string }[] | undefined> | undefined): Live2dMotionOption[] {
  const out: Live2dMotionOption[] = []
  if (!definitions) return out
  for (const group of Object.keys(definitions)) {
    const arr = definitions[group]
    const n = arr?.length ?? 0
    for (let i = 0; i < n; i++) {
      const file = arr![i]?.File ?? `${i}`
      const base = file.split(/[/\\]/).pop() ?? file
      out.push({ id: `${group}:${i}`, label: `${group} · ${base}` })
    }
  }
  return out
}

export const useLive2dRuntimeStore = defineStore('live2dRuntime', () => {
  const pendingZip = shallowRef<File | null>(null)
  const ready = ref(false)
  const loadError = ref<string | null>(null)
  const previewImport = shallowRef<ImportResult | null>(null)
  const live2dModel = shallowRef<Live2dModelInstance | null>(null)
  const motionOptions = ref<Live2dMotionOption[]>([])
  const currentMotionId = ref<string | null>(null)
  const playing = ref(false)
  const currentTime = ref(0)
  const currentDuration = ref(0)

  let pixiApp: import('pixi.js').Application | null = null
  let resizeObs: ResizeObserver | null = null
  let timelineTickerCb: (() => void) | null = null
  // 世界网格在 model 前（角色后）；原点短线与同 scale，viewRoot 最前子节点（每帧置顶）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let gridG: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let originG: any = null
  // Drawable 三角网格线框（与模型同 pivot/scale；Live2DModel 不渲染子节点故不能挂在 model 下）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let boneOverlayG: any = null
  let live2dShowBoneWire = false
  /** 与 fit 同步的视口平移/缩放（像素偏移 + 倍数），供 Live2D 层绑定鼠标 */
  const live2dPanX = ref(0)
  const live2dPanY = ref(0)
  const live2dZoomMul = ref(1)
  /** `fit` 内根据画布与模型尺寸算出的基础缩放（不含用户 zoom 倍率），供滚轮「绕光标缩放」与 Spine 视口语义对齐 */
  const live2dFitBaseScale = ref(1)
  let live2dContainerEl: HTMLElement | null = null
  let relayoutLive2d: (() => void) | null = null

  const showViewport = computed(() => pendingZip.value !== null || ready.value)

  function stopTimelineTicker() {
    if (pixiApp && timelineTickerCb) {
      pixiApp.ticker.remove(timelineTickerCb)
    }
    timelineTickerCb = null
  }

  function syncBoneOverlayTransform(model: Live2dModelInstance) {
    if (!boneOverlayG || !model) return
    boneOverlayG.position.copyFrom(model.position)
    boneOverlayG.scale.copyFrom(model.scale)
    boneOverlayG.pivot.copyFrom(model.pivot)
  }

  function ensureLive2dWorldGridDrawn() {
    if (!gridG || !originG) return
    const R = 1200
    gridG.clear()
    for (let i = -R; i <= R; i++) {
      const major = i % 10 === 0
      gridG.lineStyle(major ? 2 : 1, major ? 0x0067c0 : 0x000000, major ? 0.25 : 0.12)
      gridG.moveTo(i, -R)
      gridG.lineTo(i, R)
    }
    for (let j = -R; j <= R; j++) {
      const major = j % 10 === 0
      gridG.lineStyle(major ? 2 : 1, major ? 0x0067c0 : 0x000000, major ? 0.25 : 0.12)
      gridG.moveTo(-R, j)
      gridG.lineTo(R, j)
    }
    originG.clear()
    originG.lineStyle(2, 0xdc3545, 0.95)
    originG.moveTo(0, 0)
    originG.lineTo(1, 0)
    originG.lineStyle(2, 0x2ea040, 0.95)
    originG.moveTo(0, 0)
    originG.lineTo(0, 1)
  }

  function setWorldOverlayVisible(showGrid: boolean, showOrigin: boolean) {
    if (!pixiApp) return
    ensureLive2dWorldGridDrawn()
    if (gridG) gridG.visible = showGrid
    if (originG) originG.visible = showOrigin
  }

  /** CubismModel（coreModel）：drawable 元数据与索引；顶点需用 InternalModel.getDrawableVertices 才含 pixelsPerUnit/居中变换 */
  type Live2dCubismCoreWire = {
    getDrawableCount: () => number
    getDrawableDynamicFlagIsVisible: (i: number) => boolean
    getDrawableVertexCount: (i: number) => number
    getDrawableVertexIndexCount: (i: number) => number
    getDrawableVertexIndices: (i: number) => ArrayLike<number> | undefined
  }

  type Live2dInternalForWire = {
    coreModel: unknown
    getDrawableVertices: (i: number) => ArrayLike<number>
  }

  function redrawLive2dDrawableWireframe() {
    if (!boneOverlayG || !live2dModel.value) return
    const model = live2dModel.value
    const im = model.internalModel as unknown as Live2dInternalForWire
    const core = im.coreModel as Live2dCubismCoreWire
    boneOverlayG.clear()
    syncBoneOverlayTransform(model)
    if (!live2dShowBoneWire) {
      boneOverlayG.visible = false
      return
    }
    if (typeof core.getDrawableCount !== 'function') {
      boneOverlayG.visible = false
      return
    }
    boneOverlayG.visible = true
    boneOverlayG.lineStyle(1, 0x00a6ff, 0.55)
    const n = core.getDrawableCount()
    for (let i = 0; i < n; i++) {
      if (!core.getDrawableDynamicFlagIsVisible(i)) continue
      const vc = core.getDrawableVertexCount(i)
      const verts = im.getDrawableVertices(i)
      const ic = core.getDrawableVertexIndexCount(i)
      const indices = core.getDrawableVertexIndices(i)
      if (!verts || !indices || vc < 2 || ic < 3) continue
      for (let t = 0; t < ic; t += 3) {
        const ia = indices[t] as number
        const ib = indices[t + 1] as number
        const ic2 = indices[t + 2] as number
        if (ia >= vc || ib >= vc || ic2 >= vc) continue
        const x0 = verts[ia * 2] as number
        const y0 = verts[ia * 2 + 1] as number
        const x1 = verts[ib * 2] as number
        const y1 = verts[ib * 2 + 1] as number
        const x2 = verts[ic2 * 2] as number
        const y2 = verts[ic2 * 2 + 1] as number
        boneOverlayG.moveTo(x0, y0)
        boneOverlayG.lineTo(x1, y1)
        boneOverlayG.lineTo(x2, y2)
        boneOverlayG.lineTo(x0, y0)
      }
    }
  }

  /** 与 `viewportDisplay` 对齐：贴图 = Cubism 主绘制；骨骼 = 各 drawable 三角网格线框 */
  function applyLive2dViewportDisplay(textureVisible: boolean, boneWireVisible: boolean) {
    live2dShowBoneWire = boneWireVisible
    const m = live2dModel.value
    if (m) {
      m.renderable = textureVisible
    }
    redrawLive2dDrawableWireframe()
  }

  function syncMotionTimeline() {
    const model = live2dModel.value as unknown as {
      autoUpdate: boolean
      elapsedTime: number
      internalModel?: {
        motionManager?: {
          state?: { currentGroup?: string; currentIndex?: number }
          queueManager?: { _motions?: Array<MotionQueueEntryInternal | null | undefined> }
        }
      }
    } | null
    if (!model?.internalModel?.motionManager) return
    playing.value = model.autoUpdate
    const mm = model.internalModel.motionManager
    const state = mm.state
    if (state?.currentGroup != null && state.currentIndex != null) {
      const id = `${state.currentGroup}:${state.currentIndex}`
      if (motionOptions.value.some((o) => o.id === id)) {
        currentMotionId.value = id
      }
    }
    const qm = mm.queueManager
    const rawMotions = qm?._motions
    const entry = rawMotions?.find((m) => m && m._motion && !m.isFinished())
    const nowSec = model.elapsedTime / 1000
    if (!entry?._motion) {
      currentTime.value = 0
      currentDuration.value = 0
      return
    }
    const motion = entry._motion
    const dur = typeof motion.getDuration === 'function' ? motion.getDuration() : -1
    const loopDur = typeof motion.getLoopDuration === 'function' ? motion.getLoopDuration() : -1
    let D = dur > 0 ? dur : loopDur > 0 ? loopDur : 0
    currentDuration.value = D
    let localT = nowSec - entry.getStartTime()
    if (D > 0) {
      if (dur > 0) {
        localT = Math.max(0, Math.min(localT, D))
      } else if (loopDur > 0) {
        localT = localT % loopDur
      }
    } else {
      currentDuration.value = 0
      localT = 0
    }
    currentTime.value = localT
  }

  function dispose() {
    stopTimelineTicker()
    resizeObs?.disconnect()
    resizeObs = null
    relayoutLive2d = null
    live2dContainerEl = null
    live2dPanX.value = 0
    live2dPanY.value = 0
    live2dZoomMul.value = 1
    live2dFitBaseScale.value = 1
    gridG = null
    originG = null
    boneOverlayG = null
    live2dShowBoneWire = false
    live2dModel.value = null
    motionOptions.value = []
    currentMotionId.value = null
    playing.value = false
    currentTime.value = 0
    currentDuration.value = 0
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
            '未检测到 Live2DCubismCore。请确认已加载 public/vendor/live2dcubismcore.min.js（见 index.html，需与官方 Cubism SDK 许可一致）。',
            'Live2DCubismCore not found. Ensure public/vendor/live2dcubismcore.min.js is loaded (see index.html; follow Live2D license).',
          ),
        )
      }

      const PIXI = await import('pixi.js')
      ensurePixiLive2dZipLoader(ZipLoader)
      ;(window as unknown as { PIXI: typeof PIXI }).PIXI = PIXI
      Live2DModel.registerTicker(PIXI.Ticker)

      const w = Math.max(320, container.clientWidth)
      const h = Math.max(240, container.clientHeight)

      const app = new PIXI.Application({
        width: w,
        height: h,
        backgroundColor: 0xececec,
        /** 透明清空；网格在 model 下，原点在 viewRoot 最前（与 Spine 语义一致） */
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })
      const canvas = app.view as HTMLCanvasElement
      canvas.style.display = 'block'
      canvas.style.background = 'transparent'
      container.appendChild(canvas)
      pixiApp = app
      live2dContainerEl = container

      const viewRoot = new PIXI.Container()
      app.stage.addChild(viewRoot)

      gridG = new PIXI.Graphics()
      originG = new PIXI.Graphics()
      viewRoot.addChild(gridG)

      const model = await Live2DModel.from([zipFile], { autoInteract: true })
      viewRoot.addChild(model)
      model.anchor.set(0.5, 0.5)
      model.position.set(0, 0)

      boneOverlayG = new PIXI.Graphics()
      boneOverlayG.interactive = false
      boneOverlayG.interactiveChildren = false
      viewRoot.addChild(boneOverlayG)
      viewRoot.addChild(originG)

      live2dModel.value = model
      const defs = (model as unknown as { internalModel?: { motionManager?: { definitions?: Record<string, { File?: string }[]> } } })
        .internalModel?.motionManager?.definitions
      motionOptions.value = buildMotionOptions(defs)
      currentMotionId.value = motionOptions.value[0]?.id ?? null

      stopTimelineTicker()
      timelineTickerCb = () => {
        syncMotionTimeline()
        redrawLive2dDrawableWireframe()
        if (originG?.parent === viewRoot) {
          viewRoot.setChildIndex(originG, viewRoot.children.length - 1)
        }
      }
      app.ticker.add(timelineTickerCb)

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
        live2dFitBaseScale.value = fitBaseScale
        model.scale.set(s)
        if (gridG) gridG.scale.set(s)
        if (originG) originG.scale.set(s)
        syncBoneOverlayTransform(model)
        if (originG?.parent === viewRoot) {
          viewRoot.setChildIndex(originG, viewRoot.children.length - 1)
        }
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
      stopTimelineTicker()
      resizeObs?.disconnect()
      resizeObs = null
      relayoutLive2d = null
      live2dContainerEl = null
      live2dFitBaseScale.value = 1
      gridG = null
      originG = null
      boneOverlayG = null
      live2dModel.value = null
      motionOptions.value = []
      currentMotionId.value = null
      playing.value = false
      currentTime.value = 0
      currentDuration.value = 0
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

  /**
   * 滚轮缩放：与 Spine 视口一致，在 **光标下保持模型局部点**（相对模型中心的归一化偏移）不变，
   * 避免「只绕视口中心缩放」带来的非世界系手感。
   */
  function live2dOnWheel(e: WheelEvent) {
    if (!relayoutLive2d || !live2dContainerEl) return
    const host = live2dContainerEl
    const rect = host.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const cw = Math.max(320, host.clientWidth)
    const ch = Math.max(240, host.clientHeight)

    const oldZoom = live2dZoomMul.value
    const zoomIntensity = 0.0015
    const delta = -e.deltaY * zoomIntensity
    const factor = Math.exp(delta)
    const newZoom = Math.min(8, Math.max(0.08, oldZoom * factor))
    if (Math.abs(newZoom - oldZoom) < 1e-9) return

    const fb = live2dFitBaseScale.value
    const s0 = fb * oldZoom
    const s1 = fb * newZoom

    const vx = cw / 2 + live2dPanX.value
    const vy = ch / 2 + live2dPanY.value
    const lx = (mx - vx) / s0
    const ly = (my - vy) / s0

    live2dZoomMul.value = newZoom
    live2dPanX.value = mx - lx * s1 - cw / 2
    live2dPanY.value = my - ly * s1 - ch / 2
    relayoutLive2d()
  }

  /**
   * 中键平移：与 Spine `cameraCx -= dx / viewScale` 等价，屏幕位移 1:1；
   * 累积量 `live2dPanX/Y` 为视口根节点相对画布中心的 **屏幕像素** 偏移（非 Cubism 逻辑单位）。
   */
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

  function togglePlay() {
    const m = live2dModel.value
    if (!m) return
    m.autoUpdate = !m.autoUpdate
    playing.value = m.autoUpdate
  }

  async function setMotion(id: string, doPlay = true) {
    const model = live2dModel.value
    if (!model) return
    const opt = motionOptions.value.find((o) => o.id === id)
    if (!opt) return
    currentMotionId.value = id
    if (doPlay) model.autoUpdate = true
    const colon = id.indexOf(':')
    if (colon < 0) return
    const group = id.slice(0, colon)
    const index = Number(id.slice(colon + 1))
    if (!group || !Number.isFinite(index)) return
    await model.motion(group, index)
  }

  function seek(sec: number) {
    const model = live2dModel.value as unknown as {
      elapsedTime: number
      internalModel?: { motionManager?: { queueManager?: { _motions?: Array<MotionQueueEntryInternal | null | undefined> } } }
    } | null
    if (!model?.internalModel?.motionManager) return
    const qm = model.internalModel.motionManager.queueManager
    const rawMotions = qm?._motions
    const entry = rawMotions?.find((m) => m && m._motion && !m.isFinished())
    if (!entry?._motion) return
    const motion = entry._motion
    const dur = motion.getDuration()
    const loopDur = motion.getLoopDuration()
    const D = dur > 0 ? dur : loopDur > 0 ? loopDur : 0
    if (D <= 0) return
    const nowSec = model.elapsedTime / 1000
    let clamped = sec
    if (dur > 0) {
      clamped = Math.max(0, Math.min(sec, D - 1e-4))
    } else if (loopDur > 0) {
      const x = sec % loopDur
      clamped = x < 0 ? x + loopDur : x
    }
    entry.setStartTime(nowSec - clamped)
    entry.setFadeInStartTime(nowSec)
  }

  return {
    pendingZip,
    ready,
    loadError,
    previewImport,
    showViewport,
    live2dZoomMul,
    motionOptions,
    currentMotionId,
    playing,
    currentTime,
    currentDuration,
    dispose,
    queueZip,
    mountInto,
    live2dOnWheel,
    live2dOnPanDelta,
    live2dResetView,
    setWorldOverlayVisible,
    togglePlay,
    setMotion,
    seek,
    applyLive2dViewportDisplay,
  }
})
