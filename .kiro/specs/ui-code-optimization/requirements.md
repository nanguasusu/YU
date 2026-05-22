# Requirements Document

## Introduction

本规格描述对现有 Tauri + React 桌面计时组件的一批 UI 与代码质量优化。优化范围涵盖：TagPicker 与 ModeMenu 的入场动画、TagPicker 标签来源合并、`liveElapsedMs` 计算逻辑提取为共用 Hook、`flushCurrentSession` 重复逻辑提取为共用函数、TimerStartPage 按钮点击区域扩大、`record-error-toast` CSS 补全、进度条滚动条跨浏览器兼容、TimerTimelinePage `tl-*` CSS 类完整性、`useTimerRecords.addRecord` React 严格模式双调用修复，以及 ModeMenu `targetMode` 硬编码改为可扩展写法。所有改动均为对现有功能的优化，不引入新的业务功能。

## Glossary

- **TagPicker**：`src/components/TagPicker.tsx` 中的标签选择下拉组件，用于在计时器界面选择活动标签。
- **ModeMenu**：`src/components/ModeMenu.tsx` 中的模式切换弹出菜单，由顶栏品牌图标触发。
- **TimerStartPage**：`src/components/TimerStartPage.tsx` 中的计时器主操作页，包含开始/暂停/重置/结束按钮。
- **TimerTimelinePage**：`src/components/TimerTimelinePage.tsx` 中的今日时间线页，展示当日计时记录列表。
- **useLiveElapsedMs**：待新建的 `src/hooks/useLiveElapsedMs.ts`，封装实时已用毫秒数计算逻辑。
- **flushCurrentSession**：将当前计时会话写入记录并重置计时器的操作，目前在 `App.tsx` 多处重复实现。
- **useTimerRecords**：`src/hooks/useTimerRecords.ts` 中管理计时记录持久化的 Hook。
- **timerLabels**：`PersistedState.timerLabels`，存储在持久化状态中的预设标签字符串数组。
- **useTagStore**：`src/hooks/useTagStore.ts` 中管理用户自定义标签的 Hook，提供 `visibleCustomTags` 等派生数据。
- **record-error-toast**：计时记录存储失败时显示的错误提示浮层，CSS 类名为 `record-error-toast`。
- **progress-list-scroll**：进度条列表的可滚动容器，CSS 类名为 `progress-list-scroll`。
- **tl-\***：TimerTimelinePage 使用的一组 CSS 类，前缀为 `tl-`。
- **AppMode**：`'widget' | 'timer'`，应用的两种运行模式。
- **liveElapsedMs**：计时器当前实时已用毫秒数，由 `elapsedMs`、`lastStartedAt` 和当前时间戳计算得出。

---

## Requirements

### Requirement 1：TagPicker 与 ModeMenu 入场动画

**User Story:** As a 用户, I want TagPicker 下拉列表和 ModeMenu 弹出菜单在打开时有平滑的淡入+下滑动画, so that 交互体验与页面切换动画风格保持一致。

#### Acceptance Criteria

1. WHEN TagPicker 下拉列表从关闭变为打开，THE TagPicker 下拉列表 SHALL 以 opacity 从 0 渐变至 1、translateY 从 -4px 渐变至 0px 的动画呈现，动画时长不超过 200ms。
2. WHEN ModeMenu 从隐藏变为可见，THE ModeMenu SHALL 以 opacity 从 0 渐变至 1、translateY 从 -4px 渐变至 0px 的动画呈现，动画时长不超过 200ms。
3. THE TagPicker 下拉列表动画 SHALL 使用 CSS transition 或 Framer Motion `motion` 组件实现，与现有页面切换动画（`motion/react`）技术栈一致。
4. THE ModeMenu 动画 SHALL 使用 CSS transition 或 Framer Motion `motion` 组件实现，与现有页面切换动画技术栈一致。
5. WHEN TagPicker 下拉列表关闭，THE TagPicker 下拉列表 SHALL 立即从 DOM 中移除或隐藏，不播放退出动画（保持现有行为）。

---

### Requirement 2：TagPicker 标签来源合并

**User Story:** As a 用户, I want TagPicker 下拉列表同时展示预设标签和我创建的自定义标签, so that 我无需切换到设置页即可选择所有可用标签。

#### Acceptance Criteria

