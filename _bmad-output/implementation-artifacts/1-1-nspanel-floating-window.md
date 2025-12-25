# Story 1.1: NSPanel 浮动窗口

Status: in-progress

<!-- Generated: 2025-12-25 by SM Agent (Bob) -->
<!-- INVEST Validated: Independent, Negotiable, Valuable, Estimable, Small, Testable -->

## Story

As a MacPaste 用户,
I want 应用以类 Spotlight 风格的无边框浮动面板显示,
so that 我可以在不打断当前工作流的情况下快速访问剪贴板历史。

## Acceptance Criteria

### AC1: 无边框浮动面板显示

**Given** 应用已启动并运行
**When** 面板被触发显示
**Then** 显示无边框的浮动面板，无标准窗口装饰（无标题栏、无关闭按钮）
**And** 面板全屏宽度显示在屏幕底部

### AC2: 面板不被 Dock 遮挡

**Given** 面板处于显示状态
**When** 用户的 Dock 栏处于屏幕底部
**Then** 面板不会被 Dock 栏遮挡，始终显示在 Dock 之上

### AC3: 点击外部自动隐藏

**Given** 面板处于显示状态
**When** 用户点击面板外部区域
**Then** 面板自动隐藏

## Tasks / Subtasks

### Task 1: 验证 tauri-nspanel 配置 (AC: #1, #2)

- [x] 1.1 确认 Cargo.toml 已配置 tauri-nspanel (Spike 已完成)
- [x] 1.2 确认 tauri.conf.json 中 `macOSPrivateApi: true`
- [x] 1.3 验证插件在 lib.rs 中正确初始化 `.plugin(tauri_nspanel::init())`

### Task 2: 安装 tauri-plugin-log 日志系统 (架构需求)

- [x] 2.1 添加 tauri-plugin-log 依赖到 Cargo.toml
  ```toml
  tauri-plugin-log = "2"
  ```
- [x] 2.2 添加 @tauri-apps/plugin-log 前端依赖
  ```bash
  npm install @tauri-apps/plugin-log
  ```
- [x] 2.3 在 lib.rs 中注册日志插件 `.plugin(tauri_plugin_log::Builder::default().build())`

### Task 3: 配置窗口属性 (AC: #1)

- [x] 3.1 更新 tauri.conf.json 主窗口配置
  ```json
  {
    "label": "main",
    "title": "MacPaste",
    "decorations": false,
    "transparent": true,
    "visible": false,
    "resizable": false,
    "alwaysOnTop": true,
    "height": 340
  }
  ```
  > **注意**: 宽度不在配置中固定，在 setup hook 中动态设置为屏幕宽度

### Task 4: 实现 NSPanel 窗口转换逻辑 (AC: #1, #2)

- [x] 4.1 创建 `src-tauri/src/commands/mod.rs` 模块导出
- [x] 4.2 创建 `src-tauri/src/commands/window.rs` 窗口控制模块
- [x] 4.3 在 setup hook 中创建窗口并转换为 NSPanel
  ```rust
  let window = app.get_webview_window("main").unwrap();
  let panel = window.to_panel().map_err(|e| format!("{:?}", e))?;
  ```
- [x] 4.4 设置窗口级别为 25 (NSMainMenuWindowLevel + 1)
  ```rust
  panel.set_level(25);
  ```
- [x] 4.5 实现屏幕底部全宽定位逻辑
  ```rust
  // 获取当前显示器信息
  if let Some(monitor) = window.current_monitor().ok().flatten() {
      let screen_size = monitor.size();
      let screen_position = monitor.position();
      let panel_height = 340.0;

      // 设置全屏宽度
      let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
          width: screen_size.width,
          height: panel_height as u32,
      }));

      // 定位到屏幕底部 (Tauri 使用左上角原点坐标系)
      let x = screen_position.x as f64;
      let y = screen_position.y as f64 + screen_size.height as f64 - panel_height;

      let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
          x: x as i32,
          y: y as i32,
      }));
  }
  ```

### Task 5: 暴露窗口控制 API (AC: #1, #2, #3)

- [x] 5.1 实现 `show_panel()` Tauri command
  ```rust
  #[tauri::command]
  pub fn show_panel(app: tauri::AppHandle) -> Result<(), String> {
      let panel = app.get_webview_panel("main").map_err(|e| format!("{:?}", e))?;
      panel.show();
      Ok(())
  }
  ```
