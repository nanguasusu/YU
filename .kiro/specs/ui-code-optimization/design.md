# Design Document: UI Code Optimization

## Overview

本文档描述对现有 Tauri + React 桌面计时组件的一批 UI 与代码质量优化的架构设计。所有改动均为对现有功能的优化，不引入新的业务功能。技术栈：React 19、TypeScript、Tauri v2、`motion/react`、`lucide-react`、Tailwind CSS v4。

---

## Architecture

### 整体架构不变

本次优化不改变应用的整体架构（Tauri shell + React SPA + 持久化 Store）。改动集中在以下层次：

```
App.tsx (协调层)
├── hooks/
│   ├── useLiveElapsedMs.ts   ← 新建：提取实时计时逻辑
│   ├── useTimerRecords.ts    ← 修改：addRecord 幂等修复
│   ├── useTagStore.ts        ← 不变
│   └── useAppMode.ts         ← 不变
├── components/
│   ├── TagPicker.tsx         ← 修改：入场动画
│   ├── ModeMenu.tsx          ← 修改：入场动画 + availableModes prop
│   ├── TimerStartPage.tsx    ← 修改：使用 useLiveElapsedMs + 按钮尺寸
│   └── TimerTimelinePage.tsx ← 不变（CSS 补全）
└── App.css / index.css       ← 修改：补全缺失 CSS 类
```

### 数据流变化

**标签合并（Requirement 2）**：标签合并逻辑上移至 `App.tsx`，在调用 `TagPicker` 和 `MiniTimer` 之前计算 `mergedLabels`：

```
usePersistedState.timerLabels  ─┐
                                 ├─→ mergedLabels (去重) ─→ TagPicker.labels
useTagStore.visibleCustomTags  ─┘                        ─→ MiniTimer.timerLabels
```

**实时计时（Requirement 3）**：`liveElapsedMs` 计算从 `App.tsx` 和 `TimerStartPage.tsx` 中提取到 `useLiveElapsedMs` Hook：

```
timerStatus + elapsedMs + lastStartedAt
        ↓
  useLiveElapsedMs()  ←  setInterval(1000ms, when running)
        ↓
  liveElapsedMs: number
```

**会话刷新（Requirement 4）**：`flushCurrentSession` 作为 `useCallback` 定义在 `App.tsx` 内部，被三个事件处理器共享：

```
handleSelectTag ─┐
handleToggle    ─┼─→ flushCurrentSession → tagStore.recordDuration
handleReset     ─┘                       → setRecordError (on failure)
```

---

## Components

### 1. `useLiveElapsedMs` Hook（新建）

**文件**：`src/hooks/useLiveElapsedMs.ts`

**接口**：
```typescript
function useLiveElapsedMs(
  timerStatus: TimerStatus,
  elapsedMs: number,
  lastStartedAt: number | null,
): number
```

**实现逻辑**：
```typescript
export function useLiveElapsedMs(
  timerStatus: TimerStatus,
  elapsedMs: number,
  lastStartedAt: number | null,
): number {
  const [liveNow, setLiveNow] = useState(() => Date.now());

  useEffect(() => {
    if (timerStatus !== 'running') return;
    const id = window.setInterval(() => setLiveNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timerStatus]);

  useEffect(() => {
    setLiveNow(Date.now());
  }, [timerStatus, elapsedMs, lastStartedAt]);

  if (timerStatus !== 'running' || lastStartedAt === null) {
    return elapsedMs;
  }
  return elapsedMs + Math.max(0, liveNow - lastStartedAt);
}
```

**关键设计决策**：
- 当 `timerStatus !== 'running'` 时不启动 `setInterval`，避免不必要的重渲染
- 在 `useEffect` cleanup 中清除 interval，防止内存泄漏
- 使用函数式 `useState` 初始化避免 SSR 问题

---

### 2. `TagPicker` 入场动画（修改）

**文件**：`src/components/TagPicker.tsx`

