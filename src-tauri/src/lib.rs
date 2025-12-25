//! MacPaste - macOS 剪贴板管理器
//!
//! 基于 Tauri 2.x 和 tauri-nspanel 实现的类 Spotlight 风格浮动面板应用。

mod commands;

use log::info;
use tauri::{Manager, RunEvent};
use tauri_nspanel::{ManagerExt, WebviewWindowExt};
use tauri_plugin_log::{Target, TargetKind};

/// 初始化 NSPanel 窗口
///
/// 将主窗口转换为 NSPanel，设置窗口级别和屏幕定位。
///
/// # 关键技术点
/// - 窗口级别 25 (NSMainMenuWindowLevel + 1) 确保在 Dock 之上
/// - Tauri 使用左上角原点坐标系
/// - 错误使用 Debug 格式化，因为 tauri_nspanel::Error 没有 Display trait
fn init_panel(app: &tauri::AppHandle) -> Result<(), String> {
    info!("Initializing NSPanel...");

    // 获取主窗口
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    // 转换为 NSPanel
    let panel = window.to_panel().map_err(|e| format!("{:?}", e))?;

    // 设置窗口级别为 25 (NSMainMenuWindowLevel + 1)
    // 确保在 Dock 之上显示
    panel.set_level(25);
    info!("Panel level set to 25 (above Dock)");

    // 设置点击外部自动隐藏 (AC3)
    panel.set_hides_on_deactivate(true);
    info!("Panel configured to hide on deactivate (click outside)");

    // 获取当前显示器信息并设置全屏宽度和底部定位
    if let Some(monitor) = window.current_monitor().ok().flatten() {
        let screen_size = monitor.size();
        let screen_position = monitor.position();
        let scale_factor = monitor.scale_factor();
        let panel_height = 340.0; // 逻辑像素

        // 计算逻辑像素尺寸（考虑 Retina 缩放）
        let logical_screen_width = screen_size.width as f64 / scale_factor;
        let logical_screen_height = screen_size.height as f64 / scale_factor;

        // 设置全屏宽度（使用逻辑像素）
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: logical_screen_width,
            height: panel_height,
        }));
        info!(
            "Panel size set to {}x{} logical pixels (scale_factor: {})",
            logical_screen_width, panel_height, scale_factor
        );

        // 定位到屏幕底部（使用逻辑像素）
        // Tauri 使用左上角原点坐标系
        // y = screen_y + screen_height - panel_height 使面板底边与屏幕底边对齐
        let logical_x = screen_position.x as f64 / scale_factor;
        let logical_y = screen_position.y as f64 / scale_factor + logical_screen_height - panel_height;

        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition {
            x: logical_x,
            y: logical_y,
        }));
        info!("Panel positioned at ({}, {}) logical pixels", logical_x, logical_y);
    } else {
        info!("Could not get monitor info, using default position");
    }

    info!("NSPanel initialization complete");
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_nspanel::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        .setup(|app| {
            // 在 setup 中初始化 NSPanel
            if let Err(e) = init_panel(&app.handle()) {
                log::error!("Failed to initialize panel: {}", e);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::show_panel,
            commands::hide_panel,
            commands::toggle_panel,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // 运行应用并监听事件
    app.run(|app_handle, event| {
        // 监听 Dock 图标点击事件 (macOS reopen 事件)
        if let RunEvent::Reopen { .. } = event {
            info!("Dock icon clicked - toggling panel");
            if let Ok(panel) = app_handle.get_webview_panel("main") {
                if panel.is_visible() {
                    panel.order_out(None);
                    info!("Panel hidden via Dock click");
                } else {
                    // 在显示前定位到主显示器
                    if let Some(window) = app_handle.get_webview_window("main") {
                        if let Some(monitor) = commands::get_primary_monitor(&app_handle) {
                            let _ = commands::position_panel_on_monitor(&window, &monitor);
                        }
                    }
                    panel.show();
                    info!("Panel shown via Dock click");
                }
            }
        }
    });
}
