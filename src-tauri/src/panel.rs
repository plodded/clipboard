// src-tauri/src/panel.rs
// NSPanel 浮动窗口管理模块

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_nspanel::{ManagerExt, WebviewWindowExt as PanelExt};

/// Panel 常量
pub const PANEL_LABEL: &str = "panel";
pub const PANEL_HEIGHT: f64 = 340.0;
pub const PANEL_LEVEL: i32 = 25; // NSMainMenuWindowLevel + 1

/// 初始化 NSPanel 窗口
/// 在应用启动时调用，预创建面板以减少首次显示延迟
pub fn init_panel(app: &AppHandle) -> Result<(), String> {
    // 获取主显示器尺寸
    let monitor = app
        .primary_monitor()
        .map_err(|e| format!("Failed to get monitor: {}", e))?
        .ok_or("No primary monitor found")?;

    let screen_size = monitor.size();
    let scale_factor = monitor.scale_factor();

    // 计算面板尺寸（全屏宽度）
    let panel_width = screen_size.width as f64 / scale_factor;
    let panel_y = (screen_size.height as f64 / scale_factor) - PANEL_HEIGHT;

    log::info!(
        "Creating panel: width={}, height={}, y={}",
        panel_width,
        PANEL_HEIGHT,
        panel_y
    );

    // 创建窗口
    let window = WebviewWindowBuilder::new(app, PANEL_LABEL, WebviewUrl::App("index.html".into()))
        .title("MacPaste")
        .inner_size(panel_width, PANEL_HEIGHT)
        .position(0.0, panel_y)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .visible(false)
        .skip_taskbar(true)
        .resizable(false)
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;

    // 转换为 NSPanel
    let panel = window.to_panel().map_err(|e| format!("{:?}", e))?;

    // 设置窗口级别（确保在 Dock 之上）
    panel.set_level(PANEL_LEVEL);

    log::info!("NSPanel initialized successfully with level {}", PANEL_LEVEL);
    Ok(())
}

/// 显示面板
/// 重新计算位置以支持多显示器场景
pub fn show_panel(app: &AppHandle) -> Result<(), String> {
    let panel = app
        .get_webview_panel(PANEL_LABEL)
        .map_err(|e| format!("{:?}", e))?;

    // 重新计算位置（支持多显示器）
    if let Ok(Some(monitor)) = app.primary_monitor() {
        let screen_size = monitor.size();
        let scale_factor = monitor.scale_factor();
        let panel_width = screen_size.width as f64 / scale_factor;
        let panel_y = (screen_size.height as f64 / scale_factor) - PANEL_HEIGHT;

        // 更新窗口大小和位置
        if let Some(window) = app.get_webview_window(PANEL_LABEL) {
            let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(
                panel_width,
                PANEL_HEIGHT,
            )));
            let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(
                0.0, panel_y,
            )));
        }
    }

    panel.show();

    log::debug!("Panel shown");
    Ok(())
}

/// 隐藏面板
pub fn hide_panel(app: &AppHandle) -> Result<(), String> {
    let panel = app
        .get_webview_panel(PANEL_LABEL)
        .map_err(|e| format!("{:?}", e))?;

    panel.order_out(None);

    log::debug!("Panel hidden");
    Ok(())
}

/// 切换面板显示状态
/// 返回新的可见性状态：true = 显示，false = 隐藏
pub fn toggle_panel(app: &AppHandle) -> Result<bool, String> {
    let panel = app
        .get_webview_panel(PANEL_LABEL)
        .map_err(|e| format!("{:?}", e))?;

    if panel.is_visible() {
        hide_panel(app)?;
        Ok(false)
    } else {
        show_panel(app)?;
        Ok(true)
    }
}
