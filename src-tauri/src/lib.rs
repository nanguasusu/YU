use tauri_plugin_autostart::MacosLauncher;
use tauri::Manager;
use tauri::Emitter;
use tauri_plugin_store::StoreExt;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

const STORE_FILE: &str = "app-state.json";
const MAIN_WINDOW_LABEL: &str = "main";
const SETTINGS_WINDOW_LABEL: &str = "settings";
const MAIN_WINDOW_BOUNDS_KEY: &str = "window-bounds";
const MAIN_WINDOW_POSITION_KEY: &str = "window-position";
const SETTINGS_WINDOW_BOUNDS_KEY: &str = "settings-window-bounds";
const SETTINGS_WINDOW_POSITION_KEY: &str = "settings-window-position";

/// Shared app-level state for tray menu rebuilding
#[derive(Default)]
struct AppState {
  /// Current app mode: "widget" or "timer"
  app_mode: String,
  /// Whether the main window is currently visible
  window_visible: bool,
  /// Debounce token for window bounds persistence per managed window
  window_save_tokens: HashMap<String, u64>,
}

#[derive(Clone, Copy, serde::Serialize, serde::Deserialize)]
struct WindowBounds {
  x: i32,
  y: i32,
  width: u32,
  height: u32,
}

fn rect_intersects_monitor(bounds: WindowBounds, monitor: &tauri::Monitor) -> bool {
  let monitor_pos = monitor.position();
  let monitor_size = monitor.size();
  let monitor_left = monitor_pos.x;
  let monitor_top = monitor_pos.y;
  let monitor_right = monitor_left + monitor_size.width as i32;
  let monitor_bottom = monitor_top + monitor_size.height as i32;
  let window_right = bounds.x + bounds.width as i32;
  let window_bottom = bounds.y + bounds.height as i32;

  bounds.x < monitor_right
    && window_right > monitor_left
    && bounds.y < monitor_bottom
    && window_bottom > monitor_top
}

fn clamp_bounds_to_monitor(bounds: WindowBounds, monitor: &tauri::Monitor) -> WindowBounds {
  let monitor_pos = monitor.position();
  let monitor_size = monitor.size();
  let max_x = monitor_pos.x + (monitor_size.width as i32 - bounds.width.min(monitor_size.width) as i32);
  let max_y = monitor_pos.y + (monitor_size.height as i32 - bounds.height.min(monitor_size.height) as i32);

  WindowBounds {
    x: bounds.x.clamp(monitor_pos.x, max_x),
    y: bounds.y.clamp(monitor_pos.y, max_y),
    ..bounds
  }
}

fn managed_window_storage_keys(label: &str) -> Option<(&'static str, &'static str)> {
  match label {
    MAIN_WINDOW_LABEL => Some((MAIN_WINDOW_BOUNDS_KEY, MAIN_WINDOW_POSITION_KEY)),
    SETTINGS_WINDOW_LABEL => Some((SETTINGS_WINDOW_BOUNDS_KEY, SETTINGS_WINDOW_POSITION_KEY)),
    _ => None,
  }
}

fn write_window_bounds<R: tauri::Runtime>(
  app: &tauri::AppHandle<R>,
  label: &str,
  bounds: WindowBounds,
) {
  let Some((bounds_key, position_key)) = managed_window_storage_keys(label) else {
    return;
  };

  if let Ok(store) = app.store(STORE_FILE) {
    store.set(bounds_key, serde_json::json!(bounds));
    store.delete(position_key);
    let _ = store.save();
  }
}

fn save_window_bounds<R: tauri::Runtime>(app: &tauri::AppHandle<R>, window: &tauri::Window<R>) {
  if let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size()) {
    write_window_bounds(
      app,
      window.label(),
      WindowBounds {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
      },
    );
  }
}

fn save_webview_window_bounds<R: tauri::Runtime>(
  app: &tauri::AppHandle<R>,
  window: &tauri::WebviewWindow<R>,
) {
  if let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size()) {
    write_window_bounds(
      app,
      window.label(),
      WindowBounds {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
      },
    );
  }
}

