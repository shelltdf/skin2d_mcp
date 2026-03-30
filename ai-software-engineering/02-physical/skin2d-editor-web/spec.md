# skin2d-editor-web — 物理规格

## 对外行为（MVP）

### 启动

- `npm run dev`：开发服务器，默认端口以 Vite 控制台为准（通常 5173）。
- 页面加载后显示 Windows 风格主窗口布局，无白屏脚本错误。

### 导入

- 菜单 **文件 → 导入…** 与工具条「导入」等价：触发本地文件选择（**可多选**）。
- 支持扩展名：`.json`、`.gltf`、`.glb`、`.dbproj`（DragonBones 工程，须为 UTF-8 JSON）、`.atlas`、常见图片（与 Spine 图集配套）。
- **Spine 完整预览**：同一对话框中一次选择骨架 `*.json` + `*.atlas` + atlas 引用的各页贴图（如 `*.png`），使用 `@esotericsoftware/spine-canvas` 在画布上绘制网格/贴图，并由 Pinia `spineRuntime` 驱动 `AnimationState` 播放；时间轴可选动画、播放/暂停。
- **仅 Spine JSON**：单文件仍走轻量解析与骨骼线回退（无贴图、无运行时网格）。
- 解析成功后，**属性**区与 **视口** 显示 `ImportResult` 摘要（见下）。

### ImportResult 字段（单一事实来源）

| 字段 | 类型 | 说明 |
|------|------|------|
| `formatId` | `'spine-json' \| 'dragonbones' \| 'gltf' \| 'unknown'` | 检测到的格式 |
| `versionHint` | `string?` | 版本或生成器提示 |
| `skeletonName` | `string?` | 骨架或文档名 |
| `boneCount` | `number?` | 骨骼数量 |
| `slotCount` | `number?` | 插槽数量（Spine/DB 适用） |
| `skinCount` | `number?` | 皮肤数量 |
| `animationNames` | `string[]?` | 动画名列表（截断显示前 10 个） |
| `warnings` | `string[]` | 非致命提示 |

### 错误语义

- 文件无法读：提示用户，不覆盖上一次成功结果（可选策略：清空并显示错误）。
- JSON 无效：`formatId=unknown`，`warnings` 含解析错误摘要。

## 重要过程

1. 用户选择文件（可多选）→ 若含 `.atlas` 与 Spine 特征 JSON，则 `loadSpineBundle` 构建 `TextureAtlas` + `Skeleton` + `AnimationState`；否则单文件走 `importAssetFile`。
2. 探测格式 → Spine 多文件为完整运行时；其余为轻量解析（glTF 摘要、DragonBones/dbproj 元数据等）。
3. 状态写入 Pinia（`editor` + 可选 `spineRuntime`）→ 视口 `requestAnimationFrame` 循环中若 `spineRuntime.playing` 则 `tick`，并 `SkeletonRenderer.draw` 与骨骼线叠加。

## 视口显示层

- 用户可通过视口右上角「显示」条切换：网格线、世界原点、Spine 贴图/网格、骨骼叠加、Spine 调试线（依赖贴图层）、左上角状态信息。
- 状态持久于会话内 Pinia `viewportDisplay`；新建工程恢复默认全开（调试线关）。

## 技术约束

- 路径与文件名 ASCII；文本 UTF-8。
- 无后端；纯前端。
