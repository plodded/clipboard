---
project_name: 'MacPaste'
user_name: 'Boss'
date: '2025-12-24'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'critical_rules']
status: 'complete'
rule_count: 47
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Core Stack (Fixed - Do Not Change)
- **Frontend**: React 19 + TypeScript 5.7 + Vite 6 + TailwindCSS 3.4
- **Backend**: Rust (Edition 2021) + Tauri 2.x
- **Platform**: macOS only (12+)

### Critical Dependencies
- `clsx` + `tailwind-merge` → 使用 `cn()` 工具函数进行样式合并
- `lucide-react` → 所有图标使用此库，不引入其他图标库
- `serde` + `serde_json` → Rust 序列化

### Tauri Plugin Strategy (Plugin-First Approach)
- 优先使用 Tauri 官方/社区插件，最小化自定义 Rust 代码
- 剪贴板: `tauri-plugin-clipboard-x`（社区，支持 Text/RTF/HTML/Image/Files）
- 数据库: `tauri-plugin-sql`（官方，SQLite）
- 快捷键: `tauri-plugin-global-shortcut`（官方）
- 日志: `tauri-plugin-log`（官方）
- 浮动窗口: `tauri-nspanel`（社区）

### Version Constraints
- Node.js: 需要支持 ES2022
- Rust: Edition 2021
- macOS: 12+ (Safari 14 WebView target)

## Critical Implementation Rules

### TypeScript Rules

#### Configuration (tsconfig.json)
- `strict: true` - 严格模式必须遵守
- `noUnusedLocals: true` - 不允许未使用的变量
- `noUnusedParameters: true` - 不允许未使用的参数
- Path alias `@/*` 映射到 `src/*`

#### Import Conventions
- 使用 `type` 关键字导入纯类型: `import type { MouseEvent } from 'react'`
- 混合导入时分开写: 值导入 + type 导入
- 优先使用 path alias `@/` 而非相对路径 `../`

#### Type Definitions
- 枚举使用 `enum` 定义（如 `ClipboardType`, `FilterCategory`）
- 组件 Props 使用 `interface` 定义
- 可选字段使用 `?` 语法
- 避免使用 `any`，优先使用 `unknown` 或明确类型

### Rust Rules

#### Tauri Commands
- 使用 `#[tauri::command]` 宏定义命令
- 命令名使用 snake_case: `get_clipboard_items`, `toggle_star`
- 返回 `Result<T, String>` 处理错误

#### Module Organization
- 模块使用 snake_case 命名
- 结构体使用 PascalCase: `ClipboardItem`
- 枚举变体使用 PascalCase: `ClipboardType::Text`

#### Plugin Registration
- 在 `lib.rs` 中通过 `.plugin()` 注册
- 使用 `tauri::generate_handler![]` 注册命令

### React/Frontend Rules

#### Component Structure
- 函数式组件，不使用 class 组件
- Props interface 定义在组件前，命名为 `{ComponentName}Props`
- 内部辅助函数定义在组件内部（如 `renderIcon`, `renderContent`）
- 使用 `export default ComponentName` 导出

#### Hooks Patterns
- 状态管理: `useState` + `useMemo` + `useCallback`
- 副作用: `useEffect` 配合正确的依赖数组
- Refs: `useRef` 用于 DOM 引用和持久化值
- **未来迁移**: 计划迁移到 Zustand 进行全局状态管理

#### Styling Conventions
- 使用 TailwindCSS 类
- 条件样式使用 `cn()` 函数（来自 `@/utils`）
- 动画使用 Tailwind 内置 + 自定义 keyframes
- 颜色方案: 暗色主题（slate-900 背景，white/gray 文字）

#### Event Handling
- 事件处理函数命名: `handle{Event}` 或 `on{Action}`
- 阻止冒泡: `e.stopPropagation()`
- 键盘事件集中处理在顶层组件

#### UI Patterns
- 图标: 使用 lucide-react，大小通常为 `w-4 h-4` 或 `w-3 h-3`
- Toast: 中文提示信息（如 "已复制到剪贴板"）
- 空状态: 提供友好的空状态 UI 和操作引导

### Testing Rules

#### Test Organization
- 单元测试与源文件 **co-located**（同目录）
- E2E 测试放在 `tests/e2e/` 目录
- 集成测试放在 `tests/integration/` 目录
- 测试工具放在 `src/test-utils/` 目录
- Rust 测试使用内联 `#[cfg(test)]` 模块

#### Test File Naming
- React 组件: `ComponentName.test.tsx`
- TypeScript 模块: `moduleName.test.ts`
- E2E: `feature.spec.ts`
- 集成: `feature.integration.test.ts`

#### Test Framework (Implemented)
- **单元/集成测试**: Vitest + jsdom + @testing-library/react
- **E2E 测试**: Playwright (Chromium + WebKit)
- **Tauri IPC Mock**: `@/test-utils/tauri-mocks.ts`
- **数据工厂**: `tests/support/fixtures/factories/`
- **Rust 测试**: 内置 `cargo test`

#### Test Commands
```bash
npm run test:unit      # 运行单元/集成测试
npm run test:unit:watch # 监听模式
npm run test:e2e       # 运行 E2E 测试
npm run test:coverage  # 覆盖率报告
npm test               # 运行所有测试
```

