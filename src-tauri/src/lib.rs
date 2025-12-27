// src-tauri/src/lib.rs
// MacPaste 应用入口

mod commands;
mod panel;

use std::sync::OnceLock;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

// 全局 AppHandle 用于快捷键回调
static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

/// 创建切换面板的快捷键 (Cmd+Shift+V)
/// 抽取为函数以符合 DRY 原则，避免在多处重复定义
fn create_toggle_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyV)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shortcut = create_toggle_shortcut();

    tauri::Builder::default()
        // 插件注册
        .plugin(tauri_nspanel::init())
        .plugin(tauri_plugin_clipboard_x::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |_app, shortcut_matched, event| {
                    if shortcut_matched == &shortcut && event.state() == ShortcutState::Pressed {
                        log::debug!("Global shortcut Cmd+Shift+V triggered");
                        if let Some(app_handle) = APP_HANDLE.get() {
                            if let Err(e) = panel::toggle_panel(app_handle) {
                                log::error!("Failed to toggle panel: {}", e);
                            }
                        } else {
                            log::error!("Global shortcut triggered but APP_HANDLE not initialized");
                        }
                    }
                })
                .build(),
        )
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir { file_name: None },
                ))
                .level(log::LevelFilter::Info)
                .build(),
        )
        // 应用初始化
        .setup(|app| {
            log::info!("MacPaste starting up...");

            // 保存 AppHandle 供快捷键回调使用
            let _ = APP_HANDLE.set(app.handle().clone());

            // 1. 初始化 NSPanel（在隐藏 Dock 之前，确保窗口已创建）
            if let Err(e) = panel::init_panel(app.handle()) {
                log::error!("Failed to initialize panel: {}", e);
                return Err(e.into());
            }

            // 2. 创建系统托盘（在隐藏 Dock 之前，确保用户有退出入口）
            setup_tray(app)?;

            // 3. 隐藏 Dock 图标
            #[cfg(target_os = "macos")]
            {
                if let Err(e) = app.handle().set_dock_visibility(false) {
                    log::warn!("Failed to hide dock icon: {}", e);
                }
                log::info!("Dock visibility set to false");
            }

            // 4. 注册全局快捷键 Cmd+Shift+V
            app.global_shortcut().register(create_toggle_shortcut())?;
            log::info!("Global shortcut Cmd+Shift+V registered");

            log::info!("MacPaste initialized successfully");
            Ok(())
        })
        // 注册命令
        .invoke_handler(tauri::generate_handler![
            commands::show_panel,
            commands::hide_panel,
            commands::toggle_panel,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 设置系统托盘
fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // 创建菜单项
    let toggle_item = MenuItem::with_id(app, "toggle", "显示/隐藏面板", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&toggle_item, &quit_item])?;

    // 加载托盘图标（使用默认窗口图标）
    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or("Failed to get default window icon")?;

    // 创建托盘
    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("MacPaste - 剪贴板管理器")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "toggle" => {
                if let Err(e) = panel::toggle_panel(app) {
                    log::error!("Failed to toggle panel: {}", e);
                }
            }
            "quit" => {
                log::info!("Application quitting via tray menu");
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    log::info!("System tray initialized");
    Ok(())
}