1. THE TagPicker 组件 SHALL 接受一个合并后的标签字符串数组作为 `labels` prop，该数组由调用方负责合并 `timerLabels`（预设标签）与 `useTagStore.visibleCustomTags`（自定义标签名称）。
2. WHEN `timerLabels` 与 `useTagStore.visibleCustomTags` 中存在同名标签，THE 调用方 SHALL 对合并数组执行去重，确保每个标签名称在列表中仅出现一次。
3. THE App.tsx 中传递给 MiniTimer 的 `timerLabels` prop SHALL 替换为合并去重后的完整标签数组。
4. THE TimerStartPage 中传递给 TagPicker 的 `labels` prop SHALL 替换为合并去重后的完整标签数组。
5. WHEN `useTagStore` 尚未完成加载（`isLoaded` 为 false），THE TagPicker 下拉列表 SHALL 仅展示 `timerLabels` 中的预设标签，不展示空列表。

---

### Requirement 3：提取 useLiveElapsedMs Hook

**User Story:** As a 开发者, I want `liveElapsedMs` 的计算逻辑集中在一个共用 Hook 中, so that App.tsx 和 TimerStartPage.tsx 不再各自维护重复的 `liveNow` 状态与 `setInterval` 逻辑。

#### Acceptance Criteria

1. THE 系统 SHALL 在 `src/hooks/useLiveElapsedMs.ts` 中新建 `useLiveElapsedMs` Hook，接受 `timerStatus: TimerStatus`、`elapsedMs: number`、`lastStartedAt: number | null` 三个参数，返回实时已用毫秒数（number）。
2. WHEN `timerStatus` 为 `'running'` 且 `lastStartedAt` 不为 null，THE `useLiveElapsedMs` Hook SHALL 每隔 1000ms 更新一次内部时间戳，使返回值实时递增。
3. WHEN `timerStatus` 不为 `'running'`，THE `useLiveElapsedMs` Hook SHALL 直接返回 `elapsedMs`，不启动 `setInterval`。
4. THE App.tsx 中的 `liveNow` state、相关 `useEffect` 及 `liveElapsedMs` 计算表达式 SHALL 替换为对 `useLiveElapsedMs` 的调用。
5. THE TimerStartPage.tsx 中的 `liveNow` state、相关 `useEffect` 及 `liveElapsedMs` 计算表达式 SHALL 替换为对 `useLiveElapsedMs` 的调用。
6. IF `useLiveElapsedMs` 组件卸载时计时器仍在运行，THEN THE `useLiveElapsedMs` Hook SHALL 清除 `setInterval`，不产生内存泄漏。

---

### Requirement 4：提取 flushCurrentSession 共用函数

**User Story:** As a 开发者, I want 将当前计时会话写入记录并重置计时器的逻辑提取为一个共用函数, so that App.tsx 中 `handleSelectTag`、`handleToggle`、`handleReset` 三处重复的 flush 逻辑得到统一维护。

#### Acceptance Criteria

1. THE 系统 SHALL 在 `App.tsx` 内部或独立 util 文件中定义 `flushCurrentSession` 函数，该函数封装"计算当前 elapsed → 调用 `tagStore.recordDuration` → 处理失败 → 返回成功/失败布尔值"的完整流程。
2. THE `handleSelectTag` 回调 SHALL 调用 `flushCurrentSession` 替换其内部的重复 flush 逻辑。
3. THE `handleToggle` 回调 SHALL 调用 `flushCurrentSession` 替换其内部的重复 flush 逻辑。
4. THE `handleReset` 回调 SHALL 调用 `flushCurrentSession` 替换其内部的重复 flush 逻辑。
5. IF `flushCurrentSession` 调用 `tagStore.recordDuration` 失败，THEN THE 函数 SHALL 调用 `setRecordError('存储失败，计时数据未保存')` 并返回 `false`，调用方据此决定是否继续执行后续操作。
6. WHEN `timerStatus` 不为 `'running'` 或 `activityTag` 为空字符串，THE `flushCurrentSession` 函数 SHALL 直接返回 `true`，不执行任何存储操作。

---

### Requirement 5：TimerStartPage 按钮点击区域扩大

**User Story:** As a 用户, I want 重置和结束按钮有更大的可点击区域, so that 在小屏幕或触控设备上更容易准确点击。

#### Acceptance Criteria

1. THE `tsp-btn-ghost` CSS 类 SHALL 设置 `padding` 使按钮的最小可点击高度不低于 36px、最小可点击宽度不低于 60px。
2. THE `tsp-btn-primary` CSS 类 SHALL 设置 `padding` 使按钮的最小可点击高度不低于 36px、最小可点击宽度不低于 72px。
3. THE 按钮视觉尺寸变化 SHALL 不破坏 `tsp-actions` 行的整体布局对齐。

---

### Requirement 6：补全 record-error-toast CSS 类定义

**User Story:** As a 开发者, I want `record-error-toast` CSS 类在 App.css 中有完整定义, so that 错误提示浮层在所有环境下均能正确渲染样式。

#### Acceptance Criteria

