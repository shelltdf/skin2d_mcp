# Skin2D Editor（Vue 3）

Windows 风格壳层的 2D 骨骼蒙皮动画编辑器（Web）。工程说明与规格见仓库 `ai-software-engineering/`。

## 命令

- `npm install` — 安装依赖
- `npm run dev` — 开发服务器
- `npm run build` — 生产构建（输出 `dist/`）
- `npm run test` — 类型检查 + 构建（冒烟）

## 导入格式（MVP）

- **Spine** JSON 导出（含 `skeleton` + `bones`）
- **DragonBones** 使用 **`*_ske.json`** 等运行时骨架 JSON；**不支持** `.dbproj` 工程文件
- **glTF 2.0** `.gltf` / `.glb`（摘要节点/动画/皮肤数量）
