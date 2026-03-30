import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { DRAW_MODES } from '@pixi/constants'
import { SimpleMesh } from '@pixi/mesh-extras'
import type { UPDATE_PRIORITY } from '@pixi/ticker'
import * as PIXI from 'pixi.js'
import { tryLoadDragonBonesArmature } from '../dragonbones/dbBundleLoader'
import type { DbPixiArmatureDisplay } from '../dragonbones/dbBundleLoader'
import { ensureDragonBonesPixiEnv, getDragonBones } from '../dragonbones/pixiDragonBonesEnv'
import { useAppLogStore } from './appLog'
import { useEditorStore } from './editor'
import { useUiSettingsStore } from './uiSettings'
import { useViewportDisplayStore } from './viewportDisplay'

export const useDragonbonesRuntimeStore = defineStore('dragonbonesRuntime', () => {
  const poseRevision = ref(0)
  const ready = ref(false)
  const playing = ref(true)
  const animationNames = ref<string[]>([])
  const currentAnimation = ref<string | null>(null)
  const loadError = ref<string | null>(null)
  const currentTime = ref(0)
  const loopPlayback = ref(true)

  const armatureDisplay = shallowRef<DbPixiArmatureDisplay | null>(null)
  /** 递增以强制 `DragonBonesViewport` 重新挂载（dispose 会销毁 WebGL） */
  const mountGeneration = ref(0)
  let pixiApp: PIXI.Application | null = null
  let resizeObs: ResizeObserver | null = null
  let relayoutDb: (() => void) | null = null
  let panX = 0
  let panY = 0
  let zoomMul = 1
  /** `mountInto` 中的适配基础缩放（不含用户 zoom 倍率），用于滚轮「绕光标缩放」 */
  let fitBaseScale = 1
  let containerEl: HTMLElement | null = null
  /** 相对适配缩放的滚轮倍数（供 DragonBones 视口 HUD 等展示） */
  const userZoomMul = ref(1)
  let tickerSync: (() => void) | null = null
  // 世界网格在 display 之前（角色后）；原点 originG 在 viewRoot 最前，每帧置顶（不依赖 DOM）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let gridG: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let originG: any = null

  const showViewport = computed(() => armatureDisplay.value !== null)

  function ensureWorldOverlayDrawn() {
    if (!gridG || !originG) return
    // 以 viewRoot 原点为中心：细线步长 1（本地单位）、每 10 条粗线（与 Spine 世界网格语义一致）
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
    // +X 0→1 红、+Y 0→1 绿（与网格同世界单位）；通过 display 之后 addChild 保证在所有对象之上
    originG.lineStyle(2, 0xdc3545, 0.95)
    originG.moveTo(0, 0)
    originG.lineTo(1, 0)
    originG.lineStyle(2, 0x2ea040, 0.95)
    originG.moveTo(0, 0)
    originG.lineTo(0, 1)
  }

  function setWorldOverlayVisible(showGrid: boolean, showOrigin: boolean) {
    ensureWorldOverlayDrawn()
    if (gridG) gridG.visible = showGrid
    if (originG) originG.visible = showOrigin
  }

  /** DragonBones 每帧在 advanceTime/dbUpdate 之后应用视口显示开关（ ticker 优先级低于 NORMAL） */
  function applyDbViewportLayers() {
    const d = armatureDisplay.value as DbPixiArmatureDisplay | null
    if (!d || !ready.value) return

    const vd = useViewportDisplayStore()
    const wantBone = vd.showDragonBonesBoneDebug
    const wantRegion = vd.showDragonBonesRegionWire
    d.debugDraw = wantBone || wantRegion

    const dd = (d as unknown as { _debugDrawer: PIXI.Container | null })._debugDrawer
    if (dd && dd.children?.length) {
      const boneG = dd.getChildAt(0)
      if (boneG) boneG.visible = wantBone
      for (let i = 1; i < dd.children.length; i++) {
        dd.getChildAt(i).visible = wantRegion
      }
    }

    const arm = d.armature
    const showTex = vd.showDragonBonesTexture
    const meshWire = vd.showDragonBonesMeshWire

    for (const slot of arm.getSlots()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pixiSlot = slot as any
      const rd = pixiSlot._renderDisplay as PIXI.DisplayObject | null
      if (!rd) continue

      const slotVisible = typeof slot.visible === 'boolean' ? slot.visible : true
      const isMesh = rd instanceof SimpleMesh

      if (isMesh) {
        const mesh = rd as SimpleMesh
        mesh.drawMode = meshWire ? DRAW_MODES.LINES : DRAW_MODES.TRIANGLES
      }

      const showFilled = showTex
      const wireOnly = !showFilled && isMesh && meshWire
      rd.visible = slotVisible && (showFilled || wireOnly)
    }

    if (dd && dd.parent === d) {
      d.addChild(dd)
    }
  }

  function bumpPose() {
    poseRevision.value++
  }

  function dispose() {
    if (tickerSync && pixiApp) {
      pixiApp.ticker.remove(tickerSync)
    }
    tickerSync = null
    resizeObs?.disconnect()
    resizeObs = null
    relayoutDb = null
    containerEl = null
    panX = 0
    panY = 0
    zoomMul = 1
    fitBaseScale = 1
    userZoomMul.value = 1
    gridG = null
    originG = null
    try {
      ;(armatureDisplay.value as { dispose?: (b?: boolean) => void } | null)?.dispose?.(true)
    } catch {
      /* ignore */
    }
    armatureDisplay.value = null
    try {
      pixiApp?.destroy(true, { children: true, texture: true })
    } catch {
      /* ignore */
    }
    pixiApp = null
    try {
      getDragonBones().PixiFactory.factory.clear(true)
    } catch {
      /* 尚未加载过 dragonBones */
    }
    ready.value = false
    playing.value = true
    animationNames.value = []
    currentAnimation.value = null
    loadError.value = null
    poseRevision.value = 0
    currentTime.value = 0
    loopPlayback.value = true
    mountGeneration.value = 0
  }

  async function loadFromFiles(files: File[]): Promise<boolean> {
    dispose()
    loadError.value = null
    const ui = useUiSettingsStore()
    const t = ui.t
    const appLog = useAppLogStore()
    try {
      const built = await tryLoadDragonBonesArmature(files)
      if (!built) return false

      armatureDisplay.value = built.display
      const names = [...built.display.animation.animationNames]
      animationNames.value = names
      currentAnimation.value = names[0] ?? null
      loopPlayback.value = true
      currentTime.value = 0
      if (currentAnimation.value) {
        built.display.animation.play(currentAnimation.value, 0)
      }
      built.display.animation.timeScale = 1
      ready.value = true
      playing.value = true
      bumpPose()

      const editor = useEditorStore()
      const label = files.map((f) => f.name).join(', ')
      editor.setImportResult(label, built.importResult, null)
      appLog.info(
        t('DragonBones 运行时加载成功', 'DragonBones runtime loaded'),
        t(`骨架 ${built.armatureName} · 动画 ${names.length} 个`, `Armature ${built.armatureName} · ${names.length} animations`),
      )
      mountGeneration.value++
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      dispose()
      loadError.value = msg
      appLog.error(t('DragonBones 运行时加载失败', 'DragonBones runtime load failed'), loadError.value)
      return false
    }
  }

  function setAnimation(name: string, loop: boolean) {
    const d = armatureDisplay.value as DbPixiArmatureDisplay | null
    if (!d) return
    const ui = useUiSettingsStore()
    const t = ui.t
    useAppLogStore().info(t('切换 DragonBones 动画', 'Switch DragonBones animation'), `${name}${loop ? t('（循环）', ' (loop)') : ''}`)
    loopPlayback.value = loop
    currentTime.value = 0
    currentAnimation.value = name
    d.animation.stop()
    d.animation.play(name, loop ? 0 : 1)
    d.armature.advanceTime(0)
    bumpPose()
  }

  const currentDuration = computed(() => {
    const d = armatureDisplay.value as DbPixiArmatureDisplay | null
    const name = currentAnimation.value
    if (!d || !name) return 0
    const st = d.animation.getState(name) as { totalTime?: number; animationData?: { duration?: number } } | null
    if (st?.animationData && typeof st.animationData.duration === 'number') return st.animationData.duration
    if (st && typeof st.totalTime === 'number') return st.totalTime
    return 0
  })

  function seek(timeSec: number) {
    const d = armatureDisplay.value as DbPixiArmatureDisplay | null
    const name = currentAnimation.value
    if (!d || !name) return
    const dur = currentDuration.value || 0
    const tt = Math.max(0, dur > 0 ? Math.min(dur, timeSec) : timeSec)
    currentTime.value = tt
    const st = d.animation.getState(name) as { currentTime?: number } | null
    if (st && typeof st.currentTime === 'number') {
      st.currentTime = tt
    }
    d.armature.advanceTime(0)
    bumpPose()
  }

  function tick(_delta: number) {
    void _delta
    /** 由 Pixi 共享 Ticker + dragonBones 内部时钟驱动；此 tick 预留给与 Spine 统一的调用点 */
  }

  function syncFromAnimationState() {
    const d = armatureDisplay.value as DbPixiArmatureDisplay | null
    const name = currentAnimation.value
    if (!d || !name || !playing.value) return
    const st = d.animation.getState(name) as { currentTime?: number } | null
    if (st && typeof st.currentTime === 'number') {
      const dur = currentDuration.value
      const tt = st.currentTime
      currentTime.value = dur > 0 && loopPlayback.value ? tt % dur : tt
    }
  }

  function togglePlay() {
    const d = armatureDisplay.value as DbPixiArmatureDisplay | null
    if (!d) return
    playing.value = !playing.value
    d.animation.timeScale = playing.value ? 1 : 0
    if (playing.value) {
      d.armature.advanceTime(0)
    }
    useAppLogStore().info(
      useUiSettingsStore().t(playing.value ? 'DragonBones：播放' : 'DragonBones：暂停', playing.value ? 'DragonBones: Play' : 'DragonBones: Pause'),
    )
    bumpPose()
  }

  function dbOnWheel(e: WheelEvent) {
    if (!relayoutDb || !containerEl) return
    const host = containerEl
    const rect = host.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const cw = Math.max(320, host.clientWidth)
    const ch = Math.max(240, host.clientHeight)

    const oldZoom = zoomMul
    const zoomIntensity = 0.0015
    const delta = -e.deltaY * zoomIntensity
    const factor = Math.exp(delta)
    const newZoom = Math.min(8, Math.max(0.08, oldZoom * factor))
    if (Math.abs(newZoom - oldZoom) < 1e-9) return

    const s0 = fitBaseScale * oldZoom
    const s1 = fitBaseScale * newZoom
    const vx = cw / 2 + panX
    const vy = ch / 2 + panY
    const lx = (mx - vx) / s0
    const ly = (my - vy) / s0

    zoomMul = newZoom
    // 缩放前后保持光标下的显示对象局部点不变
    panX = mx - lx * s1 - cw / 2
    panY = my - ly * s1 - ch / 2
    userZoomMul.value = zoomMul
    relayoutDb()
  }

  function dbOnPanDelta(dx: number, dy: number) {
    if (!relayoutDb) return
    panX += dx
    panY += dy
    relayoutDb()
  }

  function dbResetView() {
    if (!relayoutDb) return
    panX = 0
    panY = 0
    zoomMul = 1
    fitBaseScale = Math.max(1e-6, fitBaseScale)
    userZoomMul.value = 1
    relayoutDb()
  }

  async function mountInto(container: HTMLElement): Promise<void> {
    const display = armatureDisplay.value as DbPixiArmatureDisplay | null
    if (!display || pixiApp) return

    await ensureDragonBonesPixiEnv()

    const w = Math.max(320, container.clientWidth)
    const h = Math.max(240, container.clientHeight)
    const app = new PIXI.Application({
      width: w,
      height: h,
      backgroundColor: 0xececec,
      /** 透明清空，HTML 层网格/原点叠在 canvas 下方时才可见（底色由 `.db-root` 提供） */
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
    containerEl = container

    const viewRoot = new PIXI.Container()
    app.stage.addChild(viewRoot)
    gridG = new PIXI.Graphics()
    originG = new PIXI.Graphics()
    viewRoot.addChild(gridG)
    viewRoot.addChild(display)
    viewRoot.addChild(originG)

    let fitBase = 1
    let lastW = 0
    let lastH = 0

    function recomputeFit(cw: number, ch: number) {
      const b = display.getLocalBounds()
      const bw = Math.max(1, b.width)
      const bh = Math.max(1, b.height)
      const pad = 0.88
      fitBase = Math.min((cw * pad) / bw, (ch * pad) / bh, 8)
      fitBaseScale = fitBase
      lastW = cw
      lastH = ch
      const px = b.x + b.width / 2
      const py = b.y + b.height / 2
      display.pivot.set(px, py)
    }

    function fit() {
      const cw = Math.max(320, container.clientWidth)
      const ch = Math.max(240, container.clientHeight)
      app.renderer.resize(cw, ch)
      if (cw !== lastW || ch !== lastH) {
        recomputeFit(cw, ch)
      }
      const s = fitBase * zoomMul
      fitBaseScale = fitBase
      display.scale.set(s)
      if (gridG) gridG.scale.set(s)
      if (originG) originG.scale.set(s)
      if (originG?.parent === viewRoot) {
        viewRoot.setChildIndex(originG, viewRoot.children.length - 1)
      }
      viewRoot.position.set(cw / 2 + panX, ch / 2 + panY)
      userZoomMul.value = zoomMul
    }

    relayoutDb = fit
    fit()
    resizeObs = new ResizeObserver(() => fit())
    resizeObs.observe(container)

    tickerSync = () => {
      syncFromAnimationState()
      applyDbViewportLayers()
      bumpPose()
      if (originG?.parent === viewRoot) {
        viewRoot.setChildIndex(originG, viewRoot.children.length - 1)
      }
    }
    /** NORMAL(0) 之后、LOW(-25) 渲染之前，与共享 Ticker 上 DragonBones 时钟一致 */
    app.ticker.add(tickerSync, undefined, -15 as UPDATE_PRIORITY)
    // 初次挂载就把可见性与当前 display store 对齐
    const vd = useViewportDisplayStore()
    setWorldOverlayVisible(vd.showGridLines, vd.showWorldOrigin)
  }

  function unmount() {
    if (tickerSync && pixiApp) {
      pixiApp.ticker.remove(tickerSync)
    }
    tickerSync = null
    resizeObs?.disconnect()
    resizeObs = null
    relayoutDb = null
    containerEl = null
    fitBaseScale = 1
    try {
      const d = armatureDisplay.value as DbPixiArmatureDisplay | null
      if (d && d.parent) {
        d.parent.removeChild(d)
      }
    } catch {
      /* ignore */
    }
    try {
      pixiApp?.destroy(true, { children: true, texture: true })
    } catch {
      /* ignore */
    }
    pixiApp = null
  }

  return {
    poseRevision,
    ready,
    userZoomMul,
    playing,
    animationNames,
    currentAnimation,
    loadError,
    currentTime,
    currentDuration,
    loopPlayback,
    armatureDisplay,
    mountGeneration,
    showViewport,
    dispose,
    loadFromFiles,
    setAnimation,
    seek,
    tick,
    togglePlay,
    mountInto,
    unmount,
    dbOnWheel,
    dbOnPanDelta,
    dbResetView,
    setWorldOverlayVisible,
  }
})
