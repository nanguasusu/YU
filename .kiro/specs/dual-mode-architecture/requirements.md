# Requirements Document

## Introduction

This feature refactors the existing Tauri floating widget (React + TypeScript) from a single-mode app into a **dual-mode architecture**. The app will support two top-level modes — `widget` and `timer` — each with its own layout, tab set, and minimize behavior. The existing widget functionality (countdown, tasks, progress bars) is preserved unchanged. A new timer mode adds three pages: a live timer start page, a today's timeline page, and an aggregated statistics page. The active mode is persisted and can be switched from the system tray menu. The Rust backend is extended with a `set_app_mode` command and an `app-mode-changed` event.

---

## Glossary

- **App**: The Tauri desktop floating widget application.
- **AppMode**: A discriminated union `'widget' | 'timer'` that determines which layout and feature set is active.
- **WindowState**: The visibility state of the main window: `'full'` (expanded), `'mini'` (minimized to mini-timer bar), or `'hidden'` (window hidden).
- **WidgetMode**: The existing mode showing three tabs — countdown (倒计时), tasks (任务列表), and progress bars (进度条).
- **TimerMode**: The new mode showing three tabs — start (计时), timeline (时间线), and stats (统计).
- **WidgetLayout**: The React component that wraps the existing three widget tabs.
- **TimerLayout**: The new React component that wraps the three timer tabs.
- **MiniTimer**: The compact bar shown when the window is in `'mini'` WindowState; only available in TimerMode.
- **TimerStartPage**: The tab in TimerMode for selecting a tag and controlling the live stopwatch.
- **TimerTimelinePage**: The tab in TimerMode showing today's timer records as a vertical timeline.
- **TimerStatsPage**: The tab in TimerMode showing aggregated statistics and a donut chart.
- **TimerRecord**: A persisted record of a completed timer session with id, title, tag, startTime, endTime, duration, and optional note.
- **TimerStatus**: The state of the stopwatch: `'idle'`, `'running'`, or `'paused'`.
- **TrayMenu**: The system tray context menu managed by the Rust backend.
- **TagPicker**: The existing React component for selecting or creating activity tags.
- **usePersistedState**: The existing React hook managing app-wide persisted state via Tauri Store.
- **useTagStore**: The existing React hook managing custom tags and tag duration records.
- **AppStateStore**: The Tauri plugin-store instance (`app-state.json`) used for persistence.

---

## Requirements

### Requirement 1: AppMode State and Persistence

**User Story:** As a user, I want the app to remember which mode I was using, so that it opens in the same mode after restart.

#### Acceptance Criteria

1. THE App SHALL define `AppMode` as the union type `'widget' | 'timer'`.
2. THE App SHALL persist the current `AppMode` value to `AppStateStore` under a dedicated key `app-mode`.
3. WHEN the App starts, THE App SHALL load the persisted `AppMode` from `AppStateStore` and default to `'widget'` if no value is stored.
4. WHEN `AppMode` changes, THE App SHALL persist the new value to `AppStateStore` within 500 ms.
5. IF `AppStateStore` is unavailable, THEN THE App SHALL fall back to `localStorage` for `AppMode` persistence.

---

### Requirement 2: Widget Mode Layout

**User Story:** As a user, I want the existing countdown, tasks, and progress tabs to remain fully functional in widget mode, so that my current workflow is not disrupted.

#### Acceptance Criteria

1. WHILE `AppMode` is `'widget'`, THE App SHALL display `WidgetLayout` with three tabs: `'countdown'`, `'tasks'`, and `'progress'`.
2. THE `WidgetLayout` SHALL preserve all existing tab content, interactions, and visual styles without modification.
3. WHILE `AppMode` is `'widget'`, THE App SHALL hide the `MiniTimer` component entirely.
5. THE `WidgetLayout` SHALL reuse the existing `TimerTab`, `TasksTab`, and `StatsTab` components without modification.

---

### Requirement 3: Timer Mode Layout

**User Story:** As a user, I want a dedicated timer mode with start, timeline, and stats tabs, so that I can track focused work sessions and review my daily activity.

#### Acceptance Criteria

1. WHILE `AppMode` is `'timer'`, THE App SHALL display `TimerLayout` with three tabs: `'start'`, `'timeline'`, and `'stats'`.
2. THE `TimerLayout` SHALL use the same glassmorphism card style, rounded corners, muted color palette, and tab navigation pattern as `WidgetLayout`.
3. WHILE `AppMode` is `'timer'`, WHEN the minimize button is clicked, THE App SHALL transition `WindowState` to `'mini'` and display the `MiniTimer` component.
5. THE `TimerLayout` SHALL default to the `'start'` tab when first entering timer mode.

