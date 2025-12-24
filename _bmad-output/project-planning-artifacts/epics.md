---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2025-12-24'
inputDocuments:
  - _bmad-output/prd.md
  - _bmad-output/architecture.md
  - docs/index.md
  - docs/project-overview.md
  - docs/architecture.md
  - docs/component-inventory.md
workflowType: 'epics-and-stories'
project_name: 'MacPaste'
user_name: 'Boss'
date: '2025-12-24'
---

# MacPaste - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for MacPaste, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**剪贴板管理 (FR1-FR7):**
- FR1: 系统可以后台监听 macOS 剪贴板变化并自动捕获新内容
- FR2: 系统可以捕获纯文本类型的剪贴板内容
- FR3: 系统可以捕获富文本（RTF）类型的剪贴板内容
- FR4: 系统可以捕获图片类型的剪贴板内容
- FR5: 系统可以捕获文件引用类型的剪贴板内容
- FR6: 用户可以选择历史记录项并将其写入系统剪贴板
- FR7: 用户可以选择历史记录项后自动粘贴到当前活跃应用

**数据存储与检索 (FR8-FR13):**
- FR8: 系统可以持久化存储剪贴板历史记录，跨应用会话保留
- FR9: 系统可以为每条历史记录保存来源应用信息
- FR10: 系统可以为每条历史记录保存捕获时间戳
- FR11: 用户可以通过关键词搜索历史记录内容
- FR12: 用户可以按内容类型（文本/图片/文件）过滤历史记录
- FR13: 用户可以查看收藏的历史记录

**收藏管理 (FR14-FR15):**
- FR14: 用户可以将历史记录项标记为收藏
- FR15: 用户可以取消历史记录项的收藏标记

**窗口管理 (FR16-FR20):**
- FR16: 系统可以显示无边框浮动面板（NSPanel）
- FR17: 面板显示时不被 Dock 栏遮挡
- FR18: 用户可以通过快捷键切换面板的显示/隐藏状态
- FR19: 用户可以通过 Esc 键关闭面板
- FR20: 面板在用户选择项目后自动关闭

**快捷键与导航 (FR21-FR24):**
- FR21: 用户可以通过全局快捷键 `Cmd+Shift+V` 呼出面板
- FR22: 用户可以使用左右方向键在历史记录项之间导航
- FR23: 用户可以使用回车键确认选择当前项
- FR24: 系统可以高亮显示当前选中的历史记录项

**系统集成 (FR25-FR28):**
- FR25: 系统可以在 macOS 菜单栏显示托盘图标
- FR26: 用户可以通过托盘菜单切换面板显示/隐藏
- FR27: 用户可以通过托盘菜单退出应用
- FR28: 应用运行时不在 Dock 栏显示图标

**内容展示 (FR29-FR33):**
- FR29: 系统可以显示历史记录的内容预览
- FR30: 系统可以显示历史记录的内容类型图标
- FR31: 系统可以显示历史记录的时间戳（相对时间格式）
- FR32: 系统可以显示图片类型记录的缩略图预览
- FR33: 系统可以显示历史记录的收藏状态

### NonFunctional Requirements

| ID | 类型 | 要求 | 架构影响 |
|----|------|------|----------|
| NFR1 | 性能 | 剪贴板监听低延迟 | 需要高效的 Rust 轮询/事件机制 |
| NFR2 | 响应性 | 面板呼出 < 200ms | NSPanel 预创建、状态缓存 |
| NFR3 | 平台 | macOS 12+ 专属 | 可使用原生 API，无跨平台抽象层 |
| NFR4 | 离线 | 完全本地运行 | SQLite 本地存储，无云依赖 |
| NFR5 | 隐蔽性 | Dock 不显示图标 | LSUIElement 配置 |

### Additional Requirements

**从架构文档提取的技术需求：**

**插件依赖：**
- 安装 tauri-plugin-global-shortcut v2.3.0 用于全局快捷键
- 使用 Tauri 内置 tray-icon 功能用于系统托盘
- 安装 tauri-nspanel 社区插件用于 NSPanel 浮动窗口
- 安装 tauri-plugin-clipboard-x 用于剪贴板监听和读写
- 安装 tauri-plugin-sql (SQLite) 用于数据持久化
- 安装 tauri-plugin-log 用于日志记录

