
<h1 style="font-size: 24px" align="center"> 屿时钟 </h1>
<p align="center">
  <a href="./README_EN.md" style="text-decoration: none; padding: 4px 12px; border-radius: 6px; background-color: #f0f0f0; color: #555; font-size: 14px;">English</a>
  &nbsp;
  <b style="padding: 4px 12px; border-radius: 6px; background-color: #4FC7CF; color: #fff; font-size: 14px;">简体中文</b>
</p>

一个轻量、柔和、可自定义的桌面悬浮小组件。

屿时钟支持 **桌面挂件模式** 和 **计时钟模式**：既可以把重要目标、待办任务和进度放在桌面上，也可以记录学习、编程、阅读、休息等时间，生成今日时间线与统计。

<p align="center">
  <img src="https://img.nanguasu.cc/2026/05/a7f34acf60228a03a686b2b4d1ff8fb1.webp" width="186" alt="屿时钟图标" style="border-radius: 12px;" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-4FC7CF?style=flat" alt="version" />
  <img src="https://img.shields.io/badge/license-MIT-36C26B?style=flat" alt="license" />
  <img src="https://img.shields.io/badge/Tauri-2.0-FFC857?style=flat" alt="Tauri" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat" alt="React" />
</p>

---

## 预览

### 桌面挂件模式

把重要目标、待办任务和进度条轻轻放在桌面上，像一个安静的提醒面板。

<p align="center">
  <img src="https://img.nanguasu.cc/2026/05/fbe33c9a8f1c827f4c35a1afedacf901.webp" alt="桌面挂件模式" />
</p>

### 计时钟模式

选择标签后开始计时，缩小后变成迷你时钟，结束后自动进入时间线并生成今日统计。

<p align="center">
  <img src="https://img.nanguasu.cc/2026/05/aa8acef0c9f60ec2eecffe81bb37f6c4.webp" alt="计时钟模式" />
</p>

---

## 功能特性

- **桌面挂件模式**：倒计时、待办任务、进度条
- **计时钟模式**：标签计时、暂停/继续、结束记录
- **迷你时钟**：缩小后保留核心计时信息，适合专注时悬浮在桌面
- **今日时间线**：记录每一段时间花在哪里
- **今日统计**：按标签统计时长和占比
- **全局自定义**：支持主题色、透明度、字体、常用标签等设置
- **托盘控制**：支持显示/隐藏、设置、模式切换与退出

---

## 功能展示

### 待办任务

记录近期要完成的事项，支持截止提示。

<p align="center">
  <img src="https://img.nanguasu.cc/2026/05/d3044d857d5d6cca4929c97e8ee70f70.webp" alt="待办任务" />
</p>

### 进度条

用进度条追踪论文、项目、学习计划等长期目标。

<p align="center">
  <img src="https://img.nanguasu.cc/2026/05/7ba9aa682a35a7285d7408c3bf871644.webp" alt="进度条" />
</p>

### 迷你时钟

计时钟模式下可以缩小为迷你时钟，只保留当前标签、状态和计时时间。

<p align="center">
  <img src="https://img.nanguasu.cc/2026/05/cda770decc5d6c9d72df118d73c714da.webp" alt="迷你时钟" />
</p>

### 今日时间线

每次计时结束后生成一条记录，方便回顾一天的时间流向。

<p align="center">
  <img src="https://img.nanguasu.cc/2026/05/f611b43929f50c694f2351e5d6284d40.webp" alt="今日时间线" />
</p>

### 今日统计

根据时间线自动统计各标签耗时和占比。

<p align="center">
  <img src="https://img.nanguasu.cc/2026/05/ca2899f407faa394deace141e7a8cb91.webp" alt="今日统计" />
</p>

---

## 两种模式

### 桌面挂件

适合长期放在桌面上，用来查看：

- 距离目标日期还有多久
- 今天或近期有哪些待办
- 当前目标完成了多少

### 计时钟

适合正在学习、科研、编程或阅读时使用：

- 选择常用标签
- 开始计时
- 暂停或继续
- 结束后写入时间线
- 自动生成今日统计

---

## 自定义设置

屿时钟支持根据自己的桌面风格调整外观与行为：

- 全局主题色
- 透明度
- 倒计时字体
- 静音开关
- 开机自启动
- 常用计时标签

---

## 技术栈

- [Tauri 2.0](https://tauri.app/) — 轻量跨端桌面框架
- [React 19](https://react.dev/) — 前端 UI 框架
- [Vite](https://vite.dev/) — 构建工具
- [TypeScript](https://www.typescriptlang.org/) — 类型安全
- 样式方案：按项目实际情况填写（例如 Tailwind CSS / UnoCSS / CSS Modules 等）

---

## 开发状态

当前仍在持续开发和打磨中。

计划中的优化方向：

- 更完善的标签管理
- 标签颜色自定义
- 更细致的时间统计
- 更自然的迷你态交互
- 更完整的设置分组

---

## 适合谁使用

屿时钟适合希望在桌面上轻量管理目标与时间的人：

- 学生 / 研究生
- 开发者
- 写作者
- 自学者
- 喜欢桌面小组件的人

---

## License

[MIT License](./LICENSE)
