import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 画布各显示层开关（与绘制顺序一致） */
export const useViewportDisplayStore = defineStore('viewportDisplay', () => {
  /** 世界坐标系辅助网格线（与 Spine 贴图网格无关） */
  const showGridLines = ref(true)
  /** 世界原点轴：+X 0→1 红线、+Y 0→1 绿线（最后绘制，叠在场景与 HUD 上） */
  const showWorldOrigin = ref(true)
  /** Spine RegionAttachment（sprite/四边形贴图） */
  const showSpineTexture = ref(true)
  /** MeshAttachment：贴图网格线（三角剖分线框） */
  const showSpineMeshWire = ref(false)
  /** RegionAttachment：贴图边框线（四边形轮廓） */
  const showSpineRegionWire = ref(false)
  /** 骨骼连线与关节 */
  const showBones = ref(true)
  /** 左上角 HUD 文字 */
  const showHud = ref(true)
  /** Spine 运行时调试线框（三角轮廓） */
  const showSpineDebug = ref(false)

  /** Live2D（Cubism）模型主绘制（关时仅保留可选 drawable 线框 + 世界网格） */
  const showLive2dTexture = ref(true)
  /** Live2D：Drawable 三角网格线框（调试用；默认关闭） */
  const showLive2dDrawableWire = ref(false)
  /** DragonBones（Pixi）贴图 / 网格槽位显示 */
  const showDragonBonesTexture = ref(true)
  /** Mesh 槽位：Pixi SimpleMesh 三角网格以 LINE 模式绘制（近似线框） */
  const showDragonBonesMeshWire = ref(false)
  /** 插槽 boundingBoxData 调试框（对应 Spine Region 边框语义，品红） */
  const showDragonBonesRegionWire = ref(false)
  /** 骨骼连线与关节（dragonBones dbUpdate 青色系） */
  const showDragonBonesBoneDebug = ref(true)

  function resetToDefaults() {
    showGridLines.value = true
    showWorldOrigin.value = true
    showSpineTexture.value = true
    showSpineMeshWire.value = false
    showSpineRegionWire.value = false
    showBones.value = true
    showHud.value = true
    showSpineDebug.value = false
    showLive2dTexture.value = true
    showLive2dDrawableWire.value = false
    showDragonBonesTexture.value = true
    showDragonBonesMeshWire.value = false
    showDragonBonesRegionWire.value = false
    showDragonBonesBoneDebug.value = true
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
    showLive2dTexture,
    showLive2dDrawableWire,
    showDragonBonesTexture,
    showDragonBonesMeshWire,
    showDragonBonesRegionWire,
    showDragonBonesBoneDebug,
 resetToDefaults,
  }
})
