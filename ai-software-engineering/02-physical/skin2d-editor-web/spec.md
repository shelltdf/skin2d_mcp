# skin2d-editor-web — 物理规格

## 对外行为（MVP）

### 启动

- `npm run dev`：开发服务器，默认端口以 Vite 控制台为准（通常 5173）。
- 页面加载后显示 Windows 风格主窗口布局，无白屏脚本错误。

### 导入

- 菜单 **文件 → 导入…** 与工具条「导入」等价：触发本地文件选择（**可多选**）。工具条可按 **Spine / Live2D / DragonBones / glTF / 全部类型** 分路打开对话框；在支持 File System Access API 的浏览器中通过 **`showOpenFilePicker` 的不同 `id`** 分别记忆各类型上次目录，否则回退为 **每类一个独立 `<input type=file>`** 以尽量分记路径（最终行为随浏览器/OS）。
- 支持扩展名：`.json`（Spine / DragonBones 等；**单独**的 Live2D `*.model3.json` 会被拒绝并提示使用 zip）、`.zip`（Live2D 整包）、`.gltf`、`.glb`、`.atlas`、常见图片（与 Spine 图集配套）、`.moc3`（单独导入由守卫提示使用 zip）。**不支持** `.dbproj`（工程文件），须改导 `*_ske.json`。
- **Spine 完整预览**：同一对话框中一次选择骨架 `*.json` + `*.atlas` + atlas 引用的各页贴图（如 `*.png`），使用 `@esotericsoftware/spine-canvas` 在画布上绘制网格/贴图，并由 Pinia `spineRuntime` 驱动 `AnimationState` 播放；时间轴可选动画、播放/暂停。
- **仅 Spine JSON**：单文件仍走轻量解析与骨骼线回退（无贴图、无运行时网格）。
- **DragonBones**：仅打开 `*_ske.json` 时解析元数据 + **骨骼连线**（2D Canvas）。**多选** `*_ske.json` + `*_tex.json` + 图集 PNG/WebP（同一批、与 `imagePath` 一致）时，经 `pixi.js` + `dragonbones.js` 在独立 WebGL 画布上**贴图预览**，时间轴可播放/暂停与拖动进度；**摄影表 / 曲线**仍仅 Spine 支持。
- **Live2D（仅 zip）**：导入 **单个** `*.zip`（包内含 `*.model3.json`、`.moc3`、贴图等）后在画布区挂载 Live2D 预览（Cubism 4 + `pixi-live2d-display` ZipLoader + JSZip）；zip 内 `model3` 元数据由 `extractZipModel3` 解析供属性面板。因主 Spine `canvas` 隐藏，**滚轮缩放 / 中键拖移 / 双击复位** 绑在 Live2D 容器上；模型默认开启 `autoInteract`。视口平移/缩放通过 PIXI **`Container` 相机层（`viewRoot`）** 实现：`Live2DModel` 局部位置固定为 `(0,0)`，只移动 `viewRoot.position` 与 `model.scale`。**适配倍数**仅在容器宽高变化时用 Cubism **`internalModel` 逻辑宽高** 重算并缓存，避免因 `model.width/height`（受当前 scale 与动画影响）在每次拖/滚轮时重算而产生缩放闪烁。底部时间轴在预览就绪后可切换 **Cubism 动作**、**播放/暂停** 并在已知动作时长时 **拖动进度**（`live2dRuntime`）；摄影表/曲线仍仅 Spine。单独导入 `*.model3.json` 不予接受。
- 解析成功后，**属性**区与 **视口** 显示 `ImportResult` 摘要（见下）。

### ImportResult 字段（单一事实来源）

| 字段 | 类型 | 说明 |
|------|------|------|
| `formatId` | `'spine-json' \| 'dragonbones' \| 'gltf' \| 'live2d' \| 'unknown'` | 检测到的格式 |
| `versionHint` | `string?` | 版本或生成器提示 |
| `skeletonName` | `string?` | 骨架或文档名 |
| `boneCount` | `number?` | 骨骼数量（Spine / DragonBones 等） |
| `live2dParameterCount` | `number?` | Live2D：自 cdi3.json 的参数条目数（非骨骼） |
| `live2dPartCount` | `number?` | Live2D：自 cdi3.json 的部件数 |
| `slotCount` | `number?` | 插槽数量（Spine/DB 适用） |
| `skinCount` | `number?` | 皮肤数量 |
| `animationNames` | `string[]?` | 动画名列表（截断显示前 10 个） |
| `warnings` | `string[]` | 非致命提示 |

