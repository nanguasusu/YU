# YU — 倒计时桌面小组件

一个基于 Tauri + React 构建的轻量桌面倒计时工具，支持多任务管理、统计记录和自定义设置。

## 功能特性

- **倒计时 / 正计时** — 灵活切换计时模式
- **任务管理** — 创建、编辑、删除多个计时任务
- **数据统计** — 记录历史完成情况
- **自定义设置** — 调整提示音、主题等偏好
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