#### macOS Tauri 测试限制 (CRITICAL)
> ⚠️ macOS 的 WKWebView **不支持 WebDriver**，无法进行真实 Tauri E2E 测试

**替代策略**:
- 使用 `mockIPC` 进行 IPC 集成测试（覆盖 Tauri 命令）
- Playwright 测试浏览器 UI 层（不启动 Tauri 应用）
- 手动验收测试：NSPanel 窗口行为、全局快捷键

#### Testing Priorities
- 优先测试业务逻辑（stores, utils, hooks）
- 组件测试关注行为，不测试样式
- IPC 通信需要集成测试覆盖
- 使用 `mockIPCCommands()` 模拟 Tauri API

### Code Quality & Style Rules

#### Naming Conventions (CRITICAL)
| 上下文 | 模式 | 示例 |
|--------|------|------|
| TS 变量/函数 | camelCase | `clipboardItems`, `toggleStar` |
| React 组件 | PascalCase | `ClipboardCard` |
| 组件文件 | PascalCase.tsx | `ClipboardCard.tsx` |
| 工具/常量文件 | camelCase.ts | `utils.ts` |
| 常量 | UPPER_SNAKE_CASE | `STORAGE_KEY` |
| Rust 函数 | snake_case | `get_clipboard_items` |
| Rust 结构体 | PascalCase | `ClipboardItem` |
| DB 表名 | snake_case 复数 | `clipboard_items` |
| Tauri 事件 | kebab-case | `clipboard-changed` |

#### File Organization
- `src/components/` - React 组件
- `src/stores/` - Zustand 状态管理
- `src/hooks/` - 自定义 hooks
- `src/services/` - 业务服务层
- `src/types.ts` - 共享类型定义
- `src/constants.ts` - 常量定义
- `src/utils.ts` - 工具函数

#### Code Style
- 使用函数声明而非箭头函数定义组件
- 优先使用 `const` 而非 `let`
- 避免魔法数字，使用常量
- 单文件不超过 300 行，超过则拆分

#### Linting (Planned)
- ESLint + TypeScript 严格规则
- `cargo clippy` + `cargo fmt` for Rust

### Development Workflow Rules

#### Development Commands
```bash
# 前端开发（仅 WebView）
npm run dev

# Tauri 完整开发（推荐）
npm run tauri dev

# 生产构建
npm run tauri build
```

#### Git Workflow
- 主分支: `main`
- 功能分支命名: `feature/{feature-name}`
- 修复分支命名: `fix/{issue-description}`
- Commit message 使用中文或英文皆可，格式: `type: description`
  - `feat:` 新功能
  - `fix:` 修复
  - `refactor:` 重构
  - `docs:` 文档
  - `chore:` 杂项

#### Build Requirements
- 前端构建前运行 `tsc` 类型检查
- Rust 构建使用 release profile（LTO 优化）
- macOS 签名需要 Apple Developer 证书（发布时）

#### Local Development
- Vite 开发服务器端口: 1420
- 热重载自动监听 `src/` 目录变化
- `src-tauri/` 目录变化触发 Rust 重新编译

### Critical Don't-Miss Rules

#### Anti-Patterns (NEVER DO)
- ❌ 不要混合命名风格（TS 用 camelCase，Rust 用 snake_case）
- ❌ 不要在数据库中存储 Base64 图片（使用文件系统 + 路径引用）
- ❌ 不要使用 `any` 类型（使用 `unknown` 或具体类型）
- ❌ 不要忽略 Tauri 命令返回的错误
- ❌ 不要引入非 lucide-react 的图标库
- ❌ 不要使用 class 组件

#### Tauri IPC Critical Rules
- 前端调用 Rust: `invoke<T>('command_name', { params })`
- 错误处理: Rust 返回 `Result<T, String>`，前端用 try-catch
- 事件监听: `listen('event-name', callback)`
- 事件名使用 **kebab-case**，命令名使用 **snake_case**

#### Image Handling
- 存储位置: `{app_data}/images/{id}.{ext}`
- 数据库字段: `image_path TEXT`（相对路径）
- WebView 加载: 使用 `convertFileSrc(path)` 转换路径
- 删除记录时同步删除图片文件

#### Data Format
- 时间戳: Unix timestamp (INTEGER) 存储，前端 `formatTime()` 显示
- ID: 使用字符串 UUID 或 nanoid
- 布尔值: 数据库使用 INTEGER (0/1)，TypeScript 使用 boolean

#### Performance Gotchas
- 剪贴板监听使用插件事件，不要轮询
- 大列表使用虚拟滚动（如果超过 100 项）
- 图片使用懒加载
- 避免在渲染循环中创建新对象/函数

---

## Usage Guidelines

**For AI Agents:**
- 在实现任何代码前先阅读此文件
- 严格遵循所有规则
- 有疑问时选择更严格的选项
- 发现新模式时更新此文件

**For Humans:**
- 保持此文件精简，专注于 Agent 需求
- 技术栈变化时更新
- 每季度审查过时规则
- 移除随时间变得显而易见的规则

---

_Last Updated: 2025-12-25_
