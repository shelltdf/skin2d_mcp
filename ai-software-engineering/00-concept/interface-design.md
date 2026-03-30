# 接口设计（程序间，非 GUI）

## 内部导入管线接口

导入器实现统一签名（逻辑约定，语言为 TypeScript 类型）：

```ts
// 概念层摘要；权威字段见 02-physical 规格
interface ImportResult {
  formatId: 'spine-json' | 'dragonbones' | 'gltf' | 'unknown'
  versionHint?: string
  skeletonName?: string
  boneCount?: number
  slotCount?: number
  skinCount?: number
  animationNames?: string[]
  warnings: string[]
}
```

## 外部格式（开放 / 互操作）

| 格式 | 典型文件 | 说明 |
|------|----------|------|
| Spine JSON | `*.json`（skeleton） | 社区广泛使用；JSON 导出 |
| DragonBones | `*_ske.json`、`*_tex.json` | 开源 DragonBones 数据 |
| glTF 2.0 | `*.gltf` / `*.glb` | Khronos 开放标准；2D 内容可嵌于扩展或平面网格 |

GUI 操作（菜单、快捷键）不属于本文件，见 `product-design.md` 与逻辑层详细设计。
