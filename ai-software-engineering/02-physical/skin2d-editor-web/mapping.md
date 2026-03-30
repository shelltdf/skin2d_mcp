# 模型元素 → 源码路径

| 元素 | 路径 |
|------|------|
| 应用根组件 | `skin2d-editor/src/App.vue` |
| 支持格式说明对话框 | `skin2d-editor/src/components/FormatsHelpDialog.vue` |
| 全局样式 / Fluent 变量 | `skin2d-editor/src/styles/win11-theme.css` |
| 导入管线入口 | `skin2d-editor/src/importers/index.ts` |
| 导入前扩展名/JSON 形态检查 | `skin2d-editor/src/importers/importGuards.ts` |
| Spine 多文件运行时加载 | `skin2d-editor/src/spine/spineBundleLoader.ts` |
| Spine 运行时状态（播放/动画） | `skin2d-editor/src/stores/spineRuntime.ts` |
| Spine JSON 解析 | `skin2d-editor/src/importers/spine.ts` |
| Live2D model3.json | `skin2d-editor/src/importers/live2d.ts` |
| DragonBones 解析 | `skin2d-editor/src/importers/dragonbones.ts` |
| dbproj 工程归一化 / 导入 | `skin2d-editor/src/importers/dbproj.ts` |
| glTF 摘要 | `skin2d-editor/src/importers/gltf.ts` |
| 状态 | `skin2d-editor/src/stores/editor.ts` |
| 视口显示层开关 | `skin2d-editor/src/stores/viewportDisplay.ts` |
| 层级树 / 选中项 | `skin2d-editor/src/stores/hierarchySelection.ts`、`skin2d-editor/src/lib/hierarchyTree.ts` |
| 骨骼树分支（递归） | `skin2d-editor/src/components/HierarchyBoneBranch.vue` |
| Spine 贴图/网格分层绘制 | `skin2d-editor/src/spine/spineAttachmentLayers.ts` |
| 视口画布 | `skin2d-editor/src/components/EditorViewport.vue` |
| 时间轴（Spine 动画选择） | `skin2d-editor/src/components/TimelinePanel.vue` |
