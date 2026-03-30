import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { Physics } from '@esotericsoftware/spine-core'
import type { LoadedSpineBundle } from '../spine/spineBundleLoader'
import { disposeSpineBundle, loadSpineBundle } from '../spine/spineBundleLoader'
import { useEditorStore } from './editor'

export const useSpineRuntimeStore = defineStore('spineRuntime', () => {
  /** 骨骼姿态更新计数，供属性面板等依赖刷新（骨架对象原地变更） */
  const poseRevision = ref(0)
  const ready = ref(false)
  const playing = ref(false)
  const animationNames = ref<string[]>([])
  const currentAnimation = ref<string | null>(null)
  const bundle = shallowRef<LoadedSpineBundle | null>(null)
  const loadError = ref<string | null>(null)

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
  }

  /** 多选文件：skeleton.json + .atlas + 各页贴图 */
  async function loadFromFiles(files: File[]): Promise<boolean> {
    dispose()
    loadError.value = null
    try {
      const loaded = await loadSpineBundle(files)
      if (!loaded) return false

      const b = loaded.bundle
      bundle.value = b
      const names = b.skeletonData.animations.map((a) => a.name)
      animationNames.value = names
      currentAnimation.value = names[0] ?? null

      if (currentAnimation.value) {
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
      return true
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : String(e)
      return false
    }
  }

  function setAnimation(name: string, loop: boolean) {
    const b = bundle.value
    if (!b) return
    currentAnimation.value = name
    b.animationState.clearTracks()
    b.animationState.setAnimation(0, name, loop)
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
    bumpPose()
  }

  function togglePlay() {
    playing.value = !playing.value
  }

  return {
    poseRevision,
    ready,
    playing,
    animationNames,
    currentAnimation,
    bundle,
    loadError,
    dispose,
    loadFromFiles,
    setAnimation,
    tick,
    togglePlay,
    bumpPose,
  }
})
