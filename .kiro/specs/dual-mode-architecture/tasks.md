# Implementation Plan: Dual-Mode Architecture

## Overview

Refactor the existing Tauri v2 + React + TypeScript widget from a single-mode app into a dual-mode architecture. The existing widget functionality is preserved inside a new `WidgetLayout` wrapper. A new `TimerLayout` adds three pages: a live stopwatch start page, a today's timeline page, and an aggregated statistics page. Mode switching is persisted and driven from the system tray.

## Tasks

- [x] 1. Add new types and utilities to `src/types.ts`
  - Add `AppMode`, `WindowState`, `WidgetTab`, `TimerTab`, `TimerRecord` type definitions
  - Add `TIMER_RECORDS_KEY = 'timer-records'` and `APP_MODE_KEY = 'app-mode'` constants
  - Add `formatDuration(ms)` utility: returns `Xm` for < 1 hour, `XhYm` for >= 1 hour
  - Add `formatTimeRange(startTime, endTime)` utility: returns `HH:MM - HH:MM` in local time
  - Add `formatTotalHours(ms)` utility: returns `X.Xh` for >= 1 hour, `Xm` for shorter
  - Validation rules: `duration >= 1000` to persist, `endTime >= startTime`, `id` non-empty, `title` defaults to `tag ?? 'Untitled'`
  - _Requirements: 1.1, 5.1, 5.6, 5.7, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 1.1 Write property tests for formatting utilities
    - **Property 1: formatDuration returns non-empty string for all non-negative inputs**
    - **Validates: Requirements 10.1, 10.4**
    - **Property 2: formatTimeRange matches HH:MM - HH:MM pattern for valid timestamp pairs**
    - **Validates: Requirements 10.2, 10.5**
    - **Property 3: formatTotalHours returns non-empty string for all non-negative inputs**
    - **Validates: Requirements 10.3**
    - Use `fast-check` to generate arbitrary non-negative ms values and timestamp pairs

- [x] 2. Create `src/hooks/useAppMode.ts`
  - On mount, load `AppMode` from `appStateStore` under key `APP_MODE_KEY`; default to `'widget'`
  - Fall back to `localStorage` when `__TAURI_INTERNALS__` is absent
  - Expose `setAppMode(mode)` that updates React state and persists to store within 500 ms
  - Listen for `app-mode-changed` Tauri event via `@tauri-apps/api/event`; call `setAppMode` with received payload
  - Unlisten on component unmount
  - Return `{ appMode, isLoaded, setAppMode }`
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 9.5_

  - [ ]* 2.1 Write property test for AppMode persistence round-trip
    - **Property 8: AppMode persistence round-trip**
    - **Validates: Requirements 1.2, 1.3, 1.4**
    - Mock `appStateStore`; for any `AppMode` value, verify `setAppMode(m)` then reload returns `m`

- [x] 3. Create `src/hooks/useTimerRecords.ts`
  - On mount, load `TimerRecord[]` from `appStateStore` under key `TIMER_RECORDS_KEY`; default to `[]`
  - Fall back to `localStorage` when Tauri Store is unavailable
  - `addRecord(record)` appends to the list and persists within 500 ms
  - `getTodayRecords()` filters records whose `startTime` falls within `[dayStart, dayStart + 86_400_000)` using local midnight
  - Return `{ records, isLoaded, addRecord, getTodayRecords }`
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 6.1, 7.1_

  - [ ]* 3.1 Write property tests for useTimerRecords
    - **Property 4: getTodayRecords only returns records from the current calendar day**
    - **Validates: Requirements 6.1, 7.1**
    - **Property 5: addRecord appends and persists — round-trip consistency**
    - **Validates: Requirements 5.2, 5.3**
    - **Property 6: Sub-second records are never persisted**
    - **Validates: Requirements 4.8**
    - Use `fast-check` to generate arbitrary `TimerRecord` arrays with varied `startTime` values and durations

