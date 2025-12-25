# Spike 验证报告：tauri-nspanel 集成

**日期**: 2025-12-25
**风险 ID**: R-001
**状态**: ✅ PASSED
**验证人**: Dev Team

---

## 验收标准结果

| # | 验收标准 | 结果 | 备注 |
|---|----------|------|------|
| 1 | 成功集成 `tauri-nspanel` 插件到项目 | ✅ 通过 | v2 分支兼容 Tauri 2.x |
| 2 | 显示无边框浮动窗口 (decorations: false) | ✅ 通过 | WebviewWindowBuilder 配置 |
| 3 | 验证面板不被 Dock 遮挡 | ✅ 通过 | 窗口级别 25 有效 |
| 4 | 基础 show/hide API 可用 | ✅ 通过 | panel.show() / panel.order_out(None) |

---

## tauri-nspanel 使用指南

### 依赖配置

**Cargo.toml:**
```toml
[dependencies]
tauri = { version = "2", features = ["macos-private-api"] }
tauri-nspanel = { git = "https://github.com/ahkohd/tauri-nspanel", branch = "v2" }
```

**tauri.conf.json:**
```json
{
  "app": {
    "macOSPrivateApi": true
  }
}
```

### 核心 API

```rust
use tauri_nspanel::{ManagerExt, WebviewWindowExt};

// 1. 创建窗口并转换为 NSPanel
let window = tauri::WebviewWindowBuilder::new(
    &app,
    "panel-label",
    tauri::WebviewUrl::App("panel.html".into()),
)
.decorations(false)      // 无边框
.transparent(true)       // 透明背景
.always_on_top(true)     // 始终置顶
.visible(false)          // 初始隐藏
.resizable(false)        // 不可调整大小
.inner_size(800.0, 340.0)
.build()
.map_err(|e| e.to_string())?;

// 2. 转换为 NSPanel
let panel = window.to_panel().map_err(|e| format!("{:?}", e))?;

// 3. 设置窗口级别（确保在 Dock 之上）
panel.set_level(25);  // NSMainMenuWindowLevel + 1

// 4. 显示/隐藏
panel.show();
panel.order_out(None);  // 隐藏

// 5. 检查可见性
panel.is_visible();

// 6. 获取已存在的 panel
app.get_webview_panel("panel-label").map_err(|e| format!("{:?}", e))?;
```

---

## 关键注意事项

### 1. 窗口级别 (Window Level)

| 级别 | 常量名 | 用途 |
|------|--------|------|
| 8 | NSStatusWindowLevel | 状态窗口，低于 Dock |
| 24 | NSMainMenuWindowLevel | 主菜单级别 |
| **25** | NSMainMenuWindowLevel + 1 | **推荐：在 Dock 之上** |

> ⚠️ 使用数字而非废弃的常量（如 `NSMainMenuWindowLevel`），避免编译警告。

### 2. 屏幕定位

```rust
// 获取当前显示器信息
if let Some(monitor) = window.current_monitor().ok().flatten() {
    let screen_size = monitor.size();
    let screen_position = monitor.position();

    // 计算屏幕底部居中位置
    let x = screen_position.x as f64 + (screen_size.width as f64 - panel_width) / 2.0;
    let y = screen_position.y as f64 + screen_size.height as f64 - panel_height;

    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x: x as i32,
        y: y as i32,
    }));
}
```

> ⚠️ Tauri 使用左上角为原点的坐标系，而非 macOS 原生的左下角原点。

### 3. 错误处理

`tauri_nspanel::Error` 没有实现 `Display` trait，需要使用 Debug 格式化：

```rust
// ❌ 错误
.map_err(|e| e.to_string())?;

// ✅ 正确
.map_err(|e| format!("{:?}", e))?;
```

### 4. Plugin 初始化

```rust
tauri::Builder::default()
    .plugin(tauri_nspanel::init())  // 必须注册插件
    // ...
```

### 5. 检查 Panel 是否存在

```rust
// get_webview_panel 返回 Result，不是 Option
if app.get_webview_panel("panel-label").is_ok() {
    // panel 已存在
}
```

---

## 推荐的 Panel 创建模式

对于 MacPaste 剪贴板管理器，推荐以下模式：

1. **应用启动时创建 Panel**（预创建策略）
   - 减少首次显示延迟
   - 只切换可见性，不重复创建

2. **Panel 配置**
   - 宽度：全屏宽度或 800px
   - 高度：340px（适合显示剪贴板卡片列表）
   - 位置：屏幕底部居中
   - 无边框、透明背景

3. **窗口拖拽**
   - 在 HTML 中使用 `-webkit-app-region: drag` 启用拖拽
   - 交互元素使用 `-webkit-app-region: no-drag`

---

## 相关文件

- 插件仓库: https://github.com/ahkohd/tauri-nspanel (branch: v2)
- Tauri 官方文档: https://v2.tauri.app/
- 测试设计文档: `_bmad-output/test-design-epic-1.md`

---

## 后续开发建议

1. **Story 1.1 实现时**：
   - 使用预创建策略，在 `setup()` 中创建 panel
   - 实现全局快捷键触发 toggle

2. **性能优化**：
   - 监控 panel.show() 响应时间
   - 目标：< 200ms (NFR2)

3. **测试覆盖**：
   - 由于 macOS WKWebView 不支持 WebDriver，NSPanel 行为需要手动测试
   - 可以使用 mockIPC 测试命令调用

---

_Generated: 2025-12-25 by Sprint 0 Spike Validation_
