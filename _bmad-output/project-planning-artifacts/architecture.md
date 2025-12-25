---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2025-12-24'
lastStep: 8
inputDocuments:
  - _bmad-output/prd.md
  - docs/index.md
  - docs/project-overview.md
  - docs/architecture.md
  - docs/development-guide.md
  - docs/component-inventory.md
workflowType: 'architecture'
project_name: 'MacPaste'
user_name: 'Boss'
date: '2025-12-24'
hasProjectContext: false
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

本项目包含 33 条功能需求，覆盖从剪贴板监听到用户界面交互的完整功能链：

| 模块 | 需求数量 | 核心能力 |
|------|----------|----------|
| 剪贴板管理 | 7 | 监听、捕获多类型内容、写入剪贴板 |
| 数据存储 | 6 | SQLite 持久化、元数据、搜索过滤 |
| 收藏管理 | 2 | 标记/取消收藏 |
| 窗口管理 | 5 | NSPanel、快捷键切换、自动关闭 |
| 导航交互 | 4 | 键盘导航、选中高亮 |
| 系统集成 | 4 | 托盘图标、Dock 隐藏 |
| 内容展示 | 5 | 预览、图标、时间戳、缩略图 |

**Non-Functional Requirements:**

| 类型 | 要求 | 架构影响 |
|------|------|----------|
| 性能 | 剪贴板监听低延迟 | 需要高效的 Rust 轮询/事件机制 |
| 响应性 | 面板呼出 < 200ms | NSPanel 预创建、状态缓存 |
| 平台 | macOS 12+ 专属 | 可使用原生 API，无跨平台抽象层 |
| 离线 | 完全本地运行 | SQLite 本地存储，无云依赖 |
| 隐蔽性 | Dock 不显示图标 | LSUIElement 配置 |

**Scale & Complexity:**

- Primary domain: **Desktop App (System Integration)**
- Complexity level: **Medium**
- Estimated architectural components: **5-7 核心模块**

### Technical Constraints & Dependencies

**已确立的技术栈（不可更改）：**
- 前端：React 19 + TypeScript 5.7 + Vite 6 + TailwindCSS
- 后端：Rust (Edition 2021) + Tauri 2.x
- 通信：Tauri IPC (invoke/listen)

**平台约束：**
- 仅支持 macOS
- 需要辅助功能权限（可能）
- 需要 Xcode Command Line Tools

### Cross-Cutting Concerns Identified

| 关注点 | 影响范围 | 架构考量 |
|--------|----------|----------|
| **IPC 通信** | 前后端全部交互 | 定义统一的命令/事件契约 |
| **错误处理** | 所有 Rust 命令 | Result 类型 + 前端错误边界 |
| **数据序列化** | 剪贴板内容、存储 | serde JSON，图片需特殊处理 |
| **状态同步** | UI ↔ 数据库 ↔ 剪贴板 | 事件驱动更新机制 |
| **窗口生命周期** | 显示/隐藏/焦点 | 窗口状态机管理 |

## Technology Extension Plan (Brownfield Project)

### Technology Selection Principle

> **优先复用 Tauri 插件生态，基于现有插件继承扩展，最小化自定义代码。**

### Project Foundation (Already Established)

| Layer | Technology | Version | Status |
|-------|-----------|---------|--------|
| Frontend Framework | React | 19.0.0 | ✅ In use |
| Language | TypeScript | 5.7.2 | ✅ In use |
| Build Tool | Vite | 6.0.5 | ✅ In use |
| Styling | TailwindCSS | 3.4.17 | ✅ In use |
| Desktop Framework | Tauri | 2.x | ✅ In use |
| Backend Language | Rust | Edition 2021 | ✅ In use |

### Required Extensions (Plugin-First Approach)

#### 1. Global Shortcut - tauri-plugin-global-shortcut v2.3.0 (Official)

| 属性 | 值 |
|------|-----|
| **类型** | Tauri 官方插件 |
| **用途** | 注册 `Cmd+Shift+V` 全局热键 |

**Installation:**
```bash
cargo add tauri-plugin-global-shortcut --target 'cfg(desktop)'
npm add @tauri-apps/plugin-global-shortcut
```

**Architectural Decision:**
- 使用 JavaScript API 注册快捷键
- 快捷键事件触发窗口显示/隐藏逻辑

#### 2. System Tray - Tauri Built-in (Official)

| 属性 | 值 |
|------|-----|
| **类型** | Tauri 内置功能 |
| **用途** | 菜单栏图标，显示/隐藏、退出 |
| **特性标志** | `tray-icon` |

**Architectural Decision:**
- Rust 端定义托盘菜单
- 菜单事件通过 IPC 通知前端