**数据库 Schema 需求：**
```sql
CREATE TABLE IF NOT EXISTS clipboard_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  preview_text TEXT,
  timestamp INTEGER NOT NULL,
  is_starred INTEGER DEFAULT 0,
  app_name TEXT,
  metadata TEXT
);
```

**图片存储策略：**
- 图片存储位置：`{app_data}/images/{id}.{ext}`
- 数据库存储相对路径引用
- 使用 `convertFileSrc()` 转换为 WebView URL

**前端状态管理：**
- 从现有 Hooks 迁移到 Zustand 状态管理
- 创建 clipboardStore.ts

**Rust 模块结构：**
- commands/：clipboard.rs, storage.rs, window.rs
- models/：clipboard_item.rs
- services/：image_storage.rs

**LSUIElement 配置：**
- 在 tauri.conf.json 中配置 Info.plist，设置 Dock 不显示

### Epic Strategy (User Specified)

**项目当前状态：** UI 原型阶段 - 前端 UI 已完成，后端剪贴板监听功能待实现

**Epic 拆分策略：**
- **Epic 1：演示版应用** - 基于 mock 数据实现完整的应用框架，包括 NSPanel 窗口、系统托盘、全局快捷键、键盘导航等系统集成功能
- **Epic 2：真实数据层** - 替换 mock 数据为真实实现，包括剪贴板监听、SQLite 持久化、图片存储等后端能力

### FR Coverage Map

| FR | Epic | 说明 |
|----|------|------|
| FR1 | Epic 2 | 后台监听剪贴板变化 |
| FR2 | Epic 2 | 捕获纯文本内容 |
| FR3 | Epic 2 | 捕获富文本内容 |
| FR4 | Epic 2 | 捕获图片内容 |
| FR5 | Epic 2 | 捕获文件引用内容 |
| FR6 | Epic 2 | 写入剪贴板 |
| FR7 | Epic 2 | 自动粘贴 |
| FR8 | Epic 2 | 持久化存储 |
| FR9 | Epic 2 | 保存来源应用 |
| FR10 | Epic 2 | 保存时间戳 |
| FR11 | Epic 1 (UI) + Epic 2 (后端) | 搜索历史 |
| FR12 | Epic 1 (UI) + Epic 2 (后端) | 类型过滤 |
| FR13 | Epic 1 (UI) + Epic 2 (后端) | 收藏过滤 |
| FR14 | Epic 1 (UI) + Epic 2 (后端) | 标记收藏 |
| FR15 | Epic 1 (UI) + Epic 2 (后端) | 取消收藏 |
| FR16 | Epic 1 | NSPanel 浮动面板 |
| FR17 | Epic 1 | 面板不被 Dock 遮挡 |
| FR18 | Epic 1 | 快捷键切换面板 |
| FR19 | Epic 1 | Esc 关闭面板 |
| FR20 | Epic 1 | 选择后自动关闭 |
| FR21 | Epic 1 | 全局快捷键 Cmd+Shift+V |
| FR22 | Epic 1 | 方向键导航 |
| FR23 | Epic 1 | 回车确认选择 |
| FR24 | Epic 1 | 高亮当前选中项 |
| FR25 | Epic 1 | 菜单栏托盘图标 |
| FR26 | Epic 1 | 托盘菜单切换面板 |
| FR27 | Epic 1 | 托盘菜单退出 |
| FR28 | Epic 1 | Dock 不显示图标 |
| FR29 | Epic 1 | 内容预览 |
| FR30 | Epic 1 | 内容类型图标 |
| FR31 | Epic 1 | 时间戳显示 |
| FR32 | Epic 1 | 图片缩略图 |
| FR33 | Epic 1 | 收藏状态显示 |

## Epic List

### Epic 1: 演示版应用（Demo App with Mock Data）

用户可以体验完整的 MacPaste 交互流程 - 通过全局快捷键呼出浮动面板，使用键盘导航选择历史记录，搜索和过滤内容，管理收藏，通过系统托盘控制应用。所有功能基于 mock 数据运行。

**FRs covered:** FR11-FR33 (UI 层面), 共 23 条

**技术要点:**
- 安装 tauri-nspanel、global-shortcut、tray 插件
- 配置 LSUIElement 隐藏 Dock
- 迁移到 Zustand 状态管理
- Mock 数据驱动 UI 展示

### Epic 2: 真实数据层（Real Data Layer）

