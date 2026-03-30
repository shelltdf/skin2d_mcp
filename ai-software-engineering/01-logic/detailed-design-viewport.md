# 详细设计：视口（MVP）

## 职责

- 使用 `<canvas>` 全宽全高填充中央区域。
- 绘制浅灰背景、**世界空间网格**（随缩放自适应步长）与世界原点十字参考线。
- 若有骨骼预览数据，按相机（中心点 + 像素/世界单位缩放）绘制骨骼线与关节。
- 左上角 **HUD**（屏幕固定）：文件与导入摘要、相对缩放倍数、操作提示。
- **观察交互**：中键拖拽平移；滚轮以指针处为中心缩放；双击复位为「适配导入骨架」；`ResizeObserver` 与窗口尺寸变化时重绘。
- Live2D：当导入 zip 并加载成功时，用 WebGL 视口（Pixi + `pixi-live2d-display`）**替换** Spine 所用 `<canvas>` 显示（原 canvas `v-show` 隐藏）。
  - **相机**：`stage → viewRoot (Container) → Live2DModel`；平移只改 `viewRoot.position`，`model.position` 恒 `(0,0)`，便于 `autoInteract` 的 `focus` 与视口操作共用一致的世界矩阵。
  - **适配缩放**：`fitBaseScale` 仅在**容器尺寸变化**时按 Cubism `internalModel.width/height` 重算并缓存，再乘用户 `zoomMul`；避免用 `model.width/height`（随 scale/动画变）在每帧 pan/滚轮时重算导致闪烁。
  - **交互**：中键拖视口、滚轮缩放、双击复位绑在 Live2D 外层宿主（主 canvas 隐藏时收不到这些事件）；左键由 Live2D 插件处理（`autoInteract`）。
- 选择：左键点击命中测试 Spine slot，并与层级选中同步；选中对象在画布上高亮。

## 坐标系

- 相机将世界坐标映射到屏幕：`sx = w/2 + (wx - cx) * scale`（与 Spine 运行时世界坐标一致；画布 Y 向下）。

## 后续

- 图片附件、权重绘制接 WebGL 或分层 Canvas；可选 Space+左键平移、触摸双指捏合缩放。