fn load_window_bounds_for_label<R: tauri::Runtime>(
  app: &tauri::AppHandle<R>,
  label: &str,
) -> Option<WindowBounds> {
  let (bounds_key, position_key) = managed_window_storage_keys(label)?;
  let Ok(store) = app.store(STORE_FILE) else {
    return None;
  };

  if let Some(saved) = store.get(bounds_key) {
    if let Ok(bounds) = serde_json::from_value::<WindowBounds>(saved) {
      return Some(bounds);
    }
  }

  let saved = store.get(position_key)?;
  let Ok(position) = serde_json::from_value::<serde_json::Value>(saved) else {
    return None;
  };

  Some(WindowBounds {
    x: position.get("x")?.as_i64()? as i32,
    y: position.get("y")?.as_i64()? as i32,
    width: if label == SETTINGS_WINDOW_LABEL { 360 } else { 320 },
    height: if label == SETTINGS_WINDOW_LABEL { 460 } else { 560 },
  })
}

fn restore_window_bounds<R: tauri::Runtime>(
  app: &tauri::AppHandle<R>,
  window: &tauri::WebviewWindow<R>,
) {
  let Some(saved_bounds) = load_window_bounds_for_label(app, window.label()) else {
    return;
  };

  let mut bounds = saved_bounds;

  if let Ok(monitors) = window.available_monitors() {
    let is_visible = monitors.iter().any(|monitor| rect_intersects_monitor(bounds, monitor));
    if !is_visible {
      let fallback_monitor = window
        .primary_monitor()
        .ok()
        .flatten()
        .or_else(|| monitors.into_iter().next());

      if let Some(monitor) = fallback_monitor {
        bounds = clamp_bounds_to_monitor(bounds, &monitor);
      }
    }
  }

  let _ = window.set_size(tauri::PhysicalSize::new(bounds.width, bounds.height));
  let _ = window.set_position(tauri::PhysicalPosition::new(bounds.x, bounds.y));

  if bounds.x != saved_bounds.x
    || bounds.y != saved_bounds.y
    || bounds.width != saved_bounds.width
    || bounds.height != saved_bounds.height
  {
    write_window_bounds(app, window.label(), bounds);
  }
}

fn save_if_managed_window<R: tauri::Runtime>(window: &tauri::Window<R>) {
  if managed_window_storage_keys(window.label()).is_none() {
    return;
  }

  save_window_bounds(&window.app_handle(), window);
}

fn schedule_window_bounds_save<R: tauri::Runtime + 'static>(
  app: tauri::AppHandle<R>,
  label: String,
) {
  if managed_window_storage_keys(&label).is_none() {
    return;
  }

  let next_token = if let Some(state) = app.try_state::<Mutex<AppState>>() {
    if let Ok(mut state) = state.lock() {
      let entry = state.window_save_tokens.entry(label.clone()).or_insert(0);
      *entry += 1;
      *entry
    } else {
      return;
    }
  } else {
    return;
  };

  std::thread::spawn(move || {
    std::thread::sleep(Duration::from_millis(300));

    let should_save = if let Some(state) = app.try_state::<Mutex<AppState>>() {
      if let Ok(state) = state.lock() {
        state.window_save_tokens.get(&label).copied() == Some(next_token)
      } else {
        false
      }
    } else {
      false
    };

    if !should_save {
      return;
    }

    if let Some(window) = app.get_webview_window(&label) {
      save_webview_window_bounds(&app, &window);
    }
  });
}

#[cfg(desktop)]
fn create_settings_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
  if app.get_webview_window(SETTINGS_WINDOW_LABEL).is_some() {
    return Ok(());
  }

  let window = tauri::WebviewWindowBuilder::new(
    app,
    SETTINGS_WINDOW_LABEL,
    tauri::WebviewUrl::App("index.html".into()),
  )
  .title("屿设置")
  .inner_size(360.0, 460.0)
  .min_inner_size(320.0, 400.0)
  .max_inner_size(420.0, 560.0)
  .resizable(false)
  .skip_taskbar(true)
  .visible(false)
  .decorations(false)
  .transparent(true)
  .shadow(false)
  .build()?;

  restore_window_bounds(app, &window);
  let _ = window.set_skip_taskbar(true);
  Ok(())
}