用户的剪贴板操作被真实监听和存储，历史记录跨应用会话保留，选择记录后内容被写入系统剪贴板并自动粘贴。应用从演示版升级为功能完整的生产版本。

**FRs covered:** FR1-FR15 (后端层面), 共 15 条

**技术要点:**
- 安装 tauri-plugin-clipboard-x、tauri-plugin-sql
- 初始化 SQLite 数据库 Schema
- 实现图片文件存储策略
- 替换 mock 数据为真实 IPC 调用

---

## Epic 1: 演示版应用（Demo App with Mock Data）

**Epic 目标:** 实现完整的应用框架，包括 NSPanel 窗口、系统托盘、全局快捷键、键盘导航等系统集成功能，使用 mock 数据驱动 UI，让用户可以体验完整的交互流程。

---

### Story 1.1: NSPanel 浮动窗口与 Dock 隐藏

**As a** MacPaste 用户,
**I want** 应用以类 Spotlight 风格的无边框浮动面板显示,
**So that** 我可以在不打断当前工作流的情况下快速访问剪贴板历史。

**FRs covered:** FR16, FR17, FR28

**技术任务：**
- 安装并配置 `tauri-nspanel` 插件
- 安装并配置 `tauri-plugin-log` 日志系统
- 配置 `tauri.conf.json` 窗口属性（decorations: false, transparent: true）
- 配置 `Info.plist` 的 `LSUIElement = true` 隐藏 Dock 图标
- 实现 NSPanel 窗口转换逻辑
- 暴露窗口控制 API：`show_panel()`, `hide_panel()`, `toggle_panel()`（供 Story 1.2 和 1.3 调用）

**Acceptance Criteria:**

**Given** 应用已启动并运行
**When** 面板被触发显示
**Then** 显示无边框的浮动面板，无标准窗口装饰（无标题栏、无关闭按钮）
**And** 面板居中显示在屏幕上

**Given** 面板处于显示状态
**When** 用户的 Dock 栏处于屏幕底部
**Then** 面板不会被 Dock 栏遮挡，始终显示在 Dock 之上

**Given** 应用正在运行
**When** 用户查看 macOS Dock 栏
**Then** 应用图标不显示在 Dock 中

**Given** 面板处于显示状态
**When** 用户点击面板外部区域
**Then** 面板自动隐藏

---

### Story 1.2: 全局快捷键呼出面板

**As a** MacPaste 用户,
**I want** 通过全局快捷键 `Cmd+Shift+V` 随时呼出或隐藏面板,
**So that** 我可以在任何应用中快速访问剪贴板历史。

**FRs covered:** FR18, FR21

**技术任务：**
- 安装并配置 `@tauri-apps/plugin-global-shortcut`
- 注册 `Cmd+Shift+V` 全局热键
- 实现快捷键事件与窗口显示/隐藏的绑定（调用 Story 1.1 的窗口控制 API）
- 替换现有浏览器内的模拟实现（`App.tsx:110-145`）

**Acceptance Criteria:**

**Given** 应用在后台运行，面板处于隐藏状态
**When** 用户在任意应用中按下 `Cmd+Shift+V`
**Then** MacPaste 面板立即显示在屏幕中央
**And** 面板响应时间小于 200ms

**Given** 面板处于显示状态
**When** 用户按下 `Cmd+Shift+V`
**Then** 面板隐藏

**Given** 其他应用（如 VS Code）正在前台运行
**When** 用户按下 `Cmd+Shift+V`
**Then** MacPaste 面板显示，但不抢占其他应用的焦点状态

---

### Story 1.3: 系统托盘与应用控制

**As a** MacPaste 用户,
**I want** 通过菜单栏托盘图标控制应用,
**So that** 我可以方便地管理应用的显示状态和退出。

**FRs covered:** FR25, FR26, FR27

**技术任务：**
- 配置 Tauri 内置 `tray-icon` 功能
- 创建托盘图标资源
- 实现托盘菜单：显示/隐藏面板、退出应用（调用 Story 1.1 的窗口控制 API）
- Rust 端处理菜单事件

**Acceptance Criteria:**

**Given** 应用已启动
**When** 用户查看 macOS 菜单栏
**Then** MacPaste 托盘图标显示在菜单栏中

**Given** 托盘图标已显示
**When** 用户点击托盘图标
**Then** 显示下拉菜单，包含"显示/隐藏面板"和"退出"选项