1. THE `App.css` SHALL 包含 `.record-error-toast` 选择器的完整样式定义，至少包含 `position`、`z-index`、`background`、`color`、`padding`、`border-radius` 属性。
2. THE `.record-error-toast` 样式 SHALL 将元素定位为固定浮层（`position: fixed`），使其在页面滚动时保持可见。
3. THE `.record-error-toast` 样式 SHALL 使用与现有错误色（`#ff453a`）视觉一致的背景或文字颜色。

---

### Requirement 7：进度条滚动条补充 Firefox 标准属性

**User Story:** As a 用户, I want 进度条列表的自定义滚动条样式在 Firefox 中也能生效, so that 跨浏览器视觉体验一致。

#### Acceptance Criteria

1. THE `.progress-list-scroll` CSS 规则块 SHALL 包含 `scrollbar-width: thin` 属性，以在 Firefox 中启用细滚动条。
2. THE `.progress-list-scroll` CSS 规则块 SHALL 包含 `scrollbar-color` 属性，其 thumb 颜色值与现有 `::-webkit-scrollbar-thumb` 的 `background` 值视觉一致（`rgba(134, 134, 139, 0.28)` 或等效值），track 颜色为 `transparent`。
3. THE 新增的 Firefox 属性 SHALL 与现有 `::-webkit-scrollbar` 系列规则共存，不删除现有 WebKit 规则。

---

### Requirement 8：TimerTimelinePage tl-* CSS 类完整性

**User Story:** As a 开发者, I want TimerTimelinePage 使用的所有 tl-* CSS 类均在样式文件中有定义, so that 时间线页面在所有环境下均能正确渲染，不出现无样式元素。

#### Acceptance Criteria

1. THE 样式文件 SHALL 为 `TimerTimelinePage.tsx` 中引用的每一个 `tl-*` CSS 类名提供对应的选择器定义，包括但不限于：`tl-page`、`tl-header`、`tl-title`、`tl-count`、`tl-scroll`、`tl-empty`、`tl-list`、`tl-item`、`tl-spine`、`tl-dot`、`tl-line`、`tl-content`、`tl-meta`、`tl-time-range`、`tl-duration`、`tl-item-title`、`tl-item-tag`。
2. IF 上述任意 `tl-*` 类在现有 CSS 文件中缺失，THEN THE 系统 SHALL 在对应样式文件中补全该类的基础布局与排版属性。
3. THE `tl-page` 类 SHALL 定义使页面占满父容器高度并支持内部滚动的布局属性。
4. THE `tl-scroll` 类 SHALL 定义 `overflow-y: auto` 以支持列表滚动。

---

### Requirement 9：修复 useTimerRecords.addRecord 严格模式双调用问题

**User Story:** As a 开发者, I want `useTimerRecords.addRecord` 在 React 严格模式下不产生重复记录, so that 开发环境与生产环境的记录数量保持一致。

#### Acceptance Criteria

1. THE `useTimerRecords.addRecord` 函数 SHALL 在同一渲染周期内对相同 `record.id` 的重复调用执行幂等处理，即第二次调用不向 `records` 数组追加重复条目。
2. WHEN `addRecord` 被调用时，THE 函数 SHALL 检查 `records` 数组中是否已存在相同 `id` 的记录，若存在则直接返回，不执行追加与持久化操作。
3. THE 幂等检查 SHALL 在 `setRecords` 的函数式更新回调内部执行，以确保基于最新 state 进行判断。

---

### Requirement 10：ModeMenu targetMode 改为可扩展写法

**User Story:** As a 开发者, I want ModeMenu 的目标模式计算逻辑不依赖硬编码的二元假设, so that 未来新增 AppMode 枚举值时无需修改 ModeMenu 内部逻辑。

#### Acceptance Criteria

1. THE `ModeMenu` 组件 SHALL 接受一个 `availableModes: AppMode[]` prop，列出所有可切换的目标模式（不含当前模式）。
2. THE `ModeMenu` 组件 SHALL 根据 `availableModes` 动态渲染切换按钮，每个可用模式对应一个 `menuitem` 按钮，而非硬编码单一 `targetMode`。
3. THE `App.tsx` 中渲染 `ModeMenu` 的调用处 SHALL 传入 `availableModes`，其值为从所有已知 `AppMode` 值中过滤掉当前 `appMode` 后的数组。
4. WHEN `availableModes` 为空数组，THE `ModeMenu` SHALL 不渲染任何切换按钮，仅展示当前模式指示器。
5. THE `MODE_LABELS` 映射 SHALL 保持为 `Record<AppMode, string>` 类型，以确保新增 AppMode 时 TypeScript 编译器能检测到缺失的标签定义。
