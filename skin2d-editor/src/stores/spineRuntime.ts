import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { Physics } from '@esotericsoftware/spine-core'
import type { LoadedSpineBundle } from '../spine/spineBundleLoader'
import { disposeSpineBundle, loadSpineBundle } from '../spine/spineBundleLoader'
import { useAppLogStore } from './appLog'
import { useEditorStore } from './editor'
import { useUiSettingsStore } from './uiSettings'

export const useSpineRuntimeStore = defineStore('spineRuntime', () => {
  /** 骨骼姿态更新计数，供属性面板等依赖刷新（骨架对象原地变更） */
  const poseRevision = ref(0)
  const ready = ref(false)
  const playing = ref(false)
  const animationNames = ref<string[]>([])
  const currentAnimation = ref<string | null>(null)
  const bundle = shallowRef<LoadedSpineBundle | null>(null)
  const loadError = ref<string | null>(null)
  const currentTime = ref(0)
  const loopPlayback = ref(true)

  function bumpPose() {
    poseRevision.value++
  }

  function dispose() {
    disposeSpineBundle(bundle.value)
    bundle.value = null
    ready.value = false
    playing.value = false
    animationNames.value = []
    currentAnimation.value = null
    loadError.value = null
    poseRevision.value = 0
    currentTime.value = 0
    loopPlayback.value = true
  }

  /** 多选文件：skeleton.json + .atlas + 各页贴图 */
  async function loadFromFiles(files: File[]): Promise<boolean> {
    dispose()
    loadError.value = null
    const appLog = useAppLogStore()
    const ui = useUiSettingsStore()
    const t = ui.t
    try {
      const loaded = await loadSpineBundle(files)
      if (!loaded) return false

      const b = loaded.bundle
      bundle.value = b
      const names = b.skeletonData.animations.map((a) => a.name)
      animationNames.value = names
      currentAnimation.value = names[0] ?? null

      if (currentAnimation.value) {
        loopPlayback.value = true
        currentTime.value = 0
        b.animationState.setAnimation(0, currentAnimation.value, true)
        b.animationState.apply(b.skeleton)
        b.skeleton.updateWorldTransform(Physics.update)
      } else {
        b.skeleton.setToSetupPose()
        b.skeleton.updateWorldTransform(Physics.update)
      }

      ready.value = true
      playing.value = true
      bumpPose()

      const editor = useEditorStore()
      const label = files.map((f) => f.name).join(', ')
      editor.setImportResult(label, loaded.importResult, null)
      const skName = loaded.importResult.skeletonName ?? '（未命名）'
      appLog.info(
        t('Spine 运行时加载成功', 'Spine runtime loaded'),
        t(`骨架 ${skName} · 动画 ${names.length} 个`, `Skeleton ${skName} · ${names.length} animations`),
      )
      return true
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : String(e)
      appLog.error(useUiSettingsStore().t('Spine 运行时加载失败', 'Spine runtime load failed'), loadError.value)
      return false
    }
  }

  function setAnimation(name: string, loop: boolean) {
    const b = bundle.value
    if (!b) return
    const ui = useUiSettingsStore()
    const t = ui.t
    useAppLogStore().info(t('切换 Spine 动画', 'Switch Spine animation'), `${name}${loop ? t('（循环）', ' (loop)') : ''}`)
    loopPlayback.value = loop
    currentTime.value = 0
    currentAnimation.value = name
    b.animationState.clearTracks()
    b.animationState.setAnimation(0, name, loop)
    b.animationState.apply(b.skeleton)
    b.skeleton.updateWorldTransform(Physics.update)
    bumpPose()
  }

  const currentDuration = computed(() => {
    const b = bundle.value
    const name = currentAnimation.value
    if (!b || !name) return 0
    const anim = b.skeletonData.findAnimation(name)
    return anim?.duration ?? 0
  })

  function seek(timeSec: number) {
    const b = bundle.value
    const name = currentAnimation.value
    if (!b || !name) return
    const dur = currentDuration.value || 0
    const t = Math.max(0, dur > 0 ? Math.min(dur, timeSec) : timeSec)
    currentTime.value = t
    const track = b.animationState.getCurrent(0)
    if (track) {
      track.trackTime = t
    } else {
      b.animationState.setAnimation(0, name, loopPlayback.value)
      const t2 = b.animationState.getCurrent(0)
      if (t2) t2.trackTime = t
    }
    b.animationState.apply(b.skeleton)
    b.skeleton.updateWorldTransform(Physics.update)
    bumpPose()
  }

  function tick(delta: number) {
    const b = bundle.value
    if (!b || !playing.value) return
    b.animationState.update(delta)
    b.animationState.apply(b.skeleton)
    b.skeleton.updateWorldTransform(Physics.update)
    const t = b.animationState.getCurrent(0)?.trackTime
    if (typeof t === 'number' && Number.isFinite(t)) {
      const dur = currentDuration.value
      currentTime.value = dur > 0 && loopPlayback.value ? (t % dur) : t
    }
    bumpPose()
  }

  function togglePlay() {
    playing.value = !playing.value
    useAppLogStore().info(useUiSettingsStore().t(playing.value ? 'Spine 动画：播放' : 'Spine 动画：暂停', playing.value ? 'Spine: Play' : 'Spine: Pause'))
  }

  return {
    poseRevision,
    ready,
    playing,
    animationNames,
    currentAnimation,
    bundle,
    loadError,
    currentTime,
    currentDuration,
    loopPlayback,
    dispose,
    loadFromFiles,
    setAnimation,
    seek,
    tick,
    togglePlay,
    bumpPose,
  }
})