**Given** 面板处于隐藏状态
**When** 用户点击托盘菜单的"显示面板"
**Then** 面板显示

**Given** 面板处于显示状态
**When** 用户点击托盘菜单的"隐藏面板"
**Then** 面板隐藏

**Given** 应用正在运行
**When** 用户点击托盘菜单的"退出"
**Then** 应用完全退出，托盘图标消失

---

### Story 1.4: Zustand 状态管理迁移

**As a** 开发者,
**I want** 将现有 React State 迁移到 Zustand 状态管理,
**So that** 应用具备可维护的全局状态架构，为后续真实数据集成做好准备。

**FRs covered:** 架构需求

**技术任务：**
- 安装 `zustand` 库
- 创建 `src/stores/clipboardStore.ts`
- 迁移 `App.tsx` 中的状态：items, selectedIndex, searchQuery, filterCategory, isOpen
- 更新组件使用 store 替代 props drilling
- 保持 mock 数据驱动，功能行为不变

**Acceptance Criteria:**

**Given** 状态迁移完成后
**When** 应用启动
**Then** 所有现有功能（搜索、过滤、收藏、导航）行为与迁移前完全一致

**Given** clipboardStore 已创建
**When** 组件需要访问剪贴板数据
**Then** 通过 `useClipboardStore` hook 获取，无需通过 props 传递

**Given** 用户执行任何状态变更操作（搜索、过滤、收藏）
**When** 操作完成
**Then** 相关状态在 store 中正确更新，UI 响应式刷新

**Given** 迁移完成
**When** 检查代码结构
**Then** `App.tsx` 中不再包含 `useState` 管理的业务状态（items, searchQuery 等）

---

### Story 1.5: 键盘导航与窗口交互集成

**As a** MacPaste 用户,
**I want** 使用键盘完成完整的交互流程,
**So that** 我可以高效地选择和粘贴历史记录。

**FRs covered:** FR19, FR20, FR22, FR23, FR24

**技术任务：**
- 验证现有键盘导航在 Tauri + NSPanel 环境中正常工作
- 确保 Esc 关闭面板与 NSPanel 集成
- 确保回车选择后自动关闭面板
- 适配焦点管理逻辑

**Acceptance Criteria:**

**Given** 面板显示，有多个历史记录项
**When** 用户按下左方向键
**Then** 选中项向左移动一位，高亮显示变化

**Given** 面板显示，有多个历史记录项
**When** 用户按下右方向键
**Then** 选中项向右移动一位，高亮显示变化

**Given** 面板显示，某项被选中
**When** 用户按下回车键
**Then** 选中项内容被复制到系统剪贴板（模拟）
**And** 显示成功提示 Toast
**And** 面板自动关闭

**Given** 面板显示
**When** 用户按下 Esc 键
**Then** 面板关闭，不执行任何复制操作

**Given** 面板显示，第一项被选中
**When** 用户持续按左方向键
**Then** 选中项保持在第一项，不会越界

---

### Story 1.6: 搜索过滤与收藏功能验证

**As a** MacPaste 用户,
**I want** 搜索、过滤和收藏剪贴板历史记录,
**So that** 我可以快速找到需要的内容。

**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR29, FR30, FR31, FR32, FR33

**技术任务：**
- 验证搜索功能在新架构下正常工作
- 验证类型过滤（全部/文本/图片/文件/收藏）正常工作
- 验证收藏标记/取消功能正常工作
- 验证内容展示（预览、图标、时间戳、缩略图）正常显示

**Acceptance Criteria:**

**Given** 面板显示，有多种类型的历史记录
**When** 用户在搜索框输入关键词
**Then** 列表实时过滤，只显示内容匹配的项

**Given** 面板显示
**When** 用户点击"图片"过滤按钮
**Then** 只显示图片类型的历史记录

**Given** 面板显示
**When** 用户点击某项的收藏按钮
**Then** 该项的收藏状态切换（星号图标变化）
**And** 状态持久化保存

**Given** 面板显示
**When** 用户点击"收藏"过滤按钮
**Then** 只显示已收藏的历史记录

**Given** 历史记录列表显示
**When** 用户查看任意记录项
**Then** 可以看到：内容预览、类型图标、相对时间戳、收藏状态
**And** 图片类型显示缩略图预览

---

## Epic 2: 真实数据层（Real Data Layer）

