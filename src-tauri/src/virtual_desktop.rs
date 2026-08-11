/// Windows Virtual Desktop pinning — makes the widget appear on ALL virtual desktops.
/// Uses the undocumented (but stable since Win10) IVirtualDesktopPinnedApps COM interface.
#[cfg(target_os = "windows")]
pub fn pin_to_all_virtual_desktops(window: &tauri::WebviewWindow) {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};
    use windows::{
        core::*,
        Win32::{
            Foundation::HWND,
            System::Com::{
                CoCreateInstance, CoInitializeEx, IServiceProvider, CLSCTX_LOCAL_SERVER,
                COINIT_APARTMENTTHREADED,
            },
        },
    };

    // ── COM Interface definition (undocumented Windows internal) ─────────────
    // CLSID of the ImmersiveShell service host
    const CLSID_IMMERSIVE_SHELL: GUID = GUID {
        data1: 0xC2F03A33,
        data2: 0x21F5,
        data3: 0x47FA,
        data4: [0xB4, 0xBB, 0x15, 0x63, 0x62, 0xA2, 0xF2, 0x39],
    };

    // Service/Interface GUID for IVirtualDesktopPinnedApps
    const SID_PINNED_APPS: GUID = GUID {
        data1: 0x4CE81583,
        data2: 0x1E4C,
        data3: 0x4632,
        data4: [0xA6, 0x21, 0x07, 0xA5, 0x35, 0x43, 0x14, 0x8F],
    };

    // Define the interface vtable manually (not in windows-rs — it's undocumented)
    #[interface("4CE81583-1E4C-4632-A621-07A53543148F")]
    unsafe trait IVirtualDesktopPinnedApps: IUnknown {
        fn IsAppIdPinned(&self, app_id: PCWSTR, is_pinned: *mut i32) -> HRESULT;
        fn PinAppID(&self, app_id: PCWSTR) -> HRESULT;
        fn UnpinAppID(&self, app_id: PCWSTR) -> HRESULT;
        fn IsWindowPinned(&self, hwnd: HWND, is_pinned: *mut i32) -> HRESULT;
        fn PinWindow(&self, hwnd: HWND) -> HRESULT;
        fn UnpinWindow(&self, hwnd: HWND) -> HRESULT;
    }

    // ── Get HWND from Tauri window ────────────────────────────────────────────
    let hwnd = match window.window_handle() {
        Ok(h) => match h.as_raw() {
            RawWindowHandle::Win32(w) => HWND(w.hwnd.get() as *mut _),
            _ => return,
        },
        Err(_) => return,
    };

    // ── Call COM ──────────────────────────────────────────────────────────────
    unsafe {
        // Initialize COM on this thread (silently ignore if already initialised)
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

        // Get the ImmersiveShell service provider
        let sp: Result<IServiceProvider> =
            CoCreateInstance(&CLSID_IMMERSIVE_SHELL, None, CLSCTX_LOCAL_SERVER);
        let sp = match sp {
            Ok(s) => s,
            Err(_) => return, // Shell not available (unlikely on Win10+)
        };

        // Query for the pin interface
        let mut raw: *mut core::ffi::c_void = core::ptr::null_mut();
        let hr = sp.QueryService(
            &SID_PINNED_APPS,
            &IVirtualDesktopPinnedApps::IID,
            &mut raw,
        );
        if hr.is_err() || raw.is_null() {
            return;
        }

        let apps: IVirtualDesktopPinnedApps = IVirtualDesktopPinnedApps::from_raw(raw);
        let _ = apps.PinWindow(hwnd);
    }
}

/// No-op on non-Windows platforms.
#[cfg(not(target_os = "windows"))]
pub fn pin_to_all_virtual_desktops(_window: &tauri::WebviewWindow) {}
