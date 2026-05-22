# Implementation Plan: UI Code Optimization

## Overview

本计划将 requirements.md 和 design.md 中描述的 10 项 UI 与代码质量优化逐步落地。改动集中在 hooks 层（新建 `useLiveElapsedMs`、修复 `addRecord` 幂等）、组件层（TagPicker/ModeMenu 动画、ModeMenu 可扩展 prop、TimerStartPage 按钮尺寸）、协调层（App.tsx 标签合并、`flushCurrentSession` 提取）以及 CSS 层（补全缺失类、Firefox 兼容）。所有改动均为对现有功能的优化，不引入新业务功能。

---

## Tasks

- [x] 1. 新建 `useLiveElapsedMs` Hook
  - [x] 1.1 在 `src/hooks/useLiveElapsedMs.ts` 中实现 Hook
    - 接受 `timerStatus: TimerStatus`、`elapsedMs: number`、`lastStartedAt: number | null` 三个参数，返回 `number`
    - 当 `timerStatus === 'running'` 时启动 `setInterval(1000ms)` 更新内部 `liveNow` 状态
    - 当 `timerStatus !== 'running'` 时直接返回 `elapsedMs`，不启动 interval
    - 在 cleanup 中清除 interval，防止内存泄漏
    - 在 `timerStatus`、`elapsedMs`、`lastStartedAt` 变化时同步刷新 `liveNow`
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

  - [x] 1.2 为 `useLiveElapsedMs` 编写属性测试
    - **Property 2: useLiveElapsedMs 运行时返回值 >= elapsedMs**
    - **Validates: Requirements 3.1, 3.2**
    - **Property 3: useLiveElapsedMs 非运行时返回原值**
    - **Validates: Requirements 3.3**

- [x] 2. 修复 `useTimerRecords.addRecord` 幂等性
  - [x] 2.1 在 `src/hooks/useTimerRecords.ts` 中修改 `addRecord`
    - 在 `setRecords` 的函数式更新回调内部检查 `prev.some(r => r.id === record.id)`
    - 若已存在相同 `id` 则直接返回 `prev`，不追加也不触发 `saveRecords`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 2.2 为 `addRecord` 幂等性编写属性测试
    - **Property 5: addRecord 幂等性——同一 record 调用任意次，records 中该 id 恰好出现一次**
    - **Validates: Requirements 9.1, 9.2**

- [x] 3. Checkpoint — 确认 Hook 层改动正确
  - 确保所有测试通过，如有疑问请向用户确认。

- [x] 4. 将 `App.tsx` 和 `TimerStartPage.tsx` 迁移到 `useLiveElapsedMs`
  - [x] 4.1 修改 `src/App.tsx`：替换 `liveNow` 逻辑
    - 删除 `liveNow` state、两个相关 `useEffect` 及 `liveElapsedMs` 计算表达式
    - 改为调用 `useLiveElapsedMs(state.timerStatus, state.elapsedMs, state.lastStartedAt)`
    - _Requirements: 3.4_

  - [x] 4.2 修改 `src/components/TimerStartPage.tsx`：替换 `liveNow` 逻辑
    - 删除组件内的 `liveNow` state、相关 `useEffect` 及 `liveElapsedMs` 计算表达式
    - 改为调用 `useLiveElapsedMs(state.timerStatus, state.elapsedMs, state.lastStartedAt)`
    - _Requirements: 3.5_

- [x] 5. 提取 `flushCurrentSession` 并统一三处 flush 逻辑
  - [x] 5.1 在 `src/App.tsx` 中定义 `flushCurrentSession` useCallback
    - 封装：检查 `timerStatus !== 'running'` 或 `activityTag.trim() === ''` 时直接返回 `true`
    - 计算 `elapsed`，调用 `tagStore.recordDuration`，失败时调用 `setRecordError` 并返回 `false`
    - _Requirements: 4.1, 4.5, 4.6_

  - [x] 5.2 用 `flushCurrentSession` 替换 `handleSelectTag`、`handleToggle`、`handleReset` 中的重复逻辑
    - `handleSelectTag`：调用 `flushCurrentSession()`，失败则 return，成功后继续执行 `touchTag` 和 `selectActivityTag`
    - `handleToggle`：仅在 `timerStatus === 'running'` 时调用 `flushCurrentSession()`，失败则 return
    - `handleReset`：调用 `flushCurrentSession()`，失败则 return，成功后调用 `state.resetTimer()`
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 6. 合并标签来源并传递给 TagPicker 和 MiniTimer
  - [x] 6.1 在 `src/App.tsx` 中计算 `mergedLabels`
    - 在渲染前合并 `state.timerLabels` 与 `tagStore.visibleCustomTags`（标签名称字符串数组）
    - 使用 `Array.from(new Set([...state.timerLabels, ...tagStore.visibleCustomTags]))` 去重
    - 当 `tagStore.isLoaded` 为 `false` 时，`mergedLabels` 仅使用 `state.timerLabels`
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 6.2 将 `mergedLabels` 传递给 `MiniTimer` 和 `TimerLayout`
    - 将 `MiniTimer` 的 `timerLabels` prop 替换为 `mergedLabels`
    - 将 `TimerLayout` 的 `timerLabels` prop 替换为 `mergedLabels`（最终传递到 `TimerStartPage` 的 `TagPicker`）
    - _Requirements: 2.3, 2.4_

  - [x] 6.3 为标签合并去重编写属性测试
    - **Property 1: 标签合并去重——结果数组中每个标签名称恰好出现一次，且包含两个输入数组的所有唯一标签**
    - **Validates: Requirements 2.1, 2.2**

- [x] 7. Checkpoint — 确认 App.tsx 协调层改动正确
  - 确保所有测试通过，如有疑问请向用户确认。

