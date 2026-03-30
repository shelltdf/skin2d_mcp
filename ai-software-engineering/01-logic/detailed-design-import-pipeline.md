# 详细设计：导入管线

## 探测顺序

1. 若扩展名为 `.gltf` / `.glb` → `gltf`。
2. 若 MIME/文本为 JSON：尝试解析，检查键：
   - `skeleton` + `bones`（Spine 风格）→ `spine-json`
   - `armature` / DragonBones 特征键 → `dragonbones`
3. 失败则 `unknown`，在 UI 显示警告。

## 输出

- 写入 Pinia `importStore`：`lastResult: ImportResult | null`。
- 属性面板展示摘要字段；视口可显示「已加载：{skeletonName}」。

## 错误

- 解析异常：捕获并 `warnings.push` 人类可读信息，不崩溃应用。