#### 3. NSPanel Floating Window - tauri-nspanel (Community)

| 属性 | 值 |
|------|-----|
| **类型** | 社区插件 |
| **作者** | ahkohd |
| **用途** | 类 Spotlight 浮动面板 |

**Source:** https://github.com/ahkohd/tauri-nspanel

**Architectural Decision:**
- 窗口配置 `decorations: false`
- 转换为 `NSWindowStyleMaskNonActivatingPanel`
- 不抢占焦点，点击外部自动关闭

#### 4. Clipboard Monitoring - tauri-plugin-clipboard-x (Community)

| 属性 | 值 |
|------|-----|
| **类型** | 社区插件 |
| **作者** | ayangweb |
| **用途** | 剪贴板监听 + 读写 |
| **格式支持** | Text/RTF/HTML/Image/Files |

**Installation:**
```bash
cargo add tauri-plugin-clipboard-x
npm add tauri-plugin-clipboard-x-api
```

**Architectural Decision:**
- 前端调用 `startListening()` 启动监听
- `onClipboardChange` 回调处理新内容
- 直接使用插件 API，无需自定义 commands

#### 5. SQLite Database - tauri-plugin-sql (Official)

| 属性 | 值 |
|------|-----|
| **类型** | Tauri 官方插件 |
| **用途** | 剪贴板历史持久化存储 |
| **底层** | sqlx (异步 SQL) |

**Installation:**
```bash
cargo add tauri-plugin-sql --features sqlite
npm add @tauri-apps/plugin-sql
```

**Architectural Decision:**
- 数据库文件存储于 Tauri app data 目录
- 前端通过 JS API 执行 SQL 查询
- 无需手写 Rust CRUD commands
- 支持 prepared statements 防注入

**Schema:**
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

#### 6. Dock Icon Hidden - LSUIElement (macOS Native)

| 属性 | 值 |
|------|-----|
| **类型** | 系统配置 |
| **用途** | Dock 不显示应用图标 |

**Implementation:** 在 `tauri.conf.json` 中配置 Info.plist

#### 7. Logging - tauri-plugin-log (Official)

| 属性 | 值 |
|------|-----|
| **类型** | Tauri 官方插件 |
| **用途** | 结构化日志记录 |
| **日志位置** | `~/Library/Logs/{bundle_id}/` |

**Installation:**
```bash
cargo add tauri-plugin-log
npm add @tauri-apps/plugin-log
```

### Plugin Summary

| 功能 | 插件 | 类型 | 自定义代码 |
|------|------|------|-----------|
| 全局快捷键 | tauri-plugin-global-shortcut | 官方 | 极少 |
| 系统托盘 | Tauri built-in | 官方 | 少量 |
| 浮动窗口 | tauri-nspanel | 社区 | 中等 |
| 剪贴板 | tauri-plugin-clipboard-x | 社区 | 极少 |
| 数据库 | tauri-plugin-sql | 官方 | 极少 |
| 日志 | tauri-plugin-log | 官方 | 极少 |

**自定义 Tauri Commands 需求：** 仅需少量用于业务逻辑（如收藏切换、历史删除等）

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- 图片存储策略：文件系统 + 路径引用
- IPC 通信模式：细粒度命令
- 前端状态管理：Zustand

**Important Decisions (Shape Architecture):**
- 错误处理模式：简单字符串错误
- 日志策略：tauri-plugin-log (官方插件)
- Rust 模块组织：功能模块

**Deferred Decisions (Post-MVP):**
- 自动更新机制 - PRD 明确排除
- 数据加密 - MVP 不需要
- 敏感数据过滤 - Phase 2 功能
- 历史记录自动清理 - Phase 2 功能

### Data Architecture

#### Image Storage Strategy

| 属性 | 值 |
|------|-----|
| **决策** | 文件系统 + 路径引用 |
| **存储位置** | `{app_data}/images/{id}.{ext}` |
| **数据库字段** | `image_path TEXT` (相对路径) |
| **加载方式** | `convertFileSrc()` 转换为 WebView URL |

**Rationale:**
- 避免数据库膨胀（4K 截图可达 10MB+）
- 图片直接从文件加载，性能更好
- 删除记录时需同步删除图片文件

### API & Communication Patterns

#### IPC Command Design

| 属性 | 值 |
|------|-----|
| **决策** | 细粒度命令 |
| **命令风格** | 每个操作独立命令 |
| **预估命令数** | 8-12 个 |