- [x] 5.2 实现 `hide_panel()` Tauri command (使用 `order_out`)
  ```rust
  #[tauri::command]
  pub fn hide_panel(app: tauri::AppHandle) -> Result<(), String> {
      let panel = app.get_webview_panel("main").map_err(|e| format!("{:?}", e))?;
      panel.order_out(None);  // 重要：不是 hide()
      Ok(())
  }
  ```
- [x] 5.3 实现 `toggle_panel()` Tauri command
  ```rust
  #[tauri::command]
  pub fn toggle_panel(app: tauri::AppHandle) -> Result<(), String> {
      let panel = app.get_webview_panel("main").map_err(|e| format!("{:?}", e))?;
      if panel.is_visible() {
          panel.order_out(None);
      } else {
          panel.show();
      }
      Ok(())
  }
  ```
- [x] 5.4 注册所有 commands 到 invoke_handler
  ```rust
  .invoke_handler(tauri::generate_handler![
      commands::window::show_panel,
      commands::window::hide_panel,
      commands::window::toggle_panel,
  ])
  ```

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] React `isOpen` 状态未同步: 已删除冗余 `isOpen` 状态，改用 `invoke('hide_panel')` (YAGNI)
- [x] [AI-Review][MEDIUM] 代码重复: `lib.rs` 已复用 `position_panel_on_monitor` 函数 (DRY)
- [x] [AI-Review][MEDIUM] 误导性的快捷键: 已删除，全局快捷键将在 Story 1.2 实现 (YAGNI)
- [x] [AI-Review][LOW] 未使用的依赖: 保留 `tauri-plugin-shell`，已配置权限供后续使用

### Task 6: 验证与测试 (AC: #1, #2, #3)

- [x] 6.1 手动验收测试：无边框底部全宽显示 ✅
  - 启动应用 → 调用 show_panel → 验证无标题栏、无关闭按钮
  - 验证面板宽度等于屏幕宽度
  - 验证面板位于屏幕底部
- [x] 6.2 手动验收测试：不被 Dock 遮挡 ✅
  - Dock 在底部 → 显示面板 → 验证面板在 Dock 之上
- [x] 6.3 手动验收测试：点击外部隐藏 ✅
  - 面板显示 → 点击面板外部 → 验证面板消失
- [x] 6.4 响应时间验证 ✅
  - 目标：show_panel() < 200ms (NFR2)

## Dev Notes

### 架构约束

1. **必须使用 tauri-nspanel 插件**：已通过 Spike 验证 (R-001 PASSED)
2. **必须使用预创建策略**：在 setup() 中创建 panel，只切换可见性
3. **Dock 隐藏已移至 Story 1.3**：本 Story 不实现 Dock 隐藏
4. **窗口控制 API 供后续 Story 调用**：Story 1.2 (快捷键) 和 Story 1.3 (托盘) 都会调用

### 关键技术要点 (来自 Spike 验证)

```rust
// 1. 窗口级别 - 必须使用 25，否则会被 Dock 遮挡
panel.set_level(25);  // NSMainMenuWindowLevel + 1

// 2. 隐藏面板 - 必须使用 order_out，不是 hide()
panel.order_out(None);

// 3. 错误处理 - 必须使用 Debug 格式化
// tauri_nspanel::Error 没有实现 Display trait
.map_err(|e| format!("{:?}", e))?;

// 4. 检查 panel 是否存在 - 返回 Result，不是 Option
app.get_webview_panel("main").is_ok()

// 5. 插件初始化顺序
tauri::Builder::default()
    .plugin(tauri_nspanel::init())  // 必须在 setup 之前
    .plugin(tauri_plugin_log::Builder::default().build())

// 6. 屏幕底部定位 - Tauri 使用左上角原点坐标系
// y = screen_y + screen_height - panel_height
// 这样面板底边与屏幕底边对齐
```

### 文件结构要求

```
src-tauri/src/
├── lib.rs              # 插件注册 + setup hook + invoke_handler
├── commands/
│   ├── mod.rs          # pub mod window;
│   └── window.rs       # show_panel, hide_panel, toggle_panel
```

### 测试策略

> **重要限制**: macOS WKWebView 不支持 WebDriver，NSPanel 行为需要**手动验收测试**

