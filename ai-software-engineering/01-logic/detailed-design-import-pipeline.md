# 详细设计：导入管线

## 探测顺序（`importAssetFile` 单文件）

1. 若扩展名为 `.gltf` / `.glb` → `gltf`。
2. 若扩展名为 `.dbproj` → **拒绝**（`importGuards`），引导导出 `*_ske.json`。
3. 其余：读文本后若像 JSON 则 `JSON.parse`，再检查键：
   - `FileReferences` + `*.model3.json` 文件名或 `.moc3` 引用 → **拒绝**：提示仅支持 **单个 .zip**（不再接受单独 `*.model3.json`）
   - `skeleton` + `bones`（Spine 风格）→ `spine-json`
   - 顶层 `armature`（DragonBones 运行时 JSON）→ `dragonbones`
4. 失败则 `unknown`，在 UI 显示警告。

## Live2D 整包 zip（并行路径）

- **不**经过 `importAssetFile`。用户在 App 层选择单个 `*.zip` 时：`live2dRuntime.queueZip` → `extractZipModel3` 填 `previewImport` → `Live2DViewport` 挂载后 `mountInto`。
- `mountInto` 内动态导入 `pixi-live2d-display/cubism4`，并用 **`registerPixiZipLoader.ts` + `jszip`** 实现 `ZipLoader` 静态方法（否则 `Live2DModel.from([zip])` 抛「Not implemented」）。
- 成功/失败均回写 Pinia **`editor`**（`setImportResult`），与 Spine 多文件导入一致。

## DragonBones 多文件（并行路径）

- **不**经过单文件 `importAssetFile`。`App.vue` 在多选且 **Spine 整包**（json+atlas）探测失败后，尝试 `dragonbonesRuntime.loadFromFiles`：`dbBundleLoader.tryLoadDragonBonesArmature` 解析 ske/tex + 图，`pixiDragonBonesEnv` 挂载全局 `PIXI` 与 `TARGET_FPMS` 后 **`dragonbones.js` / `PixiFactory`** 构建 `PixiArmatureDisplay`。
- `DragonBonesViewport` 内 `Application` + `viewRoot` 相机层适配/平移/缩放（与 Live2D 视口交互一致）；**时间轴**可 `play/stop`、`seek`（摄影表/曲线仍仅 Spine）。
- 成功回写 **Pinia `editor`**；dispose 时 `PixiFactory.factory.clear` 释放数据（与 Spine / Live2D 切换互不共用工厂单例外，需在 App 层先 `dispose` 各运行时）。

## 输出

- 轻量/元数据导入：写入 Pinia **`editor`**（`lastImport`、`lastFileName` 等；源码 `skin2d-editor/src/stores/editor.ts`）。
- Spine 多文件：另由 `spineRuntime` 持有纹理与动画状态。
- Live2D zip：`live2dRuntime.previewImport` + 画布就绪后再合并写回 `editor`。
- 属性面板展示 `ImportResult` 摘要；视口显示格式与骨架名等。

## 错误

- 解析异常：捕获并 `warnings.push` 人类可读信息，不崩溃应用。