**Command Inventory:**
```rust
// 剪贴板数据
get_clipboard_items(limit, offset) -> Vec<ClipboardItem>
get_item_by_id(id) -> Option<ClipboardItem>

// 操作
toggle_star(id) -> Result<bool>
delete_item(id) -> Result<()>
clear_history() -> Result<()>
write_to_clipboard(id) -> Result<()>

// 窗口
show_window() -> Result<()>
hide_window() -> Result<()>
```

**Event Inventory:**
```rust
// Rust → Frontend (via tauri-plugin-clipboard-x)
clipboard_changed -> ClipboardItem
```

#### Error Handling

| 属性 | 值 |
|------|-----|
| **决策** | 简单字符串错误 |
| **Rust 返回** | `Result<T, String>` |
| **前端处理** | Toast 显示错误消息 |

**Rationale:** MVP 阶段足够，可在后续版本升级为结构化错误码。

### Frontend Architecture

#### State Management

| 属性 | 值 |
|------|-----|
| **决策** | Zustand |
| **版本** | latest |
| **迁移成本** | 低（API 与 useState 类似） |

**Store Structure:**
```typescript
// stores/clipboardStore.ts
interface ClipboardStore {
  // State
  items: ClipboardItem[];
  selectedIndex: number;
  searchQuery: string;
  filterCategory: FilterCategory;
  isLoading: boolean;

  // Actions
  setItems: (items: ClipboardItem[]) => void;
  addItem: (item: ClipboardItem) => void;
  toggleStar: (id: string) => void;
  deleteItem: (id: string) => void;
  setSelectedIndex: (index: number) => void;
  setSearchQuery: (query: string) => void;
  setFilterCategory: (category: FilterCategory) => void;
}
```

**Rationale:**
- 轻量级（~1KB gzipped）
- 无 Provider 包装，使用简单
- 可直接在 Tauri 事件回调中更新状态
- TypeScript 类型推断优秀

### Infrastructure & Logging

#### Logging Strategy

| 属性 | 值 |
|------|-----|
| **决策** | tauri-plugin-log (官方插件) |
| **日志位置** | `~/Library/Logs/{bundle_id}/` |
| **级别** | debug, info, warn, error |

**Usage:**
```rust
// Rust
use log::{info, warn, error};
info!("Clipboard item saved: {}", id);
```

```typescript
// Frontend
import { info, error } from '@tauri-apps/plugin-log';
await info('User selected item');
```

### Backend Architecture

#### Rust Module Organization

| 属性 | 值 |
|------|-----|
| **决策** | 功能模块 |
| **预估代码量** | 1000-2000 行 |

**Directory Structure:**
```
src-tauri/src/
├── lib.rs              # Tauri 配置入口，插件注册
├── main.rs             # 应用入口
├── commands/           # Tauri commands
│   ├── mod.rs
│   ├── clipboard.rs    # 剪贴板相关命令
│   ├── storage.rs      # 数据存储命令
│   └── window.rs       # 窗口控制命令
├── models/             # 数据结构
│   ├── mod.rs
│   └── clipboard_item.rs
└── services/           # 业务逻辑
    ├── mod.rs
    ├── clipboard_monitor.rs  # 剪贴板监听（如需扩展）
    └── database.rs           # 数据库操作封装
```

### Decision Impact Analysis

**Implementation Sequence:**
1. Rust 模块结构搭建
2. 数据库 Schema 初始化
3. 基础 Commands 实现
4. Zustand Store 迁移
5. 剪贴板监听集成
6. 图片存储实现
7. 日志系统集成

**Cross-Component Dependencies:**
- 图片存储 → 影响数据库 Schema 设计
- 细粒度命令 → 影响前端 API 调用层
- Zustand → 影响现有组件状态访问方式
- 功能模块 → 影响代码导入路径

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 6 个关键领域需要 AI Agent 一致遵循

### Naming Patterns

#### Database Naming (SQLite)

| 元素 | 模式 | 示例 |
|------|------|------|
| 表名 | snake_case, 复数 | `clipboard_items` |
| 列名 | snake_case | `is_starred`, `app_name`, `preview_text` |
| 主键 | `id` | `id TEXT PRIMARY KEY` |
| 时间戳 | `*_at` 或语义名 | `timestamp`, `created_at` |

#### Rust Naming

| 元素 | 模式 | 示例 |
|------|------|------|
| 函数 | snake_case | `get_clipboard_items`, `toggle_star` |
| 变量 | snake_case | `item_id`, `is_starred` |
| 结构体 | PascalCase | `ClipboardItem`, `AppState` |
| 枚举 | PascalCase | `ClipboardType::Text` |
| 模块 | snake_case | `clipboard_monitor`, `database` |
| Tauri Commands | snake_case | `#[tauri::command] fn get_items()` |

