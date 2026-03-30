# 详细设计：导入管线

## 探测顺序

1. 若扩展名为 `.gltf` / `.glb` → `gltf`。
2. 若扩展名为 `.dbproj` → 按 DragonBones 工程解析（归一化 `armature` 等）。
3. 若 MIME/文本为 JSON：尝试解析，检查键：
   - `FileReferences` + `*.model3.json` 文件名或 `.moc3` 引用 → `live2d`（`parseLive2dModel3`）
   - `skeleton` + `bones`（Spine 风格）→ `spine-json`
   - 顶层 `armature`（DragonBones 运行时 JSON）→ `dragonbones`
   - 否则尝试 dbproj 归一化（`dragonBones` / `library` / `document` 等）→ `dragonbones`（`versionHint` 含 `dbproj`）
4. 失败则 `unknown`，在 UI 显示警告。

## 输出

- 写入 Pinia `importStore`：`lastResult: ImportResult | null`。
- 属性面板展示摘要字段；视口可显示「已加载：{skeletonName}」。

## 错误

- 解析异常：捕获并 `warnings.push` 人类可读信息，不崩溃应用。