- [x] 8. 为 `ModeMenu` 添加入场动画并改为可扩展 prop
  - [x] 8.1 修改 `src/components/ModeMenu.tsx`：添加 `availableModes` prop 并动态渲染切换按钮
    - 在 `ModeMenuProps` 中新增 `availableModes: AppMode[]`
    - 删除硬编码的 `targetMode` 计算逻辑
    - 用 `availableModes.map(mode => <button ...>)` 动态渲染每个切换按钮
    - 当 `availableModes` 为空时不渲染任何切换按钮
    - 保持 `MODE_LABELS` 为 `Record<AppMode, string>` 类型
    - _Requirements: 10.1, 10.2, 10.4, 10.5_

  - [x] 8.2 在 `ModeMenu` 根元素上添加入场动画
    - 将根 `div` 替换为 `motion.div`（从 `motion/react` 导入）
    - 设置 `initial={{ opacity: 0, y: -4 }}`、`animate={{ opacity: 1, y: 0 }}`、`transition={{ duration: 0.15, ease: 'easeOut' }}`
    - _Requirements: 1.2, 1.4_

  - [x] 8.3 在 `src/App.tsx` 中更新 `ModeMenu` 调用处
    - 定义 `ALL_APP_MODES: AppMode[] = ['widget', 'timer']`
    - 传入 `availableModes={ALL_APP_MODES.filter(m => m !== appMode)}`
    - _Requirements: 10.3_

  - [x] 8.4 为 ModeMenu 按钮数量编写属性测试
    - **Property 6: ModeMenu 按钮数量与 availableModes 一致——渲染结果中 role="menuitem" 的按钮数量恰好等于 availableModes.length**
    - **Validates: Requirements 10.1, 10.2**

- [x] 9. 为 `TagPicker` 下拉列表添加入场动画
  - [x] 9.1 修改 `src/components/TagPicker.tsx`：用 `AnimatePresence` + `motion.div` 包裹下拉列表
    - 从 `motion/react` 导入 `motion` 和 `AnimatePresence`
    - 用 `<AnimatePresence>` 包裹条件渲染的下拉 `div`
    - 将下拉 `div` 替换为 `motion.div`，设置 `initial={{ opacity: 0, y: -4 }}`、`animate={{ opacity: 1, y: 0 }}`、`transition={{ duration: 0.15, ease: 'easeOut' }}`
    - 不设置 `exit` 属性，保持关闭时直接从 DOM 移除的现有行为
    - _Requirements: 1.1, 1.3, 1.5_

- [x] 10. 补全 CSS 样式
  - [x] 10.1 在 `src/App.css` 中补全 `.record-error-toast` 类定义
    - 添加 `position: fixed`、`bottom`、`left`、`transform`、`z-index: 9999`、`background: rgba(255, 69, 58, 0.92)`、`color: #fff`、`padding`、`border-radius`、`font-size`、`font-weight`、`box-shadow`、`pointer-events: none`、`white-space: nowrap`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 10.2 在 `src/App.css` 的 `.progress-list-scroll` 规则块中追加 Firefox 标准属性
    - 追加 `scrollbar-width: thin`
    - 追加 `scrollbar-color: rgba(134, 134, 139, 0.28) transparent`
    - 保留现有 `::-webkit-scrollbar` 系列规则不变
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 10.3 在 `src/App.css` 中补全 `tsp-btn-ghost` 和 `tsp-btn-primary` 按钮尺寸
    - `.tsp-btn-ghost`：设置 `min-height: 36px`、`min-width: 60px`、`padding: 8px 16px`
    - `.tsp-btn-primary`：设置 `min-height: 36px`、`min-width: 72px`、`padding: 8px 20px`
    - 确保不破坏 `tsp-actions` 行的整体布局对齐
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 10.4 在 `src/App.css` 中补全所有 `tl-*` CSS 类定义
    - 补全 `tl-page`（flex column，height: 100%，min-height: 0）
    - 补全 `tl-header`（flex，align-items: center，justify-content: space-between）
    - 补全 `tl-title`、`tl-count`（字体与颜色）
    - 补全 `tl-scroll`（flex: 1，overflow-y: auto，scrollbar-width: thin，scrollbar-color，WebKit scrollbar 规则）
    - 补全 `tl-empty`（居中，padding，颜色）
    - 补全 `tl-list`（flex column，gap: 0）
    - 补全 `tl-item`（flex，gap，padding）
    - 补全 `tl-spine`、`tl-dot`、`tl-line`（时间线竖轴布局）
    - 补全 `tl-content`、`tl-meta`、`tl-time-range`、`tl-duration`（内容区布局与字体）
    - 补全 `tl-item-title`、`tl-item-tag`（标题与标签样式）
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 11. Final Checkpoint — 确保所有改动集成正确
  - 确保所有测试通过，TypeScript 编译无错误，如有疑问请向用户确认。

---

## Notes

- 标有 `*` 的子任务为可选测试任务，可跳过以加快 MVP 交付
- 每个任务均引用了具体的需求条款以保证可追溯性
- 任务 1 → 4 → 5 → 6 存在依赖链，需按序执行
- 任务 2、8、9、10 相互独立，可与其他任务并行
- CSS 补全任务（10.1–10.4）均写入同一文件 `App.css`，需在不同 wave 中执行以避免冲突
- 属性测试验证设计文档中定义的 7 条正确性属性

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "4.1", "4.2"] },
    { "id": 2, "tasks": ["5.1", "8.1", "9.1", "10.1"] },
    { "id": 3, "tasks": ["5.2", "6.1", "8.2", "10.2"] },
    { "id": 4, "tasks": ["6.2", "8.3", "8.4", "10.3"] },
    { "id": 5, "tasks": ["6.3", "10.4"] }
  ]
}
```