#### TypeScript/React Naming

| 元素 | 模式 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `clipboardItems`, `toggleStar` |
| React 组件 | PascalCase | `ClipboardCard`, `FilterBar` |
| 类型/接口 | PascalCase | `ClipboardItem`, `FilterCategory` |
| 常量 | UPPER_SNAKE_CASE | `STORAGE_KEY`, `MAX_ITEMS` |
| 组件文件 | PascalCase.tsx | `ClipboardCard.tsx` |
| 工具文件 | camelCase.ts | `utils.ts`, `clipboardStore.ts` |
| Store 文件 | camelCase + Store | `clipboardStore.ts` |

### Structure Patterns

#### Test File Organization

| 测试类型 | 位置 | 命名 |
|----------|------|------|
| React 单元测试 | 与组件同目录 | `ComponentName.test.tsx` |
| TypeScript 单元测试 | 与模块同目录 | `moduleName.test.ts` |
| Rust 单元测试 | 模块内 `#[cfg(test)]` | 内联测试模块 |
| E2E 测试 | `tests/e2e/` | `feature.spec.ts` |
| 集成测试 | `tests/integration/` | `feature.integration.test.ts` |

#### Project Directory Conventions

```
src/
├── components/          # React 组件
│   ├── ClipboardCard.tsx
│   └── ClipboardCard.test.tsx  # co-located 测试
├── stores/              # Zustand stores
│   └── clipboardStore.ts
├── hooks/               # 自定义 hooks
├── utils/               # 工具函数
├── types.ts             # 共享类型定义
└── constants.ts         # 常量定义

src-tauri/src/
├── commands/            # Tauri commands
├── models/              # 数据模型
├── services/            # 业务逻辑
└── lib.rs               # 插件注册

tests/
├── e2e/                 # E2E 测试
└── integration/         # 集成测试
```

### Format Patterns

#### IPC Response Format

**模式:** 裸数据返回，错误通过异常处理

**Rust 端:**
```rust
#[tauri::command]
fn get_clipboard_items(limit: i32) -> Result<Vec<ClipboardItem>, String> {
    // 成功返回数据，失败返回错误字符串
}
```

**TypeScript 端:**
```typescript
try {
  const items = await invoke<ClipboardItem[]>('get_clipboard_items', { limit: 50 });
  store.setItems(items);
} catch (error) {
  showToast(error as string);
}
```

#### Date/Time Format

| 层级 | 格式 | 示例 |
|------|------|------|
| 数据库存储 | Unix 时间戳 (INTEGER) | `1703404800` |
| IPC 传输 | 时间戳数字 | `timestamp: number` |
| UI 显示 | 相对时间 | "刚刚", "3分钟前", "2小时前" |

**工具函数:** 使用现有 `formatTime(timestamp)` 函数

### Communication Patterns

#### Event Naming

| 上下文 | 模式 | 示例 |
|--------|------|------|
| Tauri 事件 | kebab-case | `clipboard-changed`, `window-show` |
| Tauri 事件监听 | 与事件名匹配 | `listen('clipboard-changed', ...)` |

#### Zustand Actions

| 类型 | 模式 | 示例 |
|------|------|------|
| Setter | set + 名词 | `setItems`, `setSelectedIndex` |
| Toggle | toggle + 名词 | `toggleStar` |
| 操作动词 | 动词 + 名词 | `addItem`, `deleteItem`, `clearHistory` |

### Process Patterns

#### Loading State

**模式:** 全局 isLoading 状态

```typescript
interface ClipboardStore {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

// 使用
const fetchItems = async () => {
  store.setLoading(true);
  try {
    const items = await invoke('get_clipboard_items');
    store.setItems(items);
  } finally {
    store.setLoading(false);
  }
};
```

#### Error Handling Flow

1. **Rust 端**: 返回 `Result<T, String>`
2. **IPC 层**: Tauri 自动转换为异常
3. **前端**: try-catch 捕获，Toast 显示
4. **日志**: 使用 tauri-plugin-log 记录

```typescript
try {
  await invoke('some_command');
} catch (error) {
  const message = error as string;
  showToast(message);
  await error(`Command failed: ${message}`);
}
```

### Enforcement Guidelines

**All AI Agents MUST:**

1. 遵循语言惯例命名（Rust: snake_case, TS: camelCase/PascalCase）
2. 将单元测试与源文件 co-located
3. 使用裸数据 + try-catch 处理 IPC 响应
4. 使用 kebab-case 命名 Tauri 事件
5. 使用 Unix 时间戳存储时间
6. 通过全局 isLoading 管理加载状态

