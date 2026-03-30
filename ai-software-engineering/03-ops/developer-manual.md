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

## Python 封装（仓库根）

实现目录为 `skin2d-editor/` 时，可在仓库根使用：

- `python build.py` — 安装依赖并生产构建
- `python test.py` — 冒烟（类型检查 + 构建）
- `python run.py` — 开发服务器
- `python publish.py` — 输出 `skin2d-editor/dist`
- `python dev.py` — 同 `run.py`（Node 项目开发态）

## 发布

- 产物为 `skin2d-editor/dist/`，可部署到任意静态托管。
