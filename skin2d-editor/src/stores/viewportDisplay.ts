import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 画布各显示层开关（与绘制顺序一致） */
export const useViewportDisplayStore = defineStore('viewportDisplay', () => {
  /** 世界坐标系辅助网格线（与 Spine 贴图网格无关） */
  const showGridLines = ref(true)
  /** 世界原点 (0,0) 十字参考线 */
  const showWorldOrigin = ref(true)
  /** Spine RegionAttachment（sprite/四边形贴图） */
  const showSpineTexture = ref(true)
  /** MeshAttachment：贴图网格线（三角剖分线框） */
  const showSpineMeshWire = ref(true)
  /** RegionAttachment：贴图边框线（四边形轮廓） */
  const showSpineRegionWire = ref(false)
  /** 骨骼连线与关节 */
  const showBones = ref(true)
  /** 左上角 HUD 文字 */
  const showHud = ref(true)
  /** Spine 运行时调试线框（三角轮廓） */
  const showSpineDebug = ref(false)

  function resetToDefaults() {
    showGridLines.value = true
    showWorldOrigin.value = true
    showSpineTexture.value = true
    showSpineMeshWire.value = true
    showSpineRegionWire.value = false
    showBones.value = true
    showHud.value = true
    showSpineDebug.value = false
  }

  return {
    showGridLines,
    showWorldOrigin,
    showSpineTexture,
    showSpineMeshWire,
    showSpineRegionWire,
    showBones,
    showHud,
    showSpineDebug,
    resetToDefaults,
  }
})