**Pattern Verification:**
- TypeScript: ESLint + TypeScript strict mode
- Rust: `cargo clippy` + `cargo fmt`
- 代码审查时检查命名一致性

### Pattern Examples

**Good Examples:**
```typescript
// ✅ 正确：camelCase 变量，PascalCase 组件
const clipboardItems = useClipboardStore(s => s.items);
<ClipboardCard item={item} />

// ✅ 正确：kebab-case 事件
await listen('clipboard-changed', handleChange);

// ✅ 正确：camelCase action
store.toggleStar(id);
```

```rust
// ✅ 正确：snake_case 函数和变量
#[tauri::command]
fn get_clipboard_items(limit: i32) -> Result<Vec<ClipboardItem>, String> {
    let items = db.query_items(limit)?;
    Ok(items)
}
```

**Anti-Patterns:**
```typescript
// ❌ 错误：混合命名风格
const clipboard_items = ...;  // 应该用 camelCase
await listen('clipboardChanged', ...);  // 应该用 kebab-case
store.SET_ITEMS(items);  // 应该用 camelCase
```

```rust
// ❌ 错误：TypeScript 风格命名
fn getClipboardItems() { }  // 应该用 snake_case
struct clipboardItem { }    // 应该用 PascalCase
```

## Testing Architecture (Implemented 2025-12-25)

### macOS Tauri 测试限制 (CRITICAL)

> ⚠️ **关键约束**: macOS 的 WKWebView **不支持 WebDriver 协议**。`tauri-driver` 仅支持 Linux 和 Windows。

**影响分析:**
- 无法在 macOS 上进行真实的 Tauri E2E 测试（启动应用 + 自动化操作）
- Playwright/WebDriver 无法直接控制 WKWebView
- 这是 Apple 平台的固有限制，非 Tauri 框架问题

### 测试策略决策

| 属性 | 值 |
|------|-----|
| **决策** | 分层测试 + mockIPC 模拟 |
| **测试金字塔** | 50% 单元 + 30% IPC 集成 + 20% 浏览器 E2E |
| **核心依赖** | `@tauri-apps/api/mocks` 的 mockIPC 机制 |

**Rationale:**
- mockIPC 可覆盖 80%+ 的 Tauri IPC 交互测试
- Playwright 测试浏览器 UI 层（不启动 Tauri 应用）
- 手动验收测试补充 NSPanel 窗口行为和全局快捷键

### 测试框架技术栈

| 工具 | 版本 | 用途 |
|------|------|------|
| Vitest | 4.x | 单元/集成测试运行器 |
| @testing-library/react | 16.x | React 组件测试 |
| jsdom | 27.x | 浏览器环境模拟 |
| Playwright | 1.57+ | E2E 浏览器测试 |
| @faker-js/faker | 10.x | 测试数据生成 |

### 测试目录结构

```
├── src/
│   ├── test-utils/              # 测试工具
│   │   ├── setup.ts             # Vitest 全局设置 (WebCrypto polyfill, Tauri mock)
│   │   ├── render.tsx           # 自定义 render 函数
│   │   ├── tauri-mocks.ts       # Tauri IPC Mock 工具
│   │   └── index.ts             # 统一导出
│   └── **/*.test.ts             # Co-located 单元测试
│
├── tests/
│   ├── e2e/                     # Playwright E2E 测试
│   │   └── example.spec.ts
│   ├── integration/             # IPC 集成测试
│   │   └── tauri-ipc.test.ts
│   └── support/
│       └── fixtures/
│           └── factories/       # 数据工厂
│               └── clipboard-factory.ts
│
├── vitest.config.ts             # Vitest 配置
└── playwright.config.ts         # Playwright 配置
```

### Tauri IPC Mock 模式

**核心工具:** `src/test-utils/tauri-mocks.ts`

```typescript
// 设置 Mock 响应
mockIPCCommands({
  get_clipboard_history: [{ id: 1, text_content: 'Hello' }],
  delete_clipboard_item: { success: true },
})

// 验证调用
const invoke = getInvokeMock()
expect(invoke).toHaveBeenCalledWith('delete_clipboard_item', { id: 123 })
```

**关键实现细节:**
- `setup.ts` 初始化 `__TAURI_INTERNALS__` 全局对象
- 提供 WebCrypto polyfill（jsdom 缺失，但 Tauri IPC 需要）
- `mockIPCCommands()` 支持静态返回值和函数动态响应

### 数据工厂模式

**工厂位置:** `tests/support/fixtures/factories/clipboard-factory.ts`

```typescript
// 创建测试数据
const item = createClipboardItem({ content_type: 'text' })
const items = createClipboardItems(10)

// 支持属性覆盖
const pinnedItem = createClipboardItem({ is_pinned: true })
```