- [x] 4. Create `src/components/WidgetLayout.tsx`
  - Accept props: `activeTab: WidgetTab`, `setActiveTab`, `state` (from `usePersistedState`), `tagStore` (from `useTagStore`), `accentColor: string`, `onSound: (type: SoundType) => void`
  - Render `TimerTab`, `TasksTab`, or `StatsTab` based on `activeTab` — pass all required props through unchanged
  - Render bottom nav with Clock, CheckSquare, BarChart2 icons (same as current `App.tsx` nav)
  - Apply the same `.widget-container` glassmorphism shell
  - Do not modify any of the three existing tab components
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 5. Create `src/components/TimerStartPage.tsx`
  - Accept props: `state` (from `usePersistedState` — `activityTag`, `timerStatus`, `elapsedMs`, `lastStartedAt`), `tagStore`, `accentColor`, `onAddRecord`
  - Render `TagPicker` for tag selection (reuse existing component)
  - Show live elapsed time in `HH:MM:SS` format using `formatElapsedTime`, updating every second while `timerStatus === 'running'`
  - Idle state: show `TagPicker` + start button; time display shows `00:00:00`
  - Running state: show tag badge, live time, pause button, stop-and-record button
  - Paused state: show frozen time, resume button, stop-and-record button
  - On stop-and-record: compute total elapsed, build `TimerRecord` with `crypto.randomUUID()` id (fallback to `String(Date.now()) + Math.random().toString(36).slice(2)`), call `onAddRecord`, reset timer state
  - Discard records with `duration < 1000 ms` silently
  - Visual design: white inner card (`.timer-start-card`), large monospace time (`.timer-start-time`), status dot (`.timer-start-status-dot`), tag badge (`.timer-start-tag-badge`), rounded action buttons
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

- [x] 6. Create `src/components/TimerTimelinePage.tsx`
  - Accept props: `records: TimerRecord[]` (pre-filtered to today by parent)
  - Render records in descending `startTime` order (newest first)
  - For each record: title, tag as sub-label, `formatTimeRange(startTime, endTime)`, `formatDuration(duration)` badge
  - Header showing count: `LOGS: N`
  - Empty-state message when `records.length === 0`
  - Scrollable content area (`.timeline-scroll`) with custom scrollbar styling
  - Visual design: dot markers (`.timeline-dot`), left-aligned spine, `.timeline-container`, `.timeline-item`, `.timeline-time-meta`, `.timeline-duration-tag`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 7. Create `src/components/TimerStatsPage.tsx`
  - Accept props: `records: TimerRecord[]` (pre-filtered to today by parent)
  - Compute total focus time and per-tag totals/percentages from `records`
  - Render total time badge using `formatTotalHours(totalMs)`
  - Render CSS conic-gradient donut ring (no external chart library) — `.timer-stats-donut` with `::before` hole
  - Render legend list (top 3 tags) and detail progress bars for all tags
  - Assign colors from predefined palette `['#1a1a1a', '#6366f1', '#10b981', '#06b6d4', '#94a3b8', ...]`, cycling if needed
  - Empty state: hide donut and breakdown list, show empty-state message
  - Visual design: `.timer-stats-header`, `.timer-stats-total-badge`, `.timer-stats-overview`, `.timer-stats-legend`, `.timer-stats-detail-list`, `.timer-stats-bar-bg`, `.timer-stats-bar-fill`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 7.1 Write property test for computeTagStats percentages
    - **Property 7: computeTagStats percentages sum to 100 for non-empty record sets**
    - **Validates: Requirements 7.3, 7.4**
    - Use `fast-check` to generate non-empty `TimerRecord` arrays; verify sum of percentages equals 100 ± 1