#[tauri::command]
fn get_autostart(app: tauri::AppHandle) -> bool {
  use tauri_plugin_autostart::ManagerExt;
  app.autolaunch().is_enabled().unwrap_or(false)
}

#[tauri::command]
fn set_autostart(app: tauri::AppHandle, enabled: bool) {
  use tauri_plugin_autostart::ManagerExt;
  let autolaunch = app.autolaunch();
  if enabled {
    let _ = autolaunch.enable();
  } else {
    let _ = autolaunch.disable();
  }
}

/// Release the process working set so Windows can page unused memory to disk.
/// Called when the widget has been idle (mouse away) for a while.
#[tauri::command]
fn trim_memory() {
  #[cfg(target_os = "windows")]
  unsafe {
    use std::collections::HashSet;
    use std::mem::size_of;

    type Handle = *mut std::ffi::c_void;
    type Bool = i32;

    const TH32CS_SNAPPROCESS: u32 = 0x00000002;
    const PROCESS_QUERY_INFORMATION: u32 = 0x0400;
    const PROCESS_SET_QUOTA: u32 = 0x0100;
    const INVALID_HANDLE_VALUE: Handle = -1isize as Handle;

    #[allow(non_snake_case)]
    #[repr(C)]
    struct ProcessEntry32W {
      dwSize: u32,
      cntUsage: u32,
      th32ProcessID: u32,
      th32DefaultHeapID: usize,
      th32ModuleID: u32,
      cntThreads: u32,
      th32ParentProcessID: u32,
      pcPriClassBase: i32,
      dwFlags: u32,
      szExeFile: [u16; 260],
    }

    unsafe extern "system" {
      fn GetCurrentProcess() -> Handle;
      fn GetCurrentProcessId() -> u32;
      fn OpenProcess(dw_desired_access: u32, b_inherit_handle: Bool, dw_process_id: u32) -> Handle;
      fn CloseHandle(h_object: Handle) -> Bool;
      fn CreateToolhelp32Snapshot(dw_flags: u32, th32_process_id: u32) -> Handle;
      fn Process32FirstW(h_snapshot: Handle, lppe: *mut ProcessEntry32W) -> Bool;
      fn Process32NextW(h_snapshot: Handle, lppe: *mut ProcessEntry32W) -> Bool;
      fn SetProcessWorkingSetSize(
        h_process: Handle,
        dw_minimum_working_set_size: usize,
        dw_maximum_working_set_size: usize,
      ) -> Bool;
    }

    unsafe fn trim_process(handle: Handle) -> bool {
      SetProcessWorkingSetSize(handle, usize::MAX, usize::MAX) != 0
    }

    let current_pid = GetCurrentProcessId();
    let mut processes = Vec::new();
    let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);

    if snapshot != INVALID_HANDLE_VALUE {
      let mut entry = ProcessEntry32W {
        dwSize: size_of::<ProcessEntry32W>() as u32,
        cntUsage: 0,
        th32ProcessID: 0,
        th32DefaultHeapID: 0,
        th32ModuleID: 0,
        cntThreads: 0,
        th32ParentProcessID: 0,
        pcPriClassBase: 0,
        dwFlags: 0,
        szExeFile: [0; 260],
      };

      if Process32FirstW(snapshot, &mut entry) != 0 {
        loop {
          processes.push((entry.th32ProcessID, entry.th32ParentProcessID));
          if Process32NextW(snapshot, &mut entry) == 0 {
            break;
          }
        }
      }

      CloseHandle(snapshot);
    }

    let mut target_pids = vec![current_pid];
    let mut seen = HashSet::from([current_pid]);
    let mut index = 0;

    while index < target_pids.len() {
      let parent_pid = target_pids[index];
      for (pid, process_parent_pid) in &processes {
        if *process_parent_pid == parent_pid && seen.insert(*pid) {
          target_pids.push(*pid);
        }
      }
      index += 1;
    }

    let mut trimmed = usize::from(trim_process(GetCurrentProcess()));

    for pid in target_pids.into_iter().filter(|pid| *pid != current_pid) {
      let handle = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_SET_QUOTA, 0, pid);
      if handle.is_null() {
        continue;
      }

      if trim_process(handle) {
        trimmed += 1;
      }
      CloseHandle(handle);
    }

    log::info!("[trim_memory] trimmed {} process working sets", trimmed);
  }
}