### 测试命令

| 命令 | 用途 |
|------|------|
| `npm run test:unit` | 运行 Vitest 单元/集成测试 |
| `npm run test:unit:watch` | 监听模式 |
| `npm run test:e2e` | 运行 Playwright E2E 测试 |
| `npm run test:coverage` | 生成覆盖率报告 |
| `npm test` | 运行所有测试 |

### Playwright 配置要点

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:1420',  // Tauri 默认端口
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },  // 接近 WKWebView
  ],
})
```

### AI Agent 测试指南

**编写测试时必须:**
1. 使用 `mockIPCCommands()` 模拟所有 Tauri 命令
2. 使用数据工厂生成测试数据，不硬编码
3. 单元测试与源文件 co-located
4. E2E 测试使用 `data-testid` 选择元素

**测试验证命令:**
```bash
npx tsc --noEmit          # 类型检查
npm run test:unit         # 单元测试
npm run test:e2e          # E2E 测试
```

## Project Structure & Boundaries

### Requirements to Structure Mapping

| FR 模块 | 前端位置 | 后端位置 |
|---------|----------|----------|
| 剪贴板管理 (FR1-FR7) | `stores/clipboardStore.ts`, `hooks/useClipboard.ts` | `commands/clipboard.rs` |
| 数据存储 (FR8-FR13) | `services/database.ts` | tauri-plugin-sql |
| 收藏管理 (FR14-FR15) | `stores/clipboardStore.ts` | `commands/storage.rs` |
| 窗口管理 (FR16-FR20) | `hooks/useWindow.ts` | `commands/window.rs` |
| 导航交互 (FR21-FR24) | `hooks/useKeyboard.ts` | - |
| 系统集成 (FR25-FR28) | `services/tray.ts` | `lib.rs` |
| 内容展示 (FR29-FR33) | `components/` | - |

### Complete Project Directory Structure

```
clipboardmanager/
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .gitignore
├── .env.example
│
├── src/                            # 前端源码
│   ├── main.tsx                    # React 入口
│   ├── App.tsx                     # 主组件
│   ├── vite-env.d.ts
│   │
│   ├── components/                 # UI 组件
│   │   ├── ClipboardCard.tsx
│   │   ├── ClipboardCard.test.tsx
│   │   ├── FilterBar.tsx
│   │   ├── FilterBar.test.tsx
│   │   ├── SearchBar.tsx
│   │   └── SearchBar.test.tsx
│   │
│   ├── stores/                     # Zustand 状态管理
│   │   └── clipboardStore.ts
│   │
│   ├── hooks/                      # 自定义 Hooks
│   │   ├── useKeyboard.ts          # 键盘导航
│   │   ├── useClipboard.ts         # 剪贴板监听
│   │   └── useWindow.ts            # 窗口控制
│   │
│   ├── services/                   # 服务层
│   │   ├── database.ts             # 数据库操作
│   │   ├── clipboard.ts            # 剪贴板操作
│   │   └── tray.ts                 # 托盘事件
│   │
│   ├── utils/
│   │   └── utils.ts                # cn(), formatTime(), stripHtml()
│   │
│   ├── types.ts                    # 共享类型
│   ├── constants.ts                # 常量
│   └── styles/
│       └── globals.css
│
├── src-tauri/                      # Rust 后端
│   ├── Cargo.toml
│   ├── Cargo.lock
│   ├── build.rs
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   ├── icons/
│   │   ├── icon.icns
│   │   ├── icon.ico
│   │   └── icon.png
│   │
│   └── src/
│       ├── main.rs                 # 应用入口
│       ├── lib.rs                  # Tauri 配置、插件注册
│       │
│       ├── commands/               # Tauri Commands
│       │   ├── mod.rs
│       │   ├── clipboard.rs        # write_to_clipboard
│       │   ├── storage.rs          # toggle_star, delete_item, clear_history
│       │   └── window.rs           # show_window, hide_window
│       │
│       ├── models/
│       │   ├── mod.rs
│       │   └── clipboard_item.rs   # ClipboardItem 结构体
│       │
│       └── services/
│           ├── mod.rs
│           └── image_storage.rs    # 图片文件存储
│
├── tests/
│   ├── e2e/
│   │   └── app.spec.ts
│   └── integration/
│       └── clipboard.integration.test.ts
│
├── docs/                           # 项目文档
│   ├── index.md
│   ├── architecture.md
│   ├── project-overview.md
│   ├── development-guide.md
│   └── component-inventory.md
│
└── _bmad-output/                   # BMAD 输出
    ├── prd.md
    └── architecture.md
