# 接口设计（程序间，非 GUI）

## 内部导入管线接口

导入器实现统一签名（逻辑约定，语言为 TypeScript 类型）：

```ts
// 概念层摘要；权威字段见 02-physical 规格与 skin2d-editor/src/importers/types.ts
interface RigPreviewBone {
  name: string
  worldX: number
  worldY: number
  parentName: string | null
}
interface ImportResult {
  formatId: 'spine-json' | 'dragonbones' | 'gltf' | 'live2d' | 'unknown'
  versionHint?: string
  skeletonName?: string
  boneCount?: number
  slotCount?: number
  skinCount?: number
  animationNames?: string[]
  warnings: string[]
  rigPreview?: { bones: RigPreviewBone[] }
}
```

## 外部格式（开放 / 互操作）

| 格式 | 典型文件 | 说明 |
|------|----------|------|
| Spine JSON | `*.json`（skeleton） | 社区广泛使用；JSON 导出 |
| DragonBones | `*_ske.json`、`*_tex.json`、图集 PNG/WebP | 运行时数据；单 ske 仅元数据/骨骼线；**多文件**与 Spine 类似一并提交 ske + tex + 图集，由 `pixi.js` + `dragonbones.js` 渲染；**不支持** `.dbproj` |
| Live2D Cubism（Web 预览） | 单文件 `*.zip` | 内含 `*.model3.json`、`.moc3`、贴图；实现侧用 `jszip` 注册 `pixi-live2d-display` 的 `ZipLoader`；`index.html` 须加载 Cubism Core；**不**支持多文件多选（资源常跨目录） |
| glTF 2.0 | `*.gltf` / `*.glb` | Khronos 开放标准；2D 内容可嵌于扩展或平面网格 |

GUI 操作（菜单、快捷键）不属于本文件，见 `product-design.md` 与逻辑层详细设计。