**Epic 目标:** 替换 mock 数据为真实后端实现，包括剪贴板监听、SQLite 持久化、图片存储等后端能力，使应用具备完整的生产级剪贴板管理功能。

---

### Story 2.1: 剪贴板监听与内容捕获

**As a** MacPaste 用户,
**I want** 应用自动捕获我复制的所有内容,
**So that** 我的剪贴板历史被实时记录，无需手动操作。

**FRs covered:** FR1, FR2, FR3, FR4, FR5

**技术任务：**
- 安装并配置 `tauri-plugin-clipboard-x`
- 实现后台剪贴板监听 `startListening()`
- 处理 `onClipboardChange` 回调
- 支持捕获：纯文本、RTF、图片、文件引用
- 将捕获的内容发送到前端 store
- 实现内容去重逻辑

**Acceptance Criteria:**

**Given** 应用在后台运行
**When** 用户在任意应用中复制纯文本内容
**Then** MacPaste 自动捕获该内容
**And** 新记录出现在历史列表顶部

**Given** 应用在后台运行
**When** 用户复制富文本内容（如从 Word 复制带格式文本）
**Then** MacPaste 捕获 RTF 格式内容
**And** 显示纯文本预览

**Given** 应用在后台运行
**When** 用户复制图片（如截图或从网页复制图片）
**Then** MacPaste 捕获图片内容
**And** 在历史列表中显示缩略图预览

**Given** 应用在后台运行
**When** 用户在 Finder 中复制文件
**Then** MacPaste 捕获文件引用
**And** 显示文件名和类型图标

**Given** 剪贴板监听正在运行
**When** 捕获到新内容
**Then** 自动记录来源应用名称和时间戳

**Given** 用户连续复制相同内容
**When** 剪贴板监听检测到重复内容
**Then** 不创建新记录，仅更新现有记录的时间戳

---

### Story 2.2: SQLite 数据持久化

**As a** MacPaste 用户,
**I want** 剪贴板历史跨应用会话保留,
**So that** 重启应用后我仍能访问之前的历史记录。

**FRs covered:** FR8, FR9, FR10

**技术任务：**
- 安装并配置 `tauri-plugin-sql` (SQLite)
- 创建数据库 Schema（clipboard_items 表）
- 实现 Tauri Commands：`get_clipboard_items`, `save_clipboard_item`, `delete_item`
- 前端 store 从数据库加载数据替代 mock 数据
- 配置数据库文件存储位置（Tauri app data 目录）
- 实现错误处理和日志记录

**Acceptance Criteria:**

**Given** 应用首次启动
**When** 数据库文件不存在
**Then** 自动创建数据库并初始化 Schema

**Given** 新的剪贴板内容被捕获
**When** 内容处理完成
**Then** 记录被持久化保存到 SQLite 数据库
**And** 包含：id, type, content, preview_text, timestamp, is_starred, app_name

**Given** 应用启动
**When** 面板首次显示
**Then** 从数据库加载历史记录
**And** 按时间戳降序排列（最新的在前）

**Given** 应用关闭后重新启动
**When** 面板显示
**Then** 之前保存的所有历史记录仍然可见

**Given** 数据库中有历史记录
**When** 用户删除某条记录
**Then** 记录从数据库中永久删除

**Given** 数据库操作发生错误（如磁盘满）
**When** 保存或查询失败
**Then** 显示用户友好的错误提示
**And** 错误被记录到日志文件

---

### Story 2.3: 图片存储与加载

**As a** MacPaste 用户,
**I want** 复制的图片被正确保存和显示,
**So that** 我可以查看和重新使用图片历史。

**FRs covered:** FR4 扩展, FR32

**技术任务：**
- 实现图片文件存储服务（`services/image_storage.rs`）
- 图片保存到 `{app_data}/images/{id}.{ext}`
- 数据库存储相对路径引用
- 前端使用 `convertFileSrc()` 加载图片
- 删除记录时同步删除图片文件

**Acceptance Criteria:**

**Given** 用户复制了一张图片
**When** 剪贴板监听捕获到图片
**Then** 图片被保存到应用数据目录的 images 文件夹
**And** 数据库记录中保存图片的相对路径

**Given** 历史列表中有图片类型记录
**When** 面板显示该记录
**Then** 图片缩略图正确加载并显示
**And** 无损渲染，不出现加载失败图标