| 测试类型 | 覆盖范围 | 方式 |
|----------|----------|------|
| 单元测试 | Rust command 逻辑 | cargo test (有限) |
| IPC 集成测试 | Tauri 命令调用 | mockIPC + Vitest |
| E2E 功能测试 | NSPanel 行为 | **手动验收** |
| 性能测试 | 响应时间 | 手动测量 + 日志 |

### 依赖说明

| 依赖 | 类型 | 状态 |
|------|------|------|
| tauri-nspanel (v2 branch) | Cargo | 已安装 |
| tauri-plugin-log | Cargo | 已安装 |
| @tauri-apps/plugin-log | npm | 已安装 |
| macOSPrivateApi: true | 配置 | 已配置 |

### Project Structure Notes

**对齐项目结构:**
- `src-tauri/src/commands/` 目录结构符合架构文档规划
- 窗口控制 API 命名使用 snake_case (Rust 约定)
- 前端调用使用 `invoke<T>('command_name')`

**无检测到冲突**

### References

- [Source: _bmad-output/implementation-artifacts/spike-nspanel-validation.md] - Spike 验证完整报告
- [Source: _bmad-output/project-planning-artifacts/architecture.md#NSPanel] - 架构决策
- [Source: _bmad-output/project-planning-artifacts/epics.md#Story-1.1] - 需求来源
- [Source: _bmad-output/project-context.md#Tauri-Rules] - Tauri 开发规范
- [Source: https://github.com/ahkohd/tauri-nspanel (branch: v2)] - 插件仓库

---

## INVEST 合规性验证

| 维度 | 状态 | 说明 |
|------|------|------|
| **I**ndependent | ✅ | 不依赖其他 story，仅使用已安装的 tauri-nspanel 插件 |
| **N**egotiable | ✅ | 面板尺寸、位置等实现细节可调整 |
| **V**aluable | ✅ | 为用户提供类 Spotlight 的无边框浮动窗口体验 |
| **E**stimable | ✅ | 6 个主任务、约 18 个子任务，预估 4-6 小时 |
| **S**mall | ✅ | 单个开发者可在 1 天内完成 |
| **T**estable | ✅ | 每个 AC 有明确的手动测试方法 |

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101) via Claude Code CLI

### Debug Log References

- 编译成功：`cargo build` 无错误
- 修复了 `tauri::Manager` trait 导入问题
- 修复了 Retina 显示屏缩放问题（使用 LogicalSize/LogicalPosition）
- 修复了多显示器定位问题（使用 primary_monitor）

### Completion Notes List

1. **Task 1-3**: 配置验证和更新完成
2. **Task 4-5**: 核心 NSPanel 逻辑和 API 实现完成
3. **Task 6**: 手动验收测试全部通过 ✅
4. **关键修复**:
   - 添加 `use tauri::Manager;` 以使用 `get_webview_window` 方法
   - 使用 `LogicalSize` 和 `LogicalPosition` 处理 Retina 缩放
   - 使用 `primary_monitor()` 确保面板显示在主显示器
   - 添加 `set_hides_on_deactivate(true)` 实现点击外部隐藏
   - 添加 Dock 图标点击切换功能

### Acceptance Criteria Verification

| AC | 描述 | 状态 |
|----|------|------|
| AC1 | 无边框浮动面板显示（全屏宽度，屏幕底部） | ✅ PASSED |
| AC2 | 面板不被 Dock 遮挡（窗口级别 25） | ✅ PASSED |
| AC3 | 点击外部自动隐藏 | ✅ PASSED |

### File List

| 文件 | 操作 | 说明 |
|------|------|------|
| `src-tauri/Cargo.toml` | 修改 | 添加 tauri-plugin-log, log 依赖 |
| `src-tauri/capabilities/default.json` | 修改 | 添加 log:default 权限 |
| `src-tauri/tauri.conf.json` | 修改 | 更新窗口配置为 NSPanel 规格 |
| `src-tauri/src/commands/mod.rs` | 新建 | 命令模块导出 |
| `src-tauri/src/commands/window.rs` | 新建 | show/hide/toggle 命令 + 多显示器定位逻辑 |
| `src-tauri/src/lib.rs` | 修改 | setup hook + NSPanel 初始化 + Dock 点击事件 + DRY 重构 |
| `src/App.tsx` | 修改 | 删除冗余 isOpen 状态，改用 invoke('hide_panel') |
| `src/components/SearchBar.tsx` | 修改 | 简化 focus 逻辑，移除 isVisible prop |

