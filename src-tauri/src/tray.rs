use tauri::{
  menu::{Menu, MenuItem, PredefinedMenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  App, Manager, Runtime,
};

/// Timer state payload received from the frontend via `tray:timer-state` event.
#[derive(Debug, serde::Deserialize, Clone)]
pub struct TimerStatePayload {
  pub label: String,
  pub is_running: bool,
}

/// Build and register the system tray icon and context menu.
pub fn init(app: &App) -> tauri::Result<()> {
  let handle = app.handle().clone();

  // ── Context menu items ───────────────────────────────────────────────────
  let toggle_window = MenuItem::with_id(app, "toggle-window", "Show / Hide Window", true, None::<&str>)?;
  let sep1 = PredefinedMenuItem::separator(app)?;
  let play_pause = MenuItem::with_id(app, "toggle-play", "▶  Play / Pause", true, None::<&str>)?;
  let skip = MenuItem::with_id(app, "skip", "⏭  Skip Phase", true, None::<&str>)?;
  let reset = MenuItem::with_id(app, "reset", "↺  Reset Timer", true, None::<&str>)?;
  let sep2 = PredefinedMenuItem::separator(app)?;
  let quit = MenuItem::with_id(app, "quit", "Quit EigenTime", true, None::<&str>)?;

  let menu = Menu::with_items(app, &[
    &toggle_window,
    &sep1,
    &play_pause,
    &skip,
    &reset,
    &sep2,
    &quit,
  ])?;

  // ── Tray icon ────────────────────────────────────────────────────────────
  let _tray = TrayIconBuilder::with_id("main-tray")
    .icon(app.default_window_icon().unwrap().clone())
    .tooltip("EigenTime | Idle")
    .menu(&menu)
    .menu_on_left_click(false) // left-click toggles window, right-click opens menu
    .on_tray_icon_event({
      let h = handle.clone();
      move |_tray, event| {
        // Left-click: toggle main window visibility
        if let TrayIconEvent::Click {
          button: MouseButton::Left,
          button_state: MouseButtonState::Up,
          ..
        } = event
        {
          toggle_window_visibility(&h);
        }
      }
    })
    .on_menu_event({
      let h = handle.clone();
      move |_tray, event| match event.id.as_ref() {
        "toggle-window" => toggle_window_visibility(&h),
        "toggle-play" => {
          let _ = h.emit("tray:action", "toggle-play");
        }
        "skip" => {
          let _ = h.emit("tray:action", "skip");
        }
        "reset" => {
          let _ = h.emit("tray:action", "reset");
        }
        "quit" => {
          h.exit(0);
        }
        _ => {}
      }
    })
    .build(app)?;

  // ── Listen for timer state updates from the frontend ─────────────────────
  let h2 = handle.clone();
  app.listen("tray:timer-state", move |event| {
    if let Ok(payload) = serde_json::from_str::<TimerStatePayload>(event.payload()) {
      if let Some(tray) = h2.tray_by_id("main-tray") {
        let tooltip = format!("EigenTime | {}", payload.label);
        let _ = tray.set_tooltip(Some(&tooltip));
      }
    }
  });

  Ok(())
}

fn toggle_window_visibility<R: Runtime>(handle: &impl Manager<R>) {
  if let Some(window) = handle.get_webview_window("main") {
    if window.is_visible().unwrap_or(false) {
      let _ = window.hide();
    } else {
      let _ = window.show();
      let _ = window.set_focus();
    }
  }
}
