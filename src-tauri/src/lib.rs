use tauri::Manager;
mod tray;

#[tauri::command]
fn spawn_widget(app: tauri::AppHandle) {
  if let Some(win) = app.get_webview_window("widget") {
    if win.is_visible().unwrap_or(false) {
      let _ = win.hide();
    } else {
      let _ = win.show();
      let _ = win.set_focus();
    }
    return;
  }
  let _ = tauri::WebviewWindowBuilder::new(
    &app,
    "widget",
    tauri::WebviewUrl::App("/widget".into()),
  )
  .title("EigenTime Widget")
  .inner_size(300.0, 120.0)
  .decorations(false)
  .transparent(true)
  .shadow(false)
  .always_on_top(true)
  .resizable(false)
  .skip_taskbar(true)
  .build();
}

#[tauri::command]
fn close_widget(app: tauri::AppHandle) {
  if let Some(win) = app.get_webview_window("widget") {
    let _ = win.hide();
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
          // We no longer automatically spawn the widget on close!
          // spawn_widget(window.app_handle().clone());
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
