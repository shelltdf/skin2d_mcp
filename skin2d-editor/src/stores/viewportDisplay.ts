import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 画布各显示层开关（与绘制顺序一致） */
export const useViewportDisplayStore = defineStore('viewportDisplay', () => {
  /** 世界坐标系步进网格线 */
  const showGridLines = ref(true)
  /** 世界原点 (0,0) 十字参考线 */
  const showWorldOrigin = ref(true)
  /** Spine 运行时绘制的附件（贴图 / 三角网格） */
  const showSpineMesh = ref(true)
  /** 骨骼连线与关节 */
  const showBones = ref(true)
  /** 左上角 HUD 文字 */
  const showHud = ref(true)
  /** Spine 运行时调试线框（三角轮廓） */
  const showSpineDebug = ref(false)

  function resetToDefaults() {
    showGridLines.value = true
    showWorldOrigin.value = true
    showSpineMesh.value = true
    showBones.value = true
    showHud.value = true
    showSpineDebug.value = false
  }

  return {
    showGridLines,
    showWorldOrigin,
    showSpineMesh,
    showBones,
    showHud,
    showSpineDebug,
    resetToDefaults,
  }
})