### 错误语义

- 文件无法读：提示用户，不覆盖上一次成功结果（可选策略：清空并显示错误）。
- 误选图片 / `.atlas` 单文件 / `.skel` 二进制：在 `JSON.parse` 前拦截，给出中文说明（见 `importGuards.ts`）。
- 内容非 JSON 形态（不以 `{` / `[` 开头）：提示可能为二进制或损坏，**不**把原始乱码片段写入提示。
- JSON 语法仍无效：`formatId=unknown`，`warnings` 含简短说明（不含解析器原始乱码串）。

## 重要过程

1. 用户选择文件（可多选）→ 若含 `.atlas` 与 Spine 特征 JSON，则 `loadSpineBundle` 构建 `TextureAtlas` + `Skeleton` + `AnimationState`；否则单文件走 `importAssetFile`。
2. 探测格式 → **Spine** 多文件为完整 2D Canvas 运行时；**DragonBones** 多文件（ske+tex+图）为 Pixi WebGL 运行时；其余为轻量解析（glTF 摘要、DragonBones 单 ske 元数据等）。
3. Live2D zip：先提取 zip 元数据写入 `live2dRuntime.previewImport`（含 `model3.json` 与可选 **`FileReferences.DisplayInfo` → cdi3.json** 中的参数/部件计数），再在 `Live2DViewport` 挂载时 `mountInto`；**JSZip** 注册 `ZipLoader` 后 `Live2DModel.from([zip])`；布局用 **`viewRoot` + 缓存 `fitBaseScale`**；成功/失败回写 `editor.setImportResult`。
4. 状态写入 Pinia（`editor` + 可选 `spineRuntime` / `live2dRuntime`）→ 视口 `requestAnimationFrame` 循环中若 `spineRuntime.playing` 则 `tick`，并 `SkeletonRenderer.draw` 与骨骼线叠加；当 `live2dRuntime.showViewport` 为 true 时用 Live2D 视口替换 canvas 绘制。

## 视口显示层

