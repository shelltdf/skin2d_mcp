# skin2d-editor-web — 物理规格

## 对外行为（MVP）

### 启动

- `npm run dev`：开发服务器，默认端口以 Vite 控制台为准（通常 5173）。
- 页面加载后显示 Windows 风格主窗口布局，无白屏脚本错误。

### 导入

- 菜单 **文件 → 导入…** 与工具条「导入」等价：触发本地文件选择。
- 支持扩展名：`.json`、`.gltf`、`.glb`、`.dbproj`（DragonBones 工程，须为 UTF-8 JSON）。
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

1. 用户选择文件 → `FileReader` 读文本或 ArrayBuffer（glTF 二进制）。
2. 探测格式 → 调用对应轻量解析（计数骨骼等，不全量实现播放器）。
3. 状态写入 Pinia → Vue 响应式更新面板与画布文字。

## 技术约束

- 路径与文件名 ASCII；文本 UTF-8。
- 无后端；纯前端。