#[tauri::command]
fn set_app_mode(app: tauri::AppHandle, mode: String) {
    // Update shared state
    if let Some(state) = app.try_state::<Mutex<AppState>>() {
        if let Ok(mut s) = state.lock() {
            s.app_mode = mode.clone();
        }
        rebuild_tray_menu(&app);
    }
    app.emit("app-mode-changed", mode).ok();
}

/// Build the tray menu based on current AppState.
#[cfg(desktop)]
fn rebuild_tray_menu(app: &tauri::AppHandle) {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

    let (window_visible, app_mode) = if let Some(state) = app.try_state::<Mutex<AppState>>() {
        if let Ok(s) = state.lock() {
            (s.window_visible, s.app_mode.clone())
        } else {
            (true, "widget".to_string())
        }
    } else {
        (true, "widget".to_string())
    };

    let toggle_label = if window_visible { "隐藏悬浮窗" } else { "显示悬浮窗" };
    let switch_label = if app_mode == "timer" { "切换到桌面挂件" } else { "切换到计时钟" };
    let switch_id = if app_mode == "timer" { "switch-to-widget" } else { "switch-to-timer" };

    let Ok(toggle) = MenuItem::with_id(app, "toggle-window", toggle_label, true, None::<&str>) else { return; };
    let Ok(sep1) = PredefinedMenuItem::separator(app) else { return; };
    let Ok(switch) = MenuItem::with_id(app, switch_id, switch_label, true, None::<&str>) else { return; };
    let Ok(sep2) = PredefinedMenuItem::separator(app) else { return; };
    let Ok(settings) = MenuItem::with_id(app, "settings", "设置", true, None::<&str>) else { return; };
    let Ok(quit) = MenuItem::with_id(app, "quit", "退出", true, None::<&str>) else { return; };

    let Ok(menu) = Menu::with_items(app, &[&toggle, &sep1, &switch, &sep2, &settings, &quit]) else { return; };

    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_menu(Some(menu));
    }
}

