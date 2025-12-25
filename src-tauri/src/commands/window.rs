//! 窗口控制命令模块
//!
//! 提供 NSPanel 浮动窗口的显示、隐藏和切换功能。

use log::info;
use tauri::Manager;
use tauri_nspanel::ManagerExt;

pub const PANEL_HEIGHT: f64 = 340.0; // 逻辑像素

/// 将面板定位到指定显示器的底部
pub fn position_panel_on_monitor(
    window: &tauri::WebviewWindow,
    monitor: &tauri::Monitor,
) -> Result<(), String> {
    let screen_size = monitor.size();
    let screen_position = monitor.position();
    let scale_factor = monitor.scale_factor();

    // 计算逻辑像素尺寸
    let logical_screen_width = screen_size.width as f64 / scale_factor;
    let logical_screen_height = screen_size.height as f64 / scale_factor;

    // 设置全屏宽度
    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
        width: logical_screen_width,
        height: PANEL_HEIGHT,
    }));

    // 定位到屏幕底部
    let logical_x = screen_position.x as f64 / scale_factor;
    let logical_y =
        screen_position.y as f64 / scale_factor + logical_screen_height - PANEL_HEIGHT;

    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
        x: logical_x,
        y: logical_y,
    }));

    info!(
        "Panel positioned on monitor at ({}, {}) size {}x{} (scale: {})",
        logical_x, logical_y, logical_screen_width, PANEL_HEIGHT, scale_factor
    );

    Ok(())
}

/// 获取主显示器（Dock 所在的显示器）
pub fn get_primary_monitor(app: &tauri::AppHandle) -> Option<tauri::Monitor> {
    // 优先返回主显示器（Dock 通常在主显示器上）
    if let Some(primary) = app.primary_monitor().ok().flatten() {
        return Some(primary);
    }

    // 回退到第一个可用显示器
    let monitors = app.available_monitors().ok()?;
    monitors.into_iter().next()
}

/// 显示面板
///
/// 在显示前先定位到当前显示器底部，然后显示。
#[tauri::command]
pub fn show_panel(app: tauri::AppHandle) -> Result<(), String> {
    info!("show_panel called");

    // 获取窗口用于定位
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    // 获取主显示器并定位面板
    if let Some(monitor) = get_primary_monitor(&app) {
        position_panel_on_monitor(&window, &monitor)?;
    }

    // 显示面板
    let panel = app
        .get_webview_panel("main")
        .map_err(|e| format!("{:?}", e))?;
    panel.show();

    info!("Panel shown successfully");
    Ok(())
}

/// 隐藏面板
///
/// 使用 order_out(None) 而非 hide() 来隐藏面板。
/// order_out 正确移除窗口而不影响焦点，hide() 可能导致焦点问题。
#[tauri::command]
pub fn hide_panel(app: tauri::AppHandle) -> Result<(), String> {
    info!("hide_panel called");
    let panel = app
        .get_webview_panel("main")
        .map_err(|e| format!("{:?}", e))?;
    panel.order_out(None);
    info!("Panel hidden successfully");
    Ok(())
}

/// 切换面板可见性
///
/// 如果面板可见则隐藏，否则定位到当前显示器并显示。
#[tauri::command]
pub fn toggle_panel(app: tauri::AppHandle) -> Result<(), String> {
    info!("toggle_panel called");
    let panel = app
        .get_webview_panel("main")
        .map_err(|e| format!("{:?}", e))?;

    if panel.is_visible() {
        panel.order_out(None);
        info!("Panel toggled: now hidden");
    } else {
        // 获取窗口用于定位
        let window = app
            .get_webview_window("main")
            .ok_or_else(|| "Main window not found".to_string())?;

        // 获取主显示器并定位面板
        if let Some(monitor) = get_primary_monitor(&app) {
            position_panel_on_monitor(&window, &monitor)?;
        }

        panel.show();
        info!("Panel toggled: now visible");
    }
    Ok(())
}
