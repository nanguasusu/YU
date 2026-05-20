# Frontend Handoff / 产品前端构建说明

本文档用于把当前项目前端部分完整交接给其他 AI（或开发者）。  
目标是让接手方在不依赖历史对话的情况下，快速理解、运行、修改并稳定迭代本项目。

## 1. 项目定位

- 产品形态：桌面倒计时任务小组件（Tauri + React）。
- 当前交接范围：仅前端（`src/`），不包含 Rust/Tauri 后端能力扩展。
- UI 核心模块：
1. 倒计时视图（目标日期 + 剩余天数）
2. 任务清单（增删改查 + 完成态）
3. 进度条（可新增、累计、编辑总数、带小旗帜终点标识）
4. 设置（样式、透明度、静音、主题色等）

## 2. 技术栈与运行环境

- Node + npm
- React 19 + TypeScript
- Vite 6
- Motion（动画）
- Lucide React（图标）
- Tauri API（仅前端调用窗口能力）

关键配置文件：
- [package.json](/D:/A%20ai%20coding/Yu/tst/package.json)
- [vite.config.ts](/D:/A%20ai%20coding/Yu/tst/vite.config.ts)
- [tsconfig.json](/D:/A%20ai%20coding/Yu/tst/tsconfig.json)

## 3. 启动与构建命令（前端）

在项目根目录执行：

```bash
npm install
npm run dev
```

默认本地地址（由脚本指定）：
- `http://localhost:3000`

前端构建：

```bash
npm run build
```

本地预览：

```bash
npm run preview
```

类型检查（推荐在每次提交前运行）：

```bash
npm run lint
```

## 4. 目录与文件职责

前端核心文件：

- [src/main.tsx](/D:/A%20ai%20coding/Yu/tst/src/main.tsx)
  - React 入口挂载
  - 全局禁用右键与双击默认行为（注意：这会影响部分原生双击行为）
- [src/App.tsx](/D:/A%20ai%20coding/Yu/tst/src/App.tsx)
  - 主页面全部业务逻辑与 UI 渲染
  - 状态初始化、持久化、交互事件、动画逻辑都在此文件
- [src/App.css](/D:/A%20ai%20coding/Yu/tst/src/App.css)
  - 主样式定义（布局、组件态、动画、响应式）
- [src/index.css](/D:/A%20ai%20coding/Yu/tst/src/index.css)
  - 全局基础样式

当前状态：`App.tsx` 偏“单体组件”架构。后续若继续扩展，建议拆分组件与 hooks（见第 10 节）。

## 5. 状态模型与持久化

本地存储键：
- `countdown-task-widget-state`

状态结构（`PersistedState`）包含：
- `targetTitle`
- `targetDate`
- `countdownStyle`
- `muted`
- `opacity`
- `widgetWidth`
- `tasks`
- `progressItems`
- `accentColor`

关键行为：
1. 启动时通过 `loadPersistedState()` 读取并做容错兜底。
2. 运行中通过 `useEffect` 在依赖变更时写回 `localStorage`。
3. 对脏数据有修复逻辑（例如 total 最小值、颜色兜底、标题空值修复）。

## 6. 主要交互逻辑

### 6.1 倒计时

- 输入目标日期后计算 `d`（剩余天数）。
- 到期后进入 overdue 展示态。
- 支持目标名称内联编辑、日期点击编辑。

### 6.2 任务

- 新增：输入框回车提交
- 完成：点击复选按钮切换
- 删除：仅完成态显示删除按钮
- 清空完成：仅 `completedCount > 0` 时展示

### 6.3 进度条

- 点击进度条：`current + 1`，上限 `total`
- `total` 可编辑，自动约束 `>=1`
- 样式按进度百分比映射 tone（start/low/mid/high/complete）
- 已加入小旗帜标识：
  - 节点：`progress-flag`
  - 位置：通过 `left: ${percent}%` 跟随进度末端

### 6.4 窗口与拖拽

- 宽度调整：调用 `startResizeDragging('East')`
- 顶部拖拽：通过 `data-tauri-drag-region` 区域处理
- 顶部双击：已显式 `preventDefault + stopPropagation`，降低“全屏抽搐”概率

## 7. 样式系统说明

样式主要集中在 [src/App.css](/D:/A%20ai%20coding/Yu/tst/src/App.css)。

关键区域：
1. 顶部栏：`.top-bar`, `.top-bar-minimized`, `.top-bar-drag-zone`
2. 内容区：`.content-area`
3. 任务区：`.task-*`
4. 进度区：`.progress-*`
5. 底部导航：`.bottom-nav`, `.nav-btn-*`
6. 响应式：`@media (max-width: 480px)`

进度条视觉相关重点：
- `.progress-track`：轨道层
- `.progress-fill`：填充层
- `.progress-flag`：旗杆 + 旗面（`::before`）
- `.progress-tone-*`：色彩变量

## 8. 已知风险与注意事项

1. `App.tsx` 体积较大（高耦合）。
2. 全局禁止双击（`main.tsx`）可能与某些窗口行为冲突。
3. 样式大多为手写类名，缺少 design token 分层。
4. 动画与交互状态都集中在同一组件，后续改动易出现回归。

## 9. 给接手 AI 的快速任务清单

建议按顺序执行：

1. 跑通环境：`npm install && npm run dev`
2. 建立基线：`npm run build && npm run lint`
3. 手动验收四个 Tab：timer / tasks / stats / settings
4. 验证持久化：刷新后状态是否完整恢复
5. 验证边界：
   - `progress current == total`
   - `total` 输入非法值
   - 最小化/展开切换动画
   - 窄屏（<=480px）布局

## 10. 推荐重构路线（仅前端）

建议拆分为以下结构：

1. 组件拆分
- `components/TopBar.tsx`
- `components/TimerPanel.tsx`
- `components/TaskPanel.tsx`
- `components/ProgressPanel.tsx`
- `components/SettingsPanel.tsx`

2. 逻辑拆分
- `hooks/usePersistedState.ts`
- `hooks/useWindowResize.ts`
- `hooks/useCountdown.ts`
- `hooks/useSound.ts`

3. 类型拆分
- `types/widget.ts`

4. 样式策略
- 保持 CSS 也可，但建议引入分文件：
  - `styles/layout.css`
  - `styles/progress.css`
  - `styles/tasks.css`
  - `styles/settings.css`

## 11. 交接结论

当前前端可稳定运行并完成核心功能。  
如果后续由其他 AI 接手，建议先“保行为重构”（不改交互语义，只拆结构），再进入视觉迭代和新功能开发。