---

### Requirement 4: Timer Start Page (TimerStartPage)

**User Story:** As a user, I want to select a tag, start a timer, pause it, and save the session, so that I can record focused work intervals with context.

#### Acceptance Criteria

1. WHEN `TimerStatus` is `'idle'`, THE `TimerStartPage` SHALL display a `TagPicker` and a start button; the time display SHALL show `00:00:00`.
2. WHEN a tag is selected and the start button is clicked, THE `TimerStartPage` SHALL transition `TimerStatus` to `'running'` and begin incrementing the elapsed time display every second.
3. WHILE `TimerStatus` is `'running'`, THE `TimerStartPage` SHALL display the selected tag, a live elapsed time counter in `HH:MM:SS` format, a pause button, and a stop-and-record button.
4. WHEN the pause button is clicked, THE `TimerStartPage` SHALL transition `TimerStatus` to `'paused'` and freeze the elapsed time display.
5. WHILE `TimerStatus` is `'paused'`, THE `TimerStartPage` SHALL display the frozen elapsed time, a resume button, and a stop-and-record button.
6. WHEN the resume button is clicked, THE `TimerStartPage` SHALL transition `TimerStatus` to `'running'` and resume incrementing elapsed time from the frozen value.
7. WHEN the stop-and-record button is clicked, THE `TimerStartPage` SHALL create a `TimerRecord` with a generated `id`, the current tag as `tag`, the session start timestamp as `startTime`, the current timestamp as `endTime`, the total elapsed milliseconds as `duration`, and an empty `note`; then persist it and reset `TimerStatus` to `'idle'`.
8. IF the stop-and-record button is clicked with elapsed time less than 1000 ms, THEN THE `TimerStartPage` SHALL discard the record and reset to `'idle'` without saving.
9. THE `TimerStartPage` SHALL reuse the existing `TagPicker` component and `useTagStore` hook for tag selection and creation.
10. THE `TimerStartPage` SHALL display the status label, tag badge, and time display using the card design from `时钟.html` (white inner card, large monospace time, rounded action buttons).

---

### Requirement 5: TimerRecord Data Model and Persistence

**User Story:** As a user, I want my timer sessions to be saved reliably, so that I can review them in the timeline and stats views.

#### Acceptance Criteria

1. THE App SHALL define `TimerRecord` as: `{ id: string; title: string; tag?: string; startTime: number; endTime: number; duration: number; note?: string }`.
2. THE App SHALL persist the `TimerRecord[]` list to `AppStateStore` under the key `timer-records`.
3. WHEN a new `TimerRecord` is saved, THE App SHALL append it to the existing list and persist the updated list within 500 ms.
4. WHEN the App starts, THE App SHALL load the persisted `TimerRecord[]` from `AppStateStore` and default to an empty array if no value is stored.
5. IF `AppStateStore` is unavailable, THEN THE App SHALL fall back to `localStorage` for `TimerRecord[]` persistence.
6. THE App SHALL generate `TimerRecord.id` using `crypto.randomUUID()` or a timestamp-based fallback.
7. THE App SHALL set `TimerRecord.title` to the tag name when no explicit title is provided.

---

### Requirement 6: Timer Timeline Page (TimerTimelinePage)

**User Story:** As a user, I want to see today's timer sessions as a vertical timeline, so that I can review what I worked on and for how long.

#### Acceptance Criteria

1. THE `TimerTimelinePage` SHALL display only `TimerRecord` entries whose `startTime` falls within the current calendar day (local time).
2. THE `TimerTimelinePage` SHALL render records in descending order by `startTime` (newest first).
3. FOR each `TimerRecord`, THE `TimerTimelinePage` SHALL display: the record title, the tag as a sub-label, the time range formatted as `HH:MM - HH:MM`, and a duration badge formatted as `Xm` or `XhYm`.
4. THE `TimerTimelinePage` SHALL display a header showing the count of today's records (e.g., `LOGS: 7`).
5. WHEN there are no records for today, THE `TimerTimelinePage` SHALL display an empty-state message.
6. THE `TimerTimelinePage` SHALL be scrollable when the record list exceeds the visible area.
7. THE `TimerTimelinePage` SHALL use the vertical timeline design from `时间线.html` (dot markers, left-aligned spine, scrollable content area).

---