```

### Architectural Boundaries

#### IPC Boundaries (Frontend ↔ Backend)

| 边界 | 通信方式 | 数据流向 |
|------|----------|----------|
| 剪贴板监听 | tauri-plugin-clipboard-x events | Rust → React |
| 数据库查询 | tauri-plugin-sql | React → SQLite |
| 窗口控制 | Tauri commands | React → Rust |
| 收藏/删除 | Tauri commands | React → Rust → SQLite |
| 托盘菜单 | Tauri events | Rust → React |

#### Component Boundaries (Frontend)

```
┌─────────────────────────────────────────────────────────┐
│                         App.tsx                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │                  clipboardStore                      ││
│  │  (items, selectedIndex, searchQuery, filterCategory) ││
│  └──────────────────────┬──────────────────────────────┘│
│                         │                                │
│  ┌──────────┐  ┌────────┴───────┐  ┌─────────────────┐ │
│  │SearchBar │  │   FilterBar    │  │ ClipboardCard[] │ │
│  │(query)   │  │(currentFilter) │  │(item, isActive) │ │
│  └──────────┘  └────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Data Boundaries

| 层级 | 存储 | 格式 |
|------|------|------|
| SQLite | `clipboard_items` 表 | 结构化数据 |
| 文件系统 | `{app_data}/images/` | PNG/JPEG 图片 |
| 内存 | Zustand store | ClipboardItem[] |

### Integration Points

#### Internal Communication

| 来源 | 目标 | 触发条件 |
|------|------|----------|
| tauri-plugin-clipboard-x | clipboardStore | 剪贴板变化 |
| tauri-plugin-global-shortcut | window commands | Cmd+Shift+V |
| System Tray | window commands | 菜单点击 |
| useKeyboard | clipboardStore | 方向键/回车 |

#### External Integrations

| 集成点 | 技术 | 用途 |
|--------|------|------|
| macOS Pasteboard | NSPasteboard (via plugin) | 剪贴板读写 |
| macOS NSPanel | tauri-nspanel | 浮动窗口 |
| macOS System Tray | Tauri built-in | 菜单栏图标 |
| 文件系统 | Rust std::fs | 图片存储 |

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   macOS      │     │   Rust       │     │   React      │
│  Pasteboard  │────▶│  Backend     │────▶│  Frontend    │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │  clipboard-x       │  Tauri IPC         │  Zustand
       │  监听变化          │  commands/events   │  状态更新
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  复制内容    │     │   SQLite     │     │   UI 渲染    │
│              │     │   + 图片文件  │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

### File Organization Patterns

#### Configuration Files

| 文件 | 用途 |
|------|------|
| `package.json` | 前端依赖、脚本 |
| `tsconfig.json` | TypeScript 配置 |
| `vite.config.ts` | Vite 构建配置 |
| `tailwind.config.js` | TailwindCSS 配置 |
| `src-tauri/Cargo.toml` | Rust 依赖 |
| `src-tauri/tauri.conf.json` | Tauri 应用配置 |

#### Source Organization Principles

1. **前端**: 按功能分层（components → hooks → stores → services）
2. **后端**: 按职责分模块（commands → models → services）
3. **共享类型**: 前端 `types.ts`，后端 `models/`
4. **测试**: 单元测试 co-located，E2E 独立目录

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
所有技术选型相互兼容：
- React 19 + TypeScript 5.7 + Vite 6 = 现代前端栈
- Tauri 2.x + Rust Edition 2021 = 稳定后端
- 所有 Tauri 插件均支持 v2.x

**Pattern Consistency:**
所有模式与技术栈对齐：
- 命名约定遵循语言惯例
- 测试位置与 React/Rust 最佳实践一致
- 错误处理统一且清晰

**Structure Alignment:**
项目结构完全支持架构决策：
- 前端按功能分层
- 后端按职责分模块
- 边界清晰，集成点明确

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**
33 条功能需求全部有架构支持：
- FR1-FR7 (剪贴板管理) → tauri-plugin-clipboard-x
- FR8-FR13 (数据存储) → tauri-plugin-sql + image_storage
- FR14-FR15 (收藏管理) → clipboardStore + storage commands
- FR16-FR20 (窗口管理) → tauri-nspanel + window commands
- FR21-FR24 (导航交互) → useKeyboard hook
- FR25-FR28 (系统集成) → Tauri tray + LSUIElement
- FR29-FR33 (内容展示) → React components

