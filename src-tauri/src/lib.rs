use tauri::Manager;
mod tray;

#[tauri::command]
fn spawn_widget(app: tauri::AppHandle) {
  // If widget already exists, just show it
  if let Some(win) = app.get_webview_window("widget") {
    let _ = win.show();
    let _ = win.set_focus();
    return;
  }
  // Create a true OS-level floating overlay pill with its own isolated bundle
  let _ = tauri::WebviewWindowBuilder::new(
    &app,
    "widget",
    tauri::WebviewUrl::App("widget.html".into()),  // Own HTML — NOT the main SPA
  )
  .title("EigenTime Mini")
  .inner_size(220.0, 64.0)   // Compact pill dimensions
  .resizable(false)
  .decorations(false)         // Frameless OS overlay
  .always_on_top(true)        // Float above ALL other apps
  .transparent(true)          // Allow rounded glass pill styling
  .shadow(false)
  .skip_taskbar(false)        // Stay accessible/visible in Windows Taskbar
  .build();
}

#[tauri::command]
fn close_widget(app: tauri::AppHandle) {
  if let Some(win) = app.get_webview_window("widget") {
    let _ = win.hide();
  }
  // Restore main window to taskbar so user can get back to the app
  if let Some(main_win) = app.get_webview_window("main") {
    let _ = main_win.show();
    let _ = main_win.unminimize();
    let _ = main_win.set_focus();
  }
}

#[tauri::command]
fn spawn_eye_rest(app: tauri::AppHandle) {
  if let Some(win) = app.get_webview_window("eye_rest") {
    let _ = win.show();
    let _ = win.set_focus();
    return;
  }
  let _ = tauri::WebviewWindowBuilder::new(
    &app,
    "eye_rest",
    tauri::WebviewUrl::App("/eye-rest".into()),
  )
  .title("Eye Rest")
  .fullscreen(true)
  .always_on_top(true)
  .skip_taskbar(true)
  .shadow(false)
  .build();
}

#[tauri::command]
fn close_eye_rest(app: tauri::AppHandle) {
  if let Some(win) = app.get_webview_window("eye_rest") {
    let _ = win.close();
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_window_state::Builder::default().build())
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
      spawn_widget,
      close_widget,
      spawn_eye_rest,
      close_eye_rest
    ])
    .on_window_event(|window, event| match event {
      tauri::WindowEvent::CloseRequested { api, .. } => {
        if window.label() == "main" {
          api.prevent_close();
          let _ = window.hide();
        }
      }
      tauri::WindowEvent::Resized(_) => {
        if window.label() == "main" {
          if window.is_minimized().unwrap_or(false) {
            let _ = window.hide();
            spawn_widget(window.app_handle().clone());
          }
        }
      }
      _ => {}
    })
    .setup(|app| {
      // System Tray
      tray::init(app)?;

      // Dev logging
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