- [x] 8. Create `src/components/TimerLayout.tsx`
  - Accept props: `timerTab: TimerTab`, `setTimerTab`, `records: TimerRecord[]`, `addRecord`, `tagStore`, `state`, `accentColor`
  - Render `TimerStartPage`, `TimerTimelinePage`, or `TimerStatsPage` based on `timerTab`
  - Pass `records` directly to `TimerTimelinePage` and `TimerStatsPage` (already filtered by parent)
  - Render bottom nav with Play, List, PieChart icons from `lucide-react`
  - Apply the same `.widget-container` glassmorphism shell as `WidgetLayout`
  - Default to `'start'` tab (controlled by parent state)
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 9. Add new CSS classes to `src/App.css`
  - Add `.timer-start-*` classes: `.timer-start-card` (white inner card, border-radius 24px, box-shadow), `.timer-start-status-dot` (8px circle, green/grey), `.timer-start-tag-badge` (pill badge), `.timer-start-time` (monospace 56px), `.timer-start-actions` (flex row), `.timer-start-btn-circle` (48px icon button), `.timer-start-btn-main` (flex-1 primary button)
  - Add `.timeline-*` classes: `.timeline-scroll` (flex-1, overflow-y auto), `.timeline-container` (position relative, padding-left 28px), `.timeline-dot` (9px circle, absolute, left -28px), `.timeline-item` (position relative, margin-bottom 20px), `.timeline-time-meta` (flex row), `.timeline-duration-tag` (pill badge, bg #f1f0ea, font-size 10px), `.timeline-empty` (centered empty-state)
  - Add `.timer-stats-*` classes: `.timer-stats-header` (flex row), `.timer-stats-total-badge` (pill badge), `.timer-stats-overview` (flex row), `.timer-stats-donut` (80px conic-gradient circle with `::before` hole), `.timer-stats-legend` (flex column), `.timer-stats-legend-dot` (8px colored circle), `.timer-stats-detail-list` (flex column), `.timer-stats-bar-bg` (6px track), `.timer-stats-bar-fill` (colored fill), `.timer-stats-empty` (centered empty-state)
  - Add `.timer-layout-container`, `.timer-layout-content`, `.timer-layout-nav` mirroring existing `.widget-container`, `.content-area`, `.bottom-nav` patterns
  - Follow existing glassmorphism naming conventions and variable usage
  - _Requirements: 2.2, 3.2, 4.10, 6.7, 7.6_

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Refactor `src/App.tsx` for dual-mode architecture
  - [x] 11.1 Add new hooks and state
    - Import and call `useAppMode()` → `{ appMode, setAppMode, isLoaded: modeLoaded }`
    - Import and call `useTimerRecords()` → `{ records, addRecord, getTodayRecords }`
    - Add `const [windowState, setWindowState] = useState<WindowState>('full')`
    - Add `const [widgetTab, setWidgetTab] = useState<WidgetTab>('countdown')`
    - Add `const [timerTab, setTimerTab] = useState<TimerTab>('start')`
    - _Requirements: 1.3, 3.5, 5.4_

  - [x] 11.2 Refactor render logic to dual-mode
    - Mini-timer check: if `windowState === 'mini' && appMode === 'timer'`, render existing `MiniTimer` component
    - Widget branch: if `appMode === 'widget'`, render `<WidgetLayout activeTab={widgetTab} setActiveTab={setWidgetTab} ...>`
    - Timer branch: render `<TimerLayout timerTab={timerTab} setTimerTab={setTimerTab} records={getTodayRecords()} addRecord={addRecord} ...>`
    - Pass `state`, `tagStore`, `accentColor`, `onSound` through to both layouts
    - _Requirements: 2.1, 2.3, 3.1, 3.3, 8.3_

  - [x] 11.3 Update minimize button handler
    - Widget mode: call `getCurrentWindow().hide()` (existing behavior)
    - Timer mode: call `setWindowState('mini')` instead of hiding
    - MiniTimer expand button: call `setWindowState('full')` to return to full layout
    - _Requirements: 8.1, 8.2, 8.6_

- [x] 12. Extend `src-tauri/src/lib.rs` with mode switching
  - Add `set_app_mode` Tauri command: accepts `mode: String`, calls `app.emit("app-mode-changed", mode).ok()`
  - Extend tray menu: add `separator2`, `widget_mode` item (`桌面静态挂件模式`, id `widget-mode`), `timer_mode` item (`计时钟模式`, id `timer-mode`) between settings and the existing separator/quit
  - Menu order: `show | settings | separator2 | widget_mode | timer_mode | separator | quit`
  - Add menu event handler arms: `"widget-mode" => { app.emit("app-mode-changed", "widget").ok(); }` and `"timer-mode" => { app.emit("app-mode-changed", "timer").ok(); }`
  - Register `set_app_mode` in `tauri::generate_handler!` alongside existing commands
  - Existing menu items (`显示组件`, `打开设置`, `退出`) remain unchanged
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6, 9.7_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use `fast-check` and validate universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases (boundary values for formatting utilities, midnight crossing for `getTodayRecords`)
- The Rust backend task (Task 12) is independent of the frontend tasks and can be worked on in parallel with Tasks 5–11
- No new npm packages or Rust crates are required — all dependencies are already installed

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2", "3", "4"] },
    { "wave": 3, "tasks": ["5", "6", "7", "8", "12"] },
    { "wave": 4, "tasks": ["9"] },
    { "wave": 5, "tasks": ["10"] },
    { "wave": 6, "tasks": ["11"] },
    { "wave": 7, "tasks": ["13"] }
  ]
}
```