### Requirement 7: Timer Stats Page (TimerStatsPage)

**User Story:** As a user, I want to see aggregated statistics for today's timer sessions, so that I can understand how I distributed my focus time.

#### Acceptance Criteria

1. THE `TimerStatsPage` SHALL compute statistics from all `TimerRecord` entries whose `startTime` falls within the current calendar day (local time).
2. THE `TimerStatsPage` SHALL display the total focus time for today formatted as `X.Xh` or `Xm`.
3. THE `TimerStatsPage` SHALL display a donut/ring chart showing the proportional time spent per tag for the top categories.
4. THE `TimerStatsPage` SHALL display a per-tag breakdown list, each entry showing: tag name, time spent formatted as `X.Xh · Y%`, and a horizontal progress bar scaled to the tag's percentage of total time.
5. WHEN there are no records for today, THE `TimerStatsPage` SHALL hide the donut chart and per-tag breakdown list completely, and display an empty-state message instead.
6. THE `TimerStatsPage` SHALL use the card design from `统计分布.html` (CSS conic-gradient donut ring, legend list, detail progress bars).
7. THE `TimerStatsPage` SHALL assign a distinct color from a predefined palette to each tag, cycling if there are more tags than colors.

---

### Requirement 8: Minimize Button Logic

**User Story:** As a user, I want the minimize button to behave differently depending on the active mode, so that widget mode hides the window and timer mode enters the compact mini-timer view.

#### Acceptance Criteria

1. WHEN the minimize button is clicked and `AppMode` is `'widget'`, THE App SHALL call `window.hide()` to hide the main window.
2. WHEN the minimize button is clicked and `AppMode` is `'timer'`, THE App SHALL transition `WindowState` to `'mini'` and render the `MiniTimer` component.
3. THE `MiniTimer` component SHALL only be rendered when `AppMode` is `'timer'` and `WindowState` is `'mini'`.
4. WHEN `WindowState` is `'mini'`, THE `MiniTimer` SHALL display the current tag, `TimerStatus`, and live elapsed time.
5. WHEN `WindowState` is `'mini'`, THE `MiniTimer` SHALL provide a single-click toggle (pause/resume) and a double-click reset interaction on the time display.
6. WHEN `WindowState` is `'mini'`, THE `MiniTimer` SHALL display an expand button that transitions `WindowState` back to `'full'`.

---

### Requirement 9: Tray Menu Mode Switcher

**User Story:** As a user, I want to switch between widget mode and timer mode from the system tray, so that I can change modes without opening the app window.

#### Acceptance Criteria

1. THE `TrayMenu` SHALL include a mode section with two items: `桌面静态挂件模式` (maps to `'widget'`) and `计时钟模式` (maps to `'timer'`).
2. THE `TrayMenu` SHALL display the mode section between the settings item and the quit item, separated by menu separators.
3. WHEN a mode item is clicked in `TrayMenu`, THE Rust backend SHALL invoke the `set_app_mode` Tauri command with the selected mode string.
4. WHEN `set_app_mode` is invoked, THE Rust backend SHALL emit the `app-mode-changed` event to the frontend with the new mode as payload.
5. WHEN the frontend receives the `app-mode-changed` event, THE App SHALL guarantee `AppMode` equals the received mode value, persist it, show the main window, and render the appropriate layout.
6. THE Rust backend SHALL expose a `set_app_mode` command registered in `tauri::generate_handler!`.
7. THE existing `TrayMenu` items (`显示组件`, `打开设置`, `退出`) SHALL remain unchanged in behavior.

---

### Requirement 10: Duration Formatting Utilities

**User Story:** As a developer, I want shared formatting utilities for durations and timestamps, so that the timeline and stats pages display consistent human-readable values.

#### Acceptance Criteria

1. THE App SHALL provide a `formatDuration(ms: number): string` function that returns `Xm` for durations under 1 hour and `XhYm` for durations of 1 hour or more.
2. THE App SHALL provide a `formatTimeRange(startTime: number, endTime: number): string` function that returns a string in `HH:MM - HH:MM` format using local time.
3. THE App SHALL provide a `formatTotalHours(ms: number): string` function that returns `X.Xh` for durations of 1 hour or more and `Xm` for shorter durations.
4. FOR ALL valid non-negative millisecond values, `formatDuration` SHALL return a non-empty string.
5. FOR ALL valid timestamp pairs where `endTime >= startTime`, `formatTimeRange` SHALL return a string matching the pattern `\d{2}:\d{2} - \d{2}:\d{2}`.