**Given** 用户删除一条图片类型的历史记录
**When** 删除操作完成
**Then** 对应的图片文件从磁盘删除
**And** 数据库记录被删除

**Given** 应用重启后
**When** 加载包含图片的历史记录
**Then** 图片缩略图仍能正确显示

---

### Story 2.4: 剪贴板写入与自动粘贴

**As a** MacPaste 用户,
**I want** 选择历史记录后内容被写入系统剪贴板并自动粘贴,
**So that** 我可以一键完成内容的重新使用。

**FRs covered:** FR6, FR7

**技术任务：**
- 实现 Tauri Command：`write_to_clipboard(id)`
- 根据内容类型调用对应的剪贴板写入 API
- 实现自动粘贴功能（模拟 Cmd+V）
- 替换现有的模拟复制实现
- 处理辅助功能权限请求

**Acceptance Criteria:**

**Given** 应用首次尝试自动粘贴
**When** 系统未授予辅助功能权限
**Then** 显示权限请求提示，引导用户到系统偏好设置
**And** 权限未授予时，仅写入剪贴板，跳过自动粘贴

**Given** 用户选中一条文本类型的历史记录
**When** 用户按下回车键确认选择
**Then** 该文本内容被写入系统剪贴板
**And** 在其他应用中 Cmd+V 可粘贴该内容

**Given** 用户选中一条图片类型的历史记录
**When** 用户按下回车键确认选择
**Then** 该图片被写入系统剪贴板
**And** 在支持图片的应用中可粘贴该图片

**Given** 用户选中一条历史记录并确认
**When** 写入剪贴板成功且权限已授予
**Then** 自动触发粘贴操作到之前活跃的应用
**And** 面板自动关闭

**Given** 用户选中一条文件引用类型的历史记录
**When** 用户确认选择
**Then** 文件引用被写入剪贴板
**And** 在 Finder 中可粘贴该文件

---

### Story 2.5: 搜索过滤后端实现

**As a** MacPaste 用户,
**I want** 搜索和过滤基于真实数据库查询,
**So that** 即使历史记录很多，搜索和过滤也能快速响应。

**FRs covered:** FR11, FR12, FR13

**技术任务：**
- 实现 Tauri Command：`search_clipboard_items(query, filter)`
- 实现 SQL 查询：关键词搜索（content, preview_text, app_name）
- 实现 SQL 查询：类型过滤（text, image, file）
- 实现 SQL 查询：收藏过滤（is_starred = 1）
- 前端调用后端查询替代内存过滤

**Acceptance Criteria:**

**Given** 数据库中有多条历史记录
**When** 用户输入搜索关键词
**Then** 后端执行 SQL LIKE 查询
**And** 返回匹配的记录列表

**Given** 数据库中有不同类型的历史记录
**When** 用户选择"图片"过滤
**Then** 后端执行 SQL WHERE type = 'image' 查询
**And** 只返回图片类型记录

**Given** 用户同时使用搜索和过滤
**When** 输入关键词并选择类型
**Then** 后端执行组合查询
**And** 返回同时满足两个条件的记录

**Given** 数据库中有大量历史记录（100+）
**When** 用户执行搜索或过滤
**Then** 查询响应时间小于 100ms

---

### Story 2.6: 收藏管理后端实现

**As a** MacPaste 用户,
**I want** 收藏状态被持久化保存,
**So that** 重要的历史记录始终容易找到。

**FRs covered:** FR14, FR15

**技术任务：**
- 实现 Tauri Command：`toggle_star(id)`
- 更新数据库 is_starred 字段
- 前端调用后端 API 替代本地状态切换
- 确保收藏过滤与后端查询集成

**Acceptance Criteria:**

**Given** 用户点击某条记录的收藏按钮
**When** 该记录当前未收藏
**Then** 后端更新 is_starred = 1
**And** UI 显示收藏状态（实心星号）

**Given** 用户点击某条已收藏记录的收藏按钮
**When** 该记录当前已收藏
**Then** 后端更新 is_starred = 0
**And** UI 显示未收藏状态（空心星号）

**Given** 用户收藏了某条记录后关闭应用
**When** 应用重新启动
**Then** 该记录的收藏状态保持不变

**Given** 用户选择"收藏"过滤
**When** 查看过滤后的列表
**Then** 只显示 is_starred = 1 的记录
**And** 结果来自数据库查询，非内存过滤
