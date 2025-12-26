# 开发日志：Story 1.1 ~ 1.3 实施记录

**日期**: 2025-12-26
**开发者**: Claude Code (Opus 4.5)
**状态**: ✅ 已完成

---

## 概述

本次实施完成了 Epic 1 的前三个 Story，实现了 MacPaste 应用的核心系统集成功能：

| Story | 功能 | 状态 |
|-------|------|------|
| 1.1 | NSPanel 浮动窗口 | ✅ 完成 |
| 1.2 | 全局快捷键 (Cmd+Shift+V) | ✅ 完成 |
| 1.3 | 系统托盘 + Dock 隐藏 | ✅ 完成 |

---

## Story 1.1: NSPanel 浮动窗口

### 实现内容

- 使用 `tauri-nspanel` v2 插件实现 Spotlight 风格浮动面板
- 面板配置：全屏宽度 × 340px 高度，屏幕底部定位
- 窗口级别设置为 25 (NSMainMenuWindowLevel + 1)，确保显示在 Dock 之上
- 无边框、透明背景、始终置顶

### 关键文件

- `src-tauri/src/panel.rs` - NSPanel 管理模块（新建）
- `src-tauri/src/commands/window.rs` - 窗口控制命令（新建）

### 技术决策

1. **预创建策略**：应用启动时创建 Panel，仅切换可见性，减少首次显示延迟
2. **窗口级别 25**：经 Spike 验证，此级别可确保面板显示在 Dock 之上

---

## Story 1.2: 全局快捷键

### 实现内容

- 使用 `tauri-plugin-global-shortcut` v2 注册全局热键
- 快捷键：`Cmd+Shift+V` 切换面板显示/隐藏
- 响应时间 < 200ms

### 关键文件

- `src-tauri/src/lib.rs` - 在 Builder 中注册快捷键 handler

### 技术决策

1. **OnceLock 模式**：使用 `OnceLock<AppHandle>` 存储 AppHandle，供快捷键回调使用
2. **单次注册**：避免在 Builder 和 setup hook 中重复注册插件

---

## Story 1.3: 系统托盘与 Dock 隐藏

### 实现内容

- 使用 Tauri 内置 `tray-icon` feature 创建系统托盘
- 托盘菜单：显示/隐藏面板、退出
- 使用 `setDockVisibility(false)` API 隐藏 Dock 图标

### 关键文件

- `src-tauri/src/lib.rs` - setup_tray() 函数

### 技术决策

1. **初始化顺序**：Panel → Tray → Dock 隐藏，确保用户始终有退出入口
2. **托盘菜单合并**：使用单个 "显示/隐藏面板" 选项替代两个独立选项

---

## 额外实现：失焦自动隐藏

### 实现内容

- 点击面板外部区域时自动隐藏面板
- 在前端监听 `window.blur` 事件，调用 `hide_panel` 命令

### 关键文件

- `src/App.tsx` - useEffect 监听 blur 事件

### 技术决策

使用前端 blur 事件方案替代 Rust delegate 方案，原因：
- `panel_delegate!` 宏 API 复杂，兼容性问题
- 前端方案简单可靠，跨版本兼容

---

## 文件变更清单

### 新建文件

| 文件 | 说明 |
|------|------|
| `src-tauri/src/panel.rs` | NSPanel 管理模块 |
| `src-tauri/src/commands/mod.rs` | 命令模块入口 |
| `src-tauri/src/commands/window.rs` | 窗口控制命令 |

### 修改文件

| 文件 | 变更内容 |
|------|----------|
| `src-tauri/src/lib.rs` | 完全重写：插件注册、setup hook、托盘、快捷键 |
| `src-tauri/Cargo.toml` | 添加 tray-icon feature、global-shortcut、log 依赖 |
| `src-tauri/tauri.conf.json` | 移除默认窗口配置、配置 CSP 安全策略 |
| `src-tauri/capabilities/default.json` | 添加权限配置 |
| `src/App.tsx` | 移除模拟快捷键、添加失焦隐藏、简化渲染结构 |
| `package.json` | 添加 @tauri-apps/plugin-global-shortcut、@tauri-apps/plugin-log 依赖 |
| `package-lock.json` | npm 依赖锁文件更新 |

---

## 依赖变更

### Rust (Cargo.toml)

```toml
tauri = { version = "2", features = ["macos-private-api", "tray-icon"] }
tauri-plugin-global-shortcut = "2"
tauri-plugin-log = "2"
log = "0.4"
```

### npm (package.json)

```bash
npm install @tauri-apps/plugin-global-shortcut @tauri-apps/plugin-log
```

---

## 验收标准验证

### Story 1.1 验收

- [x] 面板无边框，全屏宽度，底部显示
- [x] 面板在 Dock 之上 (level 25)
- [x] 点击外部自动隐藏

### Story 1.2 验收

- [x] Cmd+Shift+V 任意应用可触发
- [x] 响应时间 < 200ms
- [x] 再按隐藏面板

### Story 1.3 验收

- [x] 托盘图标显示在菜单栏
- [x] 托盘菜单：显示/隐藏面板、退出
- [x] Dock 不显示应用图标

---

## 已知问题

1. **日志重复输出**：每条日志输出两次（stdout + logfile），属于 tauri-plugin-log 行为，非错误

---

## 后续工作

- Story 1.4: Zustand 状态管理迁移
- Story 1.5: 键盘导航与窗口交互集成
- Story 1.6: 搜索过滤与收藏功能验证

---

_Generated: 2025-12-26 by Claude Code_
