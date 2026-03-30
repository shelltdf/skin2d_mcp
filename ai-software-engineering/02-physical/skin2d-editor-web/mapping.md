# 模型元素 → 源码路径

| 元素 | 路径 |
|------|------|
| 应用根组件 | `skin2d-editor/src/App.vue` |
| Dock 布局状态（左/右/底 + 尺寸） | `skin2d-editor/src/stores/dockLayout.ts` |
| UI 设置（语言/主题） | `skin2d-editor/src/stores/uiSettings.ts` |
| 应用日志（操作/告警/错误） | `skin2d-editor/src/stores/appLog.ts` |
| 状态栏（点击打开日志） | `skin2d-editor/src/components/AppStatusBar.vue` |
| 日志窗口（纯文本控制台） | `skin2d-editor/src/components/LogPanelDialog.vue` |
| 支持格式说明对话框 | `skin2d-editor/src/components/FormatsHelpDialog.vue` |
| 全局样式 / Fluent 变量 | `skin2d-editor/src/styles/win11-theme.css` |
| 全局入口（启动加载 UI 设置、Vue 错误上报到日志） | `skin2d-editor/src/main.ts` |
| 导入管线入口 | `skin2d-editor/src/importers/index.ts` |
| 导入前扩展名/JSON 形态检查 | `skin2d-editor/src/importers/importGuards.ts` |
| Spine 多文件运行时加载 | `skin2d-editor/src/spine/spineBundleLoader.ts` |
| Spine 运行时状态（播放/动画） | `skin2d-editor/src/stores/spineRuntime.ts` |
| Spine JSON 解析 | `skin2d-editor/src/importers/spine.ts` |
| Live2D model3 解析（仅 zip 内，`parseLive2dModel3`） | `skin2d-editor/src/importers/live2d.ts`；由 `extractZipModel3` 调用 |
| Live2D zip 元数据提取 | `skin2d-editor/src/live2d/extractZipModel3.ts` |
| Live2D 运行时（JSZip 注册 ZipLoader + pixi-live2d-display） | `skin2d-editor/src/stores/live2dRuntime.ts`、`skin2d-editor/src/live2d/registerPixiZipLoader.ts` |
| Live2D 视口挂载 | `skin2d-editor/src/components/Live2DViewport.vue` |
| DragonBones 解析 | `skin2d-editor/src/importers/dragonbones.ts` |
| glTF 摘要 | `skin2d-editor/src/importers/gltf.ts` |
| 状态 | `skin2d-editor/src/stores/editor.ts` |
| 视口显示层开关 | `skin2d-editor/src/stores/viewportDisplay.ts` |
| 层级树 / 选中项 | `skin2d-editor/src/stores/hierarchySelection.ts`、`skin2d-editor/src/lib/hierarchyTree.ts` |
| 骨骼树分支（递归） | `skin2d-editor/src/components/HierarchyBoneBranch.vue` |
| Spine 贴图/网格分层绘制 | `skin2d-editor/src/spine/spineAttachmentLayers.ts` |
| 视口画布 | `skin2d-editor/src/components/EditorViewport.vue` |
| 时间轴（播放/寻帧 + Dope/曲线只读） | `skin2d-editor/src/components/TimelinePanel.vue` |
