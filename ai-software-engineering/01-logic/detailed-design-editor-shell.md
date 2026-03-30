# 详细设计：编辑器壳

## 布局结构

- 根容器：`display: flex; flex-direction: column; height: 100vh`，字体 `Segoe UI Variable` / `Segoe UI`。
- **标题行**：应用名「Skin2D」、窗口控制占位（最小化/最大化/关闭仅视觉，浏览器内不连接系统 API）。
- **菜单栏**：文件（新建、打开、**导入…**、退出）、编辑、视图、帮助。
- **主体**：横向 flex，左侧固定宽度层级树，中央 flex 视口，右侧属性。
- **底部**：时间轴区域高度约 160px，含播放按钮占位。

## 主题

- 使用 CSS 变量：`--bg`、`--panel`、`--border`、`--accent`、`--text`。
- 浅色方案默认，与 Windows 11 浅色对齐。

## 交互

- 「导入」打开 `<input type="file">`，多选关闭；将 `File` 交给导入管线。