将下拉列表的条件渲染替换为 `motion.div`，使用 `AnimatePresence` 包裹（仅入场，无退出动画）：

```typescript
import { motion, AnimatePresence } from 'motion/react';

// 在 JSX 中：
<AnimatePresence>
  {isOpen && dropdownPos && (
    <motion.div
      className="tag-picker-dropdown"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: dropdownPos.top,
        left: dropdownPos.left,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ... */}
    </motion.div>
  )}
</AnimatePresence>
```

**关键设计决策**：
- 不设置 `exit` 属性，`AnimatePresence` 在元素离开时直接移除，保持现有行为（Requirement 1.5）
- `duration: 0.15s`，满足"不超过 200ms"约束
- `y: -4` 对应 `translateY(-4px)`，与 ModeMenu 动画风格一致

---

### 3. `ModeMenu` 入场动画 + `availableModes` prop（修改）

**文件**：`src/components/ModeMenu.tsx`

**接口变更**：
```typescript
interface ModeMenuProps {
  appMode: AppMode;
  accentColor: string;
  onSwitch: (mode: AppMode) => void;
  onClose: () => void;
  availableModes: AppMode[];  // 新增
}
```

**动画**：将根 `div` 替换为 `motion.div`：
```typescript
import { motion } from 'motion/react';

<motion.div
  className="mode-menu"
  initial={{ opacity: 0, y: -4 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.15, ease: 'easeOut' }}
  ref={menuRef}
  role="menu"
  aria-label="模式切换"
  onMouseDown={(e) => e.stopPropagation()}
>
```

**动态渲染切换按钮**：
```typescript
// 移除硬编码的 targetMode
// const targetMode: AppMode = appMode === 'widget' ? 'timer' : 'widget';

// 改为动态渲染
{availableModes.map((mode) => (
  <button
    key={mode}
    type="button"
    className="mode-menu-switch"
    role="menuitem"
    onMouseDown={(e) => e.stopPropagation()}
    onClick={() => {
      onSwitch(mode);
      onClose();
    }}
  >
    切换到{MODE_LABELS[mode]}
  </button>
))}
```

**`App.tsx` 调用处**：
```typescript
const ALL_APP_MODES: AppMode[] = ['widget', 'timer'];

<ModeMenu
  appMode={appMode}
  accentColor={state.accentColor}
  onSwitch={(mode: AppMode) => void setAppMode(mode)}
  onClose={() => setModeMenuOpen(false)}
  availableModes={ALL_APP_MODES.filter((m) => m !== appMode)}
/>
```

---

### 4. `flushCurrentSession`（App.tsx 内部 useCallback）

**文件**：`src/App.tsx`

```typescript
const flushCurrentSession = useCallback(async (): Promise<boolean> => {
  // 不需要 flush 的情况
  if (state.timerStatus !== 'running' || !state.activityTag.trim()) {
    return true;
  }

  const now = Date.now();
  const elapsed =
    state.elapsedMs + Math.max(0, now - (state.lastStartedAt ?? now));

  if (elapsed < 1000) return true;

  const result = await tagStore.recordDuration(state.activityTag, elapsed);
  if (!result.success) {
    setRecordError('存储失败，计时数据未保存');
    return false;
  }
  return true;
}, [state.timerStatus, state.activityTag, state.elapsedMs, state.lastStartedAt, tagStore]);
```

**三个处理器简化后的结构**：
```typescript
const handleSelectTag = useCallback(async (newTag: string) => {
  const ok = await flushCurrentSession();
  if (!ok) return;
  if (newTag.trim()) void tagStore.touchTag(newTag);
  state.selectActivityTag(newTag);
}, [flushCurrentSession, tagStore, state]);

const handleToggle = useCallback(async () => {
  if (!state.activityTag.trim()) return;
  if (state.timerStatus === 'running') {
    const ok = await flushCurrentSession();
    if (!ok) return;
  }
  state.toggleTimer();
}, [flushCurrentSession, state]);

const handleReset = useCallback(async () => {
  const ok = await flushCurrentSession();
  if (!ok) return;
  state.resetTimer();
}, [flushCurrentSession, state]);
```

