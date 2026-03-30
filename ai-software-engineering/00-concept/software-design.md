# 软件设计

## 总览

- **壳层**：Vue 3 单页应用（Vite 构建），组件化布局模拟 Windows 桌面应用分区。
- **状态**：Pinia 管理当前工程、选中节点、导入解析结果摘要。
- **视口**：主流程为 Spine 的 2D Canvas 与 Live2D/DragonBones 的 WebGL（Pixi）；含可选世界网格与 **世界原点短轴**（+X/+Y 各 0→1 单位，红/绿），详见逻辑/物理层视口文档。
- **导入子系统**：按格式分模块（Spine JSON、DragonBones、glTF 等），统一输出内部 `ImportedRigSummary`（见物理规格）。

## 模块

| 模块 | 职责 |
|------|------|
| `layouts` | 主窗口、面板、菜单栏 |
| `stores` | 工程与 UI 状态 |
| `importers` | 各格式解析与归一化 |
| `viewport` | 画布与坐标系（MVP 简化） |

## 与构建目标对应关系

主交付物为 Web 前端 `skin2d-editor-web`（参见 `02-physical/skin2d-editor-web/`）。
