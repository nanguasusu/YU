use tauri_plugin_autostart::MacosLauncher;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "app-state.json";
const WINDOW_BOUNDS_KEY: &str = "window-bounds";
const WINDOW_POSITION_KEY: &str = "window-position";

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

fn write_window_bounds<R: tauri::Runtime>(app: &tauri::AppHandle<R>, bounds: WindowBounds) {
  if let Ok(store) = app.store(STORE_FILE) {
    store.set(WINDOW_BOUNDS_KEY, serde_json::json!(bounds));
    store.delete(WINDOW_POSITION_KEY);
    let _ = store.save();
  }
}

fn save_window_bounds<R: tauri::Runtime>(app: &tauri::AppHandle<R>, window: &tauri::Window<R>) {
  if let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size()) {
    write_window_bounds(
      app,
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
      WindowBounds {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
      },
    );
  }
}

fn load_window_bounds<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Option<WindowBounds> {
  let Ok(store) = app.store(STORE_FILE) else {
    return None;
  };

  if let Some(saved) = store.get(WINDOW_BOUNDS_KEY) {
    if let Ok(bounds) = serde_json::from_value::<WindowBounds>(saved) {
      return Some(bounds);
    }
  }

  let saved = store.get(WINDOW_POSITION_KEY)?;
  let Ok(position) = serde_json::from_value::<serde_json::Value>(saved) else {
    return None;
  };

  Some(WindowBounds {
    x: position.get("x")?.as_i64()? as i32,
    y: position.get("y")?.as_i64()? as i32,
    width: 320,
    height: 560,
  })
}

fn restore_window_bounds<R: tauri::Runtime>(
  app: &tauri::AppHandle<R>,
  window: &tauri::WebviewWindow<R>,
) {
  let Some(saved_bounds) = load_window_bounds(app) else {
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
    write_window_bounds(app, bounds);
  }
}

fn save_if_main_window<R: tauri::Runtime>(window: &tauri::Window<R>) {
  if window.label() != "main" {
    return;
  }

  save_window_bounds(&window.app_handle(), window);
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      #[cfg(desktop)]
      {
        use tauri::{
          menu::{Menu, MenuItem, PredefinedMenuItem},
          tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
        };

        if let Some(window) = app.get_webview_window("main") {
          restore_window_bounds(app.handle(), &window);
        }

        let show = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
        let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
        let separator = PredefinedMenuItem::separator(app)?;
        let menu = Menu::with_items(app, &[&show, &separator, &quit])?;
        let icon = app.default_window_icon().cloned().unwrap();

        TrayIconBuilder::with_id("main-tray")
          .tooltip("屿")
          .icon(icon)
          .menu(&menu)
          .show_menu_on_left_click(false)
          .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => show_main_window(app),
            "quit" => {
              if let Some(window) = app.get_webview_window("main") {
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
              show_main_window(tray.app_handle());
            }
          })
          .build(app)?;

        if let Some(window) = app.get_webview_window("main") {
          let _ = window.set_skip_taskbar(true);
        }
      }

      Ok(())
    })
    .on_window_event(|window, event| {
      match event {
        tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => save_if_main_window(window),
        tauri::WindowEvent::CloseRequested { api, .. } => {
          api.prevent_close();
          save_if_main_window(window);
          let _ = window.hide();
        }
        _ => {}
      }
    })
    .invoke_handler(tauri::generate_handler![get_autostart, set_autostart])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(desktop)]
fn show_main_window(app: &tauri::AppHandle) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.set_skip_taskbar(true);
  }
}