---

### 5. `TimerStartPage` 按钮尺寸（修改）

**文件**：`src/index.css` 或对应 CSS 文件中的 `tsp-*` 类

```css
.tsp-btn-ghost {
  /* 现有样式保持不变，补充 padding */
  min-height: 36px;
  min-width: 60px;
  padding: 8px 16px;
}

.tsp-btn-primary {
  min-height: 36px;
  min-width: 72px;
  padding: 8px 20px;
}
```

---

### 6. `useTimerRecords.addRecord` 幂等修复（修改）

**文件**：`src/hooks/useTimerRecords.ts`

```typescript
const addRecord = useCallback(async (record: TimerRecord) => {
  if (record.duration < 1000) return;

  setRecords((prev) => {
    // 幂等检查：相同 id 已存在则跳过
    if (prev.some((r) => r.id === record.id)) return prev;
    const updated = [...prev, record];
    void saveRecords(updated);
    return updated;
  });
}, []);
```

**关键设计决策**：
- 幂等检查在 `setRecords` 的函数式更新回调内部执行，确保基于最新 state 判断（Requirement 9.3）
- 不改变外部接口，调用方无需修改

---

### 7. CSS 补全

#### 7.1 `record-error-toast`（`App.css`）

```css
.record-error-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: rgba(255, 69, 58, 0.92);
  color: #fff;
  padding: 0.6rem 1.2rem;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(255, 69, 58, 0.28);
  pointer-events: none;
  white-space: nowrap;
}
```

#### 7.2 `progress-list-scroll` Firefox 兼容（`App.css`）

在现有 `.progress-list-scroll` 规则块中追加：
```css
.progress-list-scroll {
  /* 现有 WebKit 规则保持不变 */
  /* 新增 Firefox 标准属性 */
  scrollbar-width: thin;
  scrollbar-color: rgba(134, 134, 139, 0.28) transparent;
}
```

#### 7.3 `tl-*` CSS 类完整定义

在 `src/index.css` 或独立 `timer-timeline.css` 中补全所有 `tl-*` 类：

```css
/* ── TimerTimelinePage ── */
.tl-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.tl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.tl-title {
  font-size: 14px;
  font-weight: 600;
  color: #86868b;
  letter-spacing: 0.04em;
}

.tl-count {
  font-size: 12px;
  color: #86868b;
  font-weight: 500;
}

.tl-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(134, 134, 139, 0.28) transparent;
}

.tl-scroll::-webkit-scrollbar {
  width: 4px;
}

.tl-scroll::-webkit-scrollbar-thumb {
  background: rgba(134, 134, 139, 0.28);
  border-radius: 999px;
}

.tl-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
  color: #86868b;
  font-size: 13px;
}

.tl-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tl-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.tl-spine {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 12px;
  padding-top: 4px;
}

.tl-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tl-line {
  flex: 1;
  width: 1px;
  background: rgba(134, 134, 139, 0.2);
  margin-top: 4px;
  min-height: 12px;
}

.tl-content {
  flex: 1;
  min-width: 0;
  padding-bottom: 0.5rem;
}

.tl-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 2px;
}

.tl-time-range {
  font-size: 11px;
  color: #86868b;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.tl-duration {
  font-size: 11px;
  color: #86868b;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.tl-item-title {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tl-item-tag {
  display: inline-block;
  margin-top: 2px;
  font-size: 11px;
  color: #86868b;
  background: rgba(134, 134, 139, 0.1);
  padding: 1px 6px;
  border-radius: 999px;
}
```

---

## Data Models

本次优化不引入新的数据模型。涉及的现有类型：

```typescript
// types.ts（不变）
type TimerStatus = 'idle' | 'running' | 'paused';
type AppMode = 'widget' | 'timer';
type TimerRecord = { id: string; duration: number; /* ... */ };
```