- 视口右上角「显示」条：**通用**含坐标网格、世界原点、状态信息、HUD。**Spine** 分组含 **贴图**（`showSpineTexture`）、**骨骼**（`showBones`，主 canvas 骨骼线）、贴图网格线/Region/Spine 调试线。**Live2D** 分组含 **贴图**（`showLive2dTexture`）与 **Drawable 网格线**（`showLive2dDrawableWire`；默认关）。**DragonBones** 分组含 **贴图**（`showDragonBonesTexture`）、网格线/Region/**骨骼**（`showDragonBonesBoneDebug`；与通用 `showBones` 解耦）。**不包含**视口平移/缩放复位按钮（复位仍通过画布交互完成，如双击）。
- **坐标网格**（世界空间）：细线步长 **1** 单位、每 **10** 格一条粗线（Spine 主 canvas；DragonBones / Live2D 为 Pixi `Graphics` 在 **角色后方**，与各自视口缩放一致）。Spine 在可视世界跨度过大时会自动放大“minor 步长”以限制单次绘线数量（仍保持每 10 格粗线逻辑）。
- **世界原点**（`showWorldOrigin`）：世界坐标系下 **+X 方向 0→1 单位红色线段**、**+Y 方向 0→1 单位绿色线段**（短轴示意，非穿屏十字）；须 **始终绘制在所有场景对象之上**：Spine 主 canvas 顺序为 背景 → 世界网格 → 附件与 mesh/线框/选中高亮 → 骨骼线 → HUD → **世界原点**；Live2D / DragonBones 在 Pixi 中为 `originG`，与网格同缩放，`viewRoot` 上 **每帧 `setChildIndex` 置顶**（与 `fit` 内一致），保证盖过角色、Drawable 线框与 DB 调试层。
- 「通用」在 Spine 主画布上由 2D Canvas 绘制；在 **DragonBones / Live2D（WebGL）** 中世界 **网格** 在角色后方、**原点** 在 **viewRoot** 最前子节点（不依赖 DOM 合成）。**DragonBones** 下 **贴图**（`showDragonBonesTexture`）与 **骨骼**（`showDragonBonesBoneDebug`）**独立**：关闭贴图不要求关闭骨骼线。**DragonBones** 下 Pixi 槽位贴图与 mesh 在 WebGL 内，骨骼/Region 调试画在 armature **display** 子树最前（每帧将 `_debugDrawer` 置顶），但仍处于 **display** 之下，世界原点在 **viewRoot** 层最后绘制故整体在上。
- 「贴图网格线」为 MeshAttachment 的绿色线框；「Region 边框线」为 RegionAttachment 的绿色外框线。
- DragonBones 专用开关语义：**贴图**（槽位渲染体显隐）、**骨骼**（`PixiArmatureDisplay` 调试骨骼层）、**贴图网格线**（Mesh 槽位 `DRAW_MODES.LINES` 近似线框）、**Region 边框线**（`boundingBoxData` 调试描边）；贴图与骨骼互不强制联动。
- 状态持久于会话内 Pinia `viewportDisplay`；`resetToDefaults` 时贴图/HUD/世界网格类多为开；**Spine 骨骼（`showBones`）默认开**，**DragonBones 骨骼（`showDragonBonesBoneDebug`）默认开**；**贴图网格线**（`showSpineMeshWire` / `showDragonBonesMeshWire`）默认 **关**；Region 边框与各类调试线默认关；Live2D Drawable 网格线（`showLive2dDrawableWire`）默认关。

## 层级与选中

- **层级**面板按 Spine 数据展示：骨骼（树状）、插槽、皮肤、动画；条目可点击选中/再次点击取消。
- 选中项详情在**属性**面板「选中项」区展示；骨骼在播放时随 `spineRuntime.poseRevision` 刷新。
- 视口骨骼层对当前选中骨骼高亮（橙点外圈）；新建/重新导入清空选中。
- 画布支持左键点击选择 Spine slot（Region/Mesh 命中测试），并与层级面板同步；选中 slot 在画布上以橙色轮廓/填充高亮。

## 时间轴

- 时间轴 Dock 位于底部。**Spine / DragonBones / Live2D（zip 预览就绪后）** 均启用播放/暂停与动画（或 Cubism 动作）下拉；**摄影表（Dope Sheet）与曲线（Curves）仍仅 Spine**。
- 共性：
  - 播放/暂停
  - 拖动/点击进度条寻帧（拖动时自动暂停；Live2D 依赖 Cubism 队列内部时间，与 Spine 逐帧精度不等价）
- **Spine**：Tab 切换 **Dope Sheet** 与 **Curves**（只读）。
  - Dope Sheet：按动画 timelines 聚合通道行（骨骼/插槽/其它），关键帧以点/块显示；当通道过多时在内部滚动区域滚动（不撑出 Dock）。
  - Curves：对选中骨骼的 `rotation/x/y/scaleX/scaleY` 做采样曲线预览；坐标轴（t=0、v=0）始终显示；关键帧标记显示；曲线显示区域带 inset 防止边缘裁切。
- **DragonBones**：进度条与动画选择与 Spine 一致；无 Dope / Curves。
- **Live2D**：动作列表来自 `model3` 的 motions 分组与条目（展示为 `分组 · 文件名`）；`live2dRuntime` 在 `mountInto` 后通过 PIXI `ticker` 同步 `currentTime` / `currentDuration`（自队列中当前运动的时长）；无 Dope / Curves。

## 全屏与 Dock 布局

- **画布全屏**：隐藏左/右/底 Dock，仅保留中心画布。
- **显示器全屏**：仅对中心画布容器触发浏览器 Fullscreen API（不全屏整个页面）。
- Dock 布局（可见性与尺寸）持久化到 localStorage；窗口尺寸变化时需要对已保存尺寸重新 clamp，避免挤压状态栏或溢出。

## 状态栏与日志

- 底部状态栏显示最近一条日志摘要；点击打开日志窗口（纯文本控制台）。
- 日志包含信息/警告/错误：导入流程、Live2D/Spine 运行时加载、全屏切换、画布选中等；Vue 运行时错误会写入日志。

## 多语言与主题

- 顶部菜单支持切换语言（中文/英文）与主题（跟随系统/浅色/深色），持久化到 localStorage 并应用到 DOM（`lang` + `data-theme`）。

## 技术约束

- 路径与文件名 ASCII；文本 UTF-8。
- 无后端；纯前端。
- **离线可用**：运行期不请求外网资源；Live2D 所需的 `live2dcubismcore.min.js` 与 Vite 构建产物一同落在 `dist/vendor/`，由 `index.html` 以相对路径加载。生产构建使用 `base: './'`，便于整目录离线分发或本地静态服务。