**Non-Functional Requirements Coverage:**
- 性能：Rust 后端 + 事件驱动更新
- 响应性：NSPanel 预创建，状态缓存
- 平台限制：macOS 专属 API 直接使用
- 离线运行：SQLite 本地存储，无网络依赖
- 隐蔽性：LSUIElement 配置

### Implementation Readiness Validation ✅

**Decision Completeness:**
- 所有关键决策已记录
- 技术版本已验证
- 实现模式提供示例

**Structure Completeness:**
- 完整目录结构已定义
- 所有模块和文件已规划
- 边界和集成点已映射

**Pattern Completeness:**
- 命名模式全覆盖
- 通信模式已定义
- 错误处理流程完整

### Gap Analysis Results

**Critical Gaps:** None

**Important Gaps (Non-blocking):**
1. CI/CD 管道配置 - 建议 Phase 2 补充

**Resolved Gaps (2025-12-25):**
- ~~E2E 测试框架~~ → ✅ 已实现 Vitest + Playwright

**Nice-to-Have:**
- 代码签名配置文档
- 发布流程自动化
- 性能基准测试

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] 项目上下文深入分析
- [x] 规模和复杂度评估
- [x] 技术约束识别
- [x] 跨组件关注点映射

**✅ Architectural Decisions**
- [x] 关键决策已记录版本
- [x] 技术栈完整指定
- [x] 集成模式已定义
- [x] 性能考量已处理

**✅ Implementation Patterns**
- [x] 命名约定已建立
- [x] 结构模式已定义
- [x] 通信模式已指定
- [x] 流程模式已记录

**✅ Project Structure**
- [x] 完整目录结构已定义
- [x] 组件边界已建立
- [x] 集成点已映射
- [x] 需求到结构映射完成

### Architecture Readiness Assessment

**Overall Status:** ✅ READY FOR IMPLEMENTATION

**Confidence Level:** HIGH

**Key Strengths:**
1. 插件优先策略最小化自定义代码
2. 所有技术选型经过生产验证
3. 清晰的边界和一致的模式
4. 完整的需求到架构映射

**Areas for Future Enhancement:**
1. CI/CD 自动化配置
2. E2E 测试基础设施
3. 性能监控和基准

### Implementation Handoff

**AI Agent Guidelines:**
1. 严格遵循本文档中的所有架构决策
2. 在所有组件中一致使用实现模式
3. 尊重项目结构和边界
4. 所有架构问题参考本文档

**First Implementation Priority:**
1. 安装 Tauri 插件依赖
2. 搭建 Rust 模块结构
3. 初始化 SQLite 数据库 Schema
4. 迁移前端到 Zustand

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2025-12-24
**Document Location:** `_bmad-output/architecture.md`

### Final Architecture Deliverables

**Complete Architecture Document**
- 所有架构决策已记录，包含具体版本
- 实现模式确保 AI Agent 一致性
- 完整的项目结构，包含所有文件和目录
- 需求到架构的完整映射
- 验证确认一致性和完整性

**Implementation Ready Foundation**
- 6 项核心架构决策
- 6 项实现模式
- 7 个 Tauri 插件/功能
- 33 条功能需求全部支持

**AI Agent Implementation Guide**
- 技术栈已验证版本
- 一致性规则防止实现冲突
- 项目结构边界清晰
- 集成模式和通信标准

### Quality Assurance Checklist

**✅ Architecture Coherence**
- [x] 所有决策协调工作，无冲突
- [x] 技术选型相互兼容
- [x] 模式支持架构决策
- [x] 结构与所有选择对齐

**✅ Requirements Coverage**
- [x] 所有功能需求有架构支持
- [x] 所有非功能需求已处理
- [x] 跨组件关注点已解决
- [x] 集成点已定义

**✅ Implementation Readiness**
- [x] 决策具体可执行
- [x] 模式防止 Agent 冲突
- [x] 结构完整无歧义
- [x] 提供示例以澄清

### Project Success Factors

**Clear Decision Framework**
所有技术选择都是协作完成的，有明确的理由，确保所有利益相关者理解架构方向。

**Consistency Guarantee**
实现模式和规则确保多个 AI Agent 产生兼容、一致的代码，无缝协作。

**Complete Coverage**
所有项目需求都有架构支持，从业务需求到技术实现有清晰的映射。

**Solid Foundation**
选择的技术栈和架构模式提供了遵循当前最佳实践的生产就绪基础。

---

**Architecture Status:** ✅ READY FOR IMPLEMENTATION

**Next Phase:** 使用本文档中记录的架构决策和模式开始实现

**Document Maintenance:** 在实现过程中做出重大技术决策时更新此架构文档

---

**Document Updates:**
- 2025-12-25: 添加 Testing Architecture 章节（测试框架搭建完成）