`useLiveElapsedMs` 的输入/输出类型：
```typescript
// 输入
timerStatus: TimerStatus
elapsedMs: number        // >= 0
lastStartedAt: number | null

// 输出
liveElapsedMs: number    // >= 0，当 running 时实时递增
```

---

## Interfaces

### `useLiveElapsedMs`

```typescript
// src/hooks/useLiveElapsedMs.ts
export function useLiveElapsedMs(
  timerStatus: TimerStatus,
  elapsedMs: number,
  lastStartedAt: number | null,
): number
```

### `ModeMenu` props（变更）

```typescript
interface ModeMenuProps {
  appMode: AppMode;
  accentColor: string;
  onSwitch: (mode: AppMode) => void;
  onClose: () => void;
  availableModes: AppMode[];  // 新增，替代内部硬编码的 targetMode
}
```

### `flushCurrentSession`（App.tsx 内部）

```typescript
// 不导出，仅在 App.tsx 内部使用
const flushCurrentSession: () => Promise<boolean>
// 返回 true：flush 成功或无需 flush
// 返回 false：recordDuration 失败，已设置 recordError
```

---

## Error Handling

### 存储失败

`flushCurrentSession` 统一处理 `tagStore.recordDuration` 失败：
- 调用 `setRecordError('存储失败，计时数据未保存')`
- 返回 `false`，调用方（`handleSelectTag`/`handleToggle`/`handleReset`）据此中止后续操作
- 错误信息通过 `record-error-toast` 浮层展示，3 秒后自动清除（现有逻辑不变）

### `addRecord` 幂等

React 严格模式下 `useEffect` 双调用可能导致 `addRecord` 被调用两次。通过在 `setRecords` 函数式更新中检查 `id` 唯一性，确保重复调用不产生重复记录，不抛出错误。

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 标签合并去重

*For any* `timerLabels` 字符串数组和 `visibleCustomTags` 字符串数组，将两者合并后执行去重，结果数组中每个标签名称应恰好出现一次，且结果包含两个输入数组中的所有唯一标签名称。

**Validates: Requirements 2.1, 2.2**

---

### Property 2: useLiveElapsedMs 运行时返回值单调递增

*For any* `elapsedMs >= 0` 和 `lastStartedAt`（不为 null），当 `timerStatus = 'running'` 时，`useLiveElapsedMs` 的返回值应始终大于或等于 `elapsedMs`，且随时间推移单调递增。

**Validates: Requirements 3.1, 3.2**

---

### Property 3: useLiveElapsedMs 非运行时返回原值

*For any* `elapsedMs >= 0`，当 `timerStatus` 为 `'idle'` 或 `'paused'` 时，`useLiveElapsedMs` 的返回值应恒等于 `elapsedMs`，不受时间流逝影响。

**Validates: Requirements 3.3**

---

### Property 4: flushCurrentSession 空条件幂等

*For any* 调用 `flushCurrentSession` 时，若 `timerStatus !== 'running'` 或 `activityTag.trim() === ''`，函数应返回 `true` 且不调用 `tagStore.recordDuration`。

**Validates: Requirements 4.1, 4.6**

---

### Property 5: addRecord 幂等性

*For any* 有效的 `TimerRecord`（`duration >= 1000`），对同一 record 调用 `addRecord` 任意次数后，`records` 数组中该 `id` 的记录应恰好出现一次。

**Validates: Requirements 9.1, 9.2**

---

### Property 6: ModeMenu 按钮数量与 availableModes 一致

*For any* `AppMode[]` 数组作为 `availableModes` 传入 `ModeMenu`，渲染结果中 `role="menuitem"` 的按钮数量应恰好等于 `availableModes.length`。

**Validates: Requirements 10.1, 10.2**

---

### Property 7: tl-* CSS 类完整性

*For any* 在 `TimerTimelinePage.tsx` 中通过 `className` 引用的 CSS 类名，该类名应在对应的样式文件中存在对应的选择器定义。

**Validates: Requirements 8.1, 8.2**