#[cfg(not(desktop))]
fn rebuild_tray_menu(_app: &tauri::AppHandle) {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
    .manage(Mutex::new(AppState {
      app_mode: "widget".to_string(),
      window_visible: true,
      window_save_tokens: HashMap::new(),
    }))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Load persisted app-mode so tray reflects the correct mode on startup
      if let Ok(store) = app.store(STORE_FILE) {
        if let Some(val) = store.get("app-mode") {
          if let Some(mode_str) = val.as_str() {
            if mode_str == "widget" || mode_str == "timer" {
              if let Some(state) = app.try_state::<Mutex<AppState>>() {
                if let Ok(mut s) = state.lock() {
                  s.app_mode = mode_str.to_string();
                }
              }
            }
          }
        }
      }

      #[cfg(desktop)]
      {
        use tauri::{
          menu::{Menu, MenuItem, PredefinedMenuItem},
          tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
        };

        if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
          restore_window_bounds(app.handle(), &window);
        }

        // Build initial tray menu
        let app_mode = if let Some(state) = app.try_state::<Mutex<AppState>>() {
          state.lock().map(|s| s.app_mode.clone()).unwrap_or_else(|_| "widget".to_string())
        } else {
          "widget".to_string()
        };

        let switch_label = if app_mode == "timer" { "切换到桌面挂件" } else { "切换到计时钟" };
        let switch_id = if app_mode == "timer" { "switch-to-widget" } else { "switch-to-timer" };

        let toggle = MenuItem::with_id(app, "toggle-window", "隐藏悬浮窗", true, None::<&str>)?;
        let sep1 = PredefinedMenuItem::separator(app)?;
        let switch = MenuItem::with_id(app, switch_id, switch_label, true, None::<&str>)?;
        let sep2 = PredefinedMenuItem::separator(app)?;
        let settings = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
        let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
        let menu = Menu::with_items(app, &[&toggle, &sep1, &switch, &sep2, &settings, &quit])?;
        let icon = app.default_window_icon().cloned().unwrap();

        TrayIconBuilder::with_id("main-tray")
          .tooltip("屿")
          .icon(icon)
          .menu(&menu)
          .show_menu_on_left_click(false)
          .on_menu_event(|app, event| match event.id().as_ref() {
            "toggle-window" => {
              let visible = if let Some(state) = app.try_state::<Mutex<AppState>>() {
                state.lock().map(|s| s.window_visible).unwrap_or(true)
              } else {
                true
              };
              if visible {
                if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                  let _ = window.hide();
                }
                if let Some(state) = app.try_state::<Mutex<AppState>>() {
                  if let Ok(mut s) = state.lock() { s.window_visible = false; }
                }
              } else {
                show_main_window(app);
                if let Some(state) = app.try_state::<Mutex<AppState>>() {
                  if let Ok(mut s) = state.lock() { s.window_visible = true; }
                }
              }
              rebuild_tray_menu(app);
            },
            "switch-to-widget" => {
              if let Some(state) = app.try_state::<Mutex<AppState>>() {
                if let Ok(mut s) = state.lock() { s.app_mode = "widget".to_string(); }
              }
              app.emit("app-mode-changed", "widget").ok();
              show_main_window(app);
              if let Some(state) = app.try_state::<Mutex<AppState>>() {
                if let Ok(mut s) = state.lock() { s.window_visible = true; }
              }
              rebuild_tray_menu(app);
            },
            "switch-to-timer" => {
              if let Some(state) = app.try_state::<Mutex<AppState>>() {
                if let Ok(mut s) = state.lock() { s.app_mode = "timer".to_string(); }
              }
              app.emit("app-mode-changed", "timer").ok();
              show_main_window(app);
              if let Some(state) = app.try_state::<Mutex<AppState>>() {
                if let Ok(mut s) = state.lock() { s.window_visible = true; }
              }
              rebuild_tray_menu(app);
            },
            "settings" => show_settings_window(app),
            "quit" => {
              if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                save_webview_window_bounds(app, &window);
              }
              if let Some(window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) {
                save_webview_window_bounds(app, &window);
              }
              app.exit(0);
            },
            _ => {}
          })
          .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
              button: MouseButton::Left,
              button_state: MouseButtonState::Up,
              ..
            } = event
            {
              let app = tray.app_handle();
              let visible = if let Some(state) = app.try_state::<Mutex<AppState>>() {
                state.lock().map(|s| s.window_visible).unwrap_or(true)
              } else {
                true
              };
              if visible {
                if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                  let _ = window.set_focus();
                }
              } else {
                show_main_window(app);
                if let Some(state) = app.try_state::<Mutex<AppState>>() {
                  if let Ok(mut s) = state.lock() { s.window_visible = true; }
                }
                rebuild_tray_menu(app);
              }
            }
          })
          .build(app)?;

        if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
          let _ = window.set_skip_taskbar(true);
        }
      }

      Ok(())
    })
    .on_window_event(|window, event| {
      match event {
        tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => {
          schedule_window_bounds_save(window.app_handle().clone(), window.label().to_string());
        }
        tauri::WindowEvent::CloseRequested { api, .. } => {
          save_if_managed_window(window);
          if window.label() == MAIN_WINDOW_LABEL {
            api.prevent_close();
            let _ = window.hide();
            // Update shared state and rebuild tray
            let app = window.app_handle();
            if let Some(state) = app.try_state::<Mutex<AppState>>() {
              if let Ok(mut s) = state.lock() { s.window_visible = false; }
            }
            rebuild_tray_menu(app);
          }
        }
        _ => {}
      }
    })
    .invoke_handler(tauri::generate_handler![
      get_autostart,
      set_autostart,
      trim_memory,
      set_app_mode,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(desktop)]
fn show_main_window(app: &tauri::AppHandle) {
  if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.set_skip_taskbar(true);
  }
}

#[cfg(desktop)]
fn show_settings_window(app: &tauri::AppHandle) {
  if app.get_webview_window(SETTINGS_WINDOW_LABEL).is_none() {
    let _ = create_settings_window(app);
  }

  if let Some(window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) {
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.set_skip_taskbar(true);
  }
}
