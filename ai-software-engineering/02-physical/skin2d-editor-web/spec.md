# skin2d-editor-web — 物理规格

## 对外行为（MVP）

### 启动

- `npm run dev`：开发服务器，默认端口以 Vite 控制台为准（通常 5173）。
- 页面加载后显示 Windows 风格主窗口布局，无白屏脚本错误。

### 导入

- 菜单 **文件 → 导入…** 与工具条「导入」等价：触发本地文件选择（**可多选**）。
- 支持扩展名：`.json`（Spine / DragonBones 等；**单独**的 Live2D `*.model3.json` 会被拒绝并提示使用 zip）、`.zip`（Live2D 整包）、`.gltf`、`.glb`、`.atlas`、常见图片（与 Spine 图集配套）、`.moc3`（单独导入由守卫提示使用 zip）。**不支持** `.dbproj`（工程文件），须改导 `*_ske.json`。
- **Spine 完整预览**：同一对话框中一次选择骨架 `*.json` + `*.atlas` + atlas 引用的各页贴图（如 `*.png`），使用 `@esotericsoftware/spine-canvas` 在画布上绘制网格/贴图，并由 Pinia `spineRuntime` 驱动 `AnimationState` 播放；时间轴可选动画、播放/暂停。
- **仅 Spine JSON**：单文件仍走轻量解析与骨骼线回退（无贴图、无运行时网格）。
- **Live2D（仅 zip）**：导入 **单个** `*.zip`（包内含 `*.model3.json`、`.moc3`、贴图等）后在画布区挂载 Live2D 预览（Cubism 4 + `pixi-live2d-display` ZipLoader + JSZip）；zip 内 `model3` 元数据由 `extractZipModel3` 解析供属性面板。因主 Spine `canvas` 隐藏，**滚轮缩放 / 中键拖移 / 双击复位** 绑在 Live2D 容器上；模型默认开启 `autoInteract`。视口平移/缩放通过 PIXI **`Container` 相机层（`viewRoot`）** 实现：`Live2DModel` 局部位置固定为 `(0,0)`，只移动 `viewRoot.position` 与 `model.scale`。**适配倍数**仅在容器宽高变化时用 Cubism **`internalModel` 逻辑宽高** 重算并缓存，避免因 `model.width/height`（受当前 scale 与动画影响）在每次拖/滚轮时重算而产生缩放闪烁。单独导入 `*.model3.json` 不予接受。
- 解析成功后，**属性**区与 **视口** 显示 `ImportResult` 摘要（见下）。

### ImportResult 字段（单一事实来源）

| 字段 | 类型 | 说明 |
|------|------|------|
| `formatId` | `'spine-json' \| 'dragonbones' \| 'gltf' \| 'live2d' \| 'unknown'` | 检测到的格式 |
| `versionHint` | `string?` | 版本或生成器提示 |
| `skeletonName` | `string?` | 骨架或文档名 |
| `boneCount` | `number?` | 骨骼数量 |
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
2. 探测格式 → Spine 多文件为完整运行时；其余为轻量解析（glTF 摘要、DragonBones 元数据等）。
3. Live2D zip：先提取 zip 元数据写入 `live2dRuntime.previewImport`，再在 `Live2DViewport` 挂载时 `mountInto`；**JSZip** 注册 `ZipLoader` 后 `Live2DModel.from([zip])`；布局用 **`viewRoot` + 缓存 `fitBaseScale`**；成功/失败回写 `editor.setImportResult`。
4. 状态写入 Pinia（`editor` + 可选 `spineRuntime` / `live2dRuntime`）→ 视口 `requestAnimationFrame` 循环中若 `spineRuntime.playing` 则 `tick`，并 `SkeletonRenderer.draw` 与骨骼线叠加；当 `live2dRuntime.showViewport` 为 true 时用 Live2D 视口替换 canvas 绘制。

## 视口显示层

- 用户可通过视口右上角「显示」条切换：网格线、世界原点、Spine **贴图**（Region）与 **网格**（Mesh）独立开关、骨骼叠加、Spine 调试线（至少开启贴图或网格之一时可用）、左上角状态信息。
- 「贴图网格线」为 MeshAttachment 的绿色线框；「Region 边框线」为 RegionAttachment 的绿色外框线。
- 状态持久于会话内 Pinia `viewportDisplay`；新建工程恢复默认全开（调试线关）。

## 层级与选中

- **层级**面板按 Spine 数据展示：骨骼（树状）、插槽、皮肤、动画；条目可点击选中/再次点击取消。
- 选中项详情在**属性**面板「选中项」区展示；骨骼在播放时随 `spineRuntime.poseRevision` 刷新。
- 视口骨骼层对当前选中骨骼高亮（橙点外圈）；新建/重新导入清空选中。
- 画布支持左键点击选择 Spine slot（Region/Mesh 命中测试），并与层级面板同步；选中 slot 在画布上以橙色轮廓/填充高亮。

## 时间轴（Spine）

- 时间轴 Dock 位于底部，支持：
  - 播放/暂停
  - 拖动/点击进度条寻帧（拖动时自动暂停）
  - Tab 切换 **Dope Sheet** 与 **Curves**（当前为只读展示）
- Dope Sheet：按动画 timelines 聚合通道行（骨骼/插槽/其它），关键帧以点/块显示；当通道过多时在内部滚动区域滚动（不撑出 Dock）。
- Curves：对选中骨骼的 `rotation/x/y/scaleX/scaleY` 做采样曲线预览；坐标轴（t=0、v=0）始终显示；关键帧标记显示；曲线显示区域带 inset 防止边缘裁切。

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
