# 开发维护说明书

## 仓库结构

- `ai-software-engineering/`：四阶段文档（AI 工程文档）。
- `skin2d-editor/`：Vue 3 + Vite 实现（**不在** `ai-software-engineering/` 内）。

## 依赖

- Node.js LTS（建议 20+）。
- 在 `skin2d-editor/` 执行 `npm install`。

## 命令

| 操作 | 命令 |
|------|------|
| 开发 | `npm run dev` |
| 构建 | `npm run build` |
| 预览构建 | `npm run preview` |

## 视口与绘制顺序

- 各运行时视口分层、世界网格/原点形态（0→1 红绿轴）与 **Spine canvas 最后绘制原点**、**Pixi `originG` 每帧 `setChildIndex` 置顶**等约定，以 `ai-software-engineering/02-physical/skin2d-editor-web/spec.md` 与 `01-logic/detailed-design-viewport.md` 为准；实现入口见 `mapping.md` 中 `EditorViewport.vue`、`live2dRuntime.ts`、`dragonbonesRuntime.ts`。

## 调试与排障

- 应用内日志：Pinia `appLog` 收集导入/运行时/全屏等操作、警告与错误；状态栏显示最新一条，点击打开日志窗口。
- Vue 运行时错误：在 `main.ts` 的 `errorHandler` 中写入 `appLog`（便于在纯前端环境定位问题）。
- **Live2D zip**：依赖 `skin2d-editor/index.html` 在应用脚本**之前**加载的 **Cubism Core**（`window.Live2DCubismCore`），文件位于 **`skin2d-editor/public/vendor/live2dcubismcore.min.js`**（构建后复制到 `dist/vendor/`），**不依赖外网 CDN**；须遵守 Live2D 对 Core 的许可（可用官方 Cubism SDK for Web 中同名文件替换）。另依赖 **`jszip`** + `src/live2d/registerPixiZipLoader.ts` 为 `pixi-live2d-display` 注册 `ZipLoader`。缺任一项会表现为预览失败或控制台/日志中相关错误。

## UI 设置

- 多语言与主题：Pinia `uiSettings`（localStorage 持久化）；`applyToDom()` 会设置 `document.documentElement.lang` 与 `data-theme`。

## Python 封装（仓库根）

实现目录为 `skin2d-editor/` 时，可在仓库根使用：

- `python build.py` — 安装依赖并生产构建
- `python test.py` — 冒烟（类型检查 + 构建）
- `python run.py` — 开发服务器
- `python publish.py` — 输出 `skin2d-editor/dist`
- `python dev.py` — 同 `run.py`（Node 项目开发态）

## 发布

- 产物为 `skin2d-editor/dist/`，可部署到任意静态托管。
- **离线使用**：构建默认 `base: './'`，资源为相对路径；将 `dist/` 整体拷贝后在无网络环境用本地静态服（如 `npx serve dist`）或等价方式打开即可。**不得**依赖运行时访问 npm/CDN；Cubism Core 已随 `vendor/` 打包。
