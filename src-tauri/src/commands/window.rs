// src-tauri/src/commands/window.rs
// 窗口控制命令

use tauri::AppHandle;

use crate::panel;

/// 显示面板
#[tauri::command]
pub fn show_panel(app: AppHandle) -> Result<(), String> {
    panel::show_panel(&app)
}

/// 隐藏面板
#[tauri::command]
pub fn hide_panel(app: AppHandle) -> Result<(), String> {
    panel::hide_panel(&app)
}

/// 切换面板显示状态
/// 返回新的可见性状态
#[tauri::command]
pub fn toggle_panel(app: AppHandle) -> Result<bool, String> {
    panel::toggle_panel(&app)
}
