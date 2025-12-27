// src-tauri/src/commands/app.rs
// 应用相关命令

/// 获取当前前台应用名称
///
/// 在 macOS 上使用 NSWorkspace API 获取前台应用。
/// 其他平台返回 "Unknown App"。
#[tauri::command]
pub fn get_frontmost_app() -> String {
    #[cfg(target_os = "macos")]
    {
        use objc2_app_kit::NSWorkspace;

        unsafe {
            let workspace = NSWorkspace::sharedWorkspace();
            if let Some(app) = workspace.frontmostApplication() {
                if let Some(name) = app.localizedName() {
                    return name.to_string();
                }
            }
        }
    }
    "Unknown App".to_string()
}
