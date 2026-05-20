# YU — 倒计时桌面小组件

一个基于 Tauri + React 构建的轻量桌面倒计时工具，支持多任务管理、统计记录和自定义设置。

## 功能预览

### 📅 日期倒计时
设定目标日期，实时显示距离还有多少天。

![日期倒计时](https://img.nanguasu.cc/2026/05/fff059d4fa9d25ec73e8a86d356825af.webp)

### ✅ Todo 任务管理
创建和管理多个待办任务，配合倒计时一起使用。

![Todo 任务管理](https://img.nanguasu.cc/2026/05/7f24d04b8d2fc6cd819e4307cd438a6b.webp)

### 📊 进度条
直观展示时间进度，一眼看清剩余比例。

![进度条](https://img.nanguasu.cc/2026/05/aea1c8bab6f9d1aac7de1eaa8faae8a1.webp)

### 🕐 缩小迷你时钟
支持缩小为迷你悬浮时钟，不占桌面空间。

![迷你时钟](https://img.nanguasu.cc/2026/05/2b024317a86c18953de1a69bbe86c4e2.webp)

## 功能特性

- **日期倒计时** — 设定目标日期，倒数天数
- **Todo 任务管理** — 创建、编辑、删除多个计时任务
- **进度条显示** — 可视化时间进度
- **迷你悬浮时钟** — 缩小模式，随时查看不打扰工作
- **数据统计** — 记录历史完成情况
- **本地持久化** — 数据保存在本地，无需联网

## 技术栈

- [Tauri v2](https://tauri.app/) — 跨平台桌面框架
- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

## 本地运行

**前置要求：** Node.js、Rust

```bash
# 安装依赖
npm install

# 启动 Web 开发模式
npm run dev

# 启动 Tauri 桌面开发模式
npm run tauri:dev
```

## 构建打包

```bash
npm run tauri:build
```

构建产物在 `src-tauri/target/release/bundle/` 目录下。
