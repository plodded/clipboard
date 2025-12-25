# System-Level Test Design - MacPaste

**Date:** 2025-12-24
**Author:** Boss (TEA: Murat)
**Status:** Draft
**Mode:** System-Level (Phase 3 - Testability Review)

---

## Executive Summary

MacPaste 是一款 macOS 剪贴板管理器，基于 **Tauri 2.x + React 19 + Rust** 架构。本文档评估架构的可测性，识别测试挑战，并为 Sprint 0 提供测试基础设施建议。

**项目状态：** UI 原型阶段 → 功能 MVP 开发
**测试基础设施：** 未建立（无测试文件、无测试框架依赖）

---

## Testability Assessment

### Controllability: ⚠️ CONCERNS

**定义：** 我们能否控制系统状态进行测试？

| 方面 | 评估 | 详情 |
|------|------|------|
| **API 数据填充** | ✅ PASS | tauri-plugin-sql 支持直接 SQL 操作，可用于测试数据填充 |
| **外部依赖可 Mock** | ⚠️ CONCERNS | 剪贴板监听 (tauri-plugin-clipboard-x) 依赖系统 API，难以隔离测试 |
| **状态重置** | ⚠️ CONCERNS | SQLite 数据库可清空，但图片文件存储需要手动清理 |
| **错误条件触发** | ⚠️ CONCERNS | 无法轻松模拟系统剪贴板错误、权限拒绝等边缘情况 |

**关键 Concerns：**
1. **剪贴板监听测试**：tauri-plugin-clipboard-x 直接与 macOS NSPasteboard 交互，单元测试需要 Mock 插件
2. **辅助功能权限**：自动粘贴 (FR7) 需要辅助功能权限，测试环境可能无法获取
3. **NSPanel 窗口行为**：tauri-nspanel 的 macOS 原生行为（不被 Dock 遮挡、焦点管理）难以在 CI 中验证

**缓解策略：**
- 创建 Tauri 命令的 Mock 层（`mockTauriInvoke()`）用于前端单元测试
- 使用 Playwright 进行真实窗口交互 E2E 测试（本地有头模式）
- 为权限敏感功能提供降级路径（写入剪贴板成功 → 跳过自动粘贴）

### Observability: ✅ PASS

**定义：** 我们能否检查系统状态和验证结果？

| 方面 | 评估 | 详情 |
|------|------|------|
| **日志系统** | ✅ PASS | tauri-plugin-log 提供结构化日志，可用于测试断言 |
| **数据库可查询** | ✅ PASS | SQLite 数据可直接 SQL 查询验证 |
| **前端状态可访问** | ✅ PASS | Zustand store 可通过 `getState()` 在测试中直接访问 |
| **IPC 可追踪** | ✅ PASS | Tauri IPC 命令可被拦截和验证 |
| **确定性结果** | ⚠️ CONCERNS | 时间戳、ID 生成需要固定种子或 Mock |

**优势：**
- tauri-plugin-sql 的 JS API 允许直接执行 SQL 查询验证数据
- Zustand 状态管理使前端状态可预测和可测试
- 架构中已规划 kebab-case 事件命名，便于事件追踪

### Reliability: ⚠️ CONCERNS

**定义：** 测试能否可靠地并行执行？

| 方面 | 评估 | 详情 |
|------|------|------|
| **测试隔离** | ⚠️ CONCERNS | SQLite 单数据库 + 图片文件目录，需要测试间隔离策略 |
| **并行安全** | ⚠️ CONCERNS | 剪贴板是全局资源，并行测试可能互相干扰 |
| **可重现性** | ⚠️ CONCERNS | NSPanel 窗口行为依赖 macOS 版本和系统配置 |
| **清理机制** | ⚠️ CONCERNS | 需要实现 fixture 自动清理（数据库 + 图片文件） |

**关键 Concerns：**
1. **全局快捷键冲突**：`Cmd+Shift+V` 在测试环境可能被其他应用占用
2. **系统托盘单例**：多测试实例可能导致托盘图标冲突
3. **图片文件残留**：测试失败时图片文件可能未清理

**缓解策略：**
- E2E 测试使用 `--workers=1` 串行执行
- 实现 fixture 自动清理（beforeEach 清空数据库，afterEach 删除图片）
- 使用唯一 ID 前缀区分测试数据（如 `test-{timestamp}-{uuid}`）

---

## Architecturally Significant Requirements (ASRs)

### 从 PRD NFRs 提取的质量需求

| ASR ID | 类别 | 要求 | Probability | Impact | Score | 测试挑战 |
|--------|------|------|-------------|--------|-------|----------|
| ASR-1 | PERF | 面板呼出 < 200ms | 2 | 3 | **6** | 需要性能基准测试，NSPanel 预创建策略验证 |
| ASR-2 | PERF | 剪贴板监听低延迟 | 2 | 2 | 4 | 需要模拟高频复制场景，验证事件处理效率 |
| ASR-3 | TECH | macOS 12+ 兼容性 | 1 | 3 | 3 | 需要多版本 macOS 测试环境 |
| ASR-4 | OPS | 完全离线运行 | 1 | 2 | 2 | 验证无网络时所有功能正常 |
| ASR-5 | TECH | Dock 不显示图标 | 1 | 1 | 1 | setDockVisibility API 验证 |

### 高风险 ASRs (Score ≥ 6)

**ASR-1: 面板呼出 < 200ms**

**风险描述：** 用户体验核心指标。NSPanel 首次创建可能耗时较长，需要预创建策略。

**测试策略：**
- Playwright E2E 测试：测量从快捷键按下到面板 `visible` 的时间
- 使用 `performance.now()` 或 Playwright 的 `toPass({ timeout: 200 })` 验证
- 测试冷启动（首次呼出）和热启动（重复呼出）两种场景

**缓解措施：**
- 架构已规划 NSPanel 预创建（显示时只切换可见性）
- 如果超时，考虑显示加载占位符

---

## Test Levels Strategy

### 推荐测试金字塔

基于 MacPaste 的架构特点（Tauri 桌面应用 + React 前端 + Rust 后端），推荐以下测试分布：

| 测试层级 | 占比 | 覆盖范围 | 工具 |
|----------|------|----------|------|
| **Unit** | 50% | 业务逻辑、工具函数、状态管理 | Vitest |
| **Integration** | 30% | Tauri IPC、数据库操作、前后端契约 | Vitest + Tauri mock |
| **E2E** | 20% | 用户旅程、窗口管理、系统集成 | Playwright |

### Rationale

1. **Unit 50%**：
   - 前端：Zustand store actions、工具函数（`formatTime`, `cn`, `stripHtml`）
   - 后端：Rust 业务逻辑（风险评估、数据验证）
   - 快速反馈，易于调试

2. **Integration 30%**：
   - Tauri IPC 命令测试（`invoke` 调用链）
   - SQLite 数据库操作（CRUD、搜索、过滤）
   - 图片存储服务（保存、加载、删除）
   - 需要真实数据库，但不需要完整 UI

3. **E2E 20%**：
   - 关键用户旅程（快速粘贴、搜索历史）
   - NSPanel 窗口行为（显示、隐藏、焦点）
   - 系统托盘交互
   - 全局快捷键
   - 最慢但最真实

### 技术栈选型

| 层级 | 工具 | 原因 |
|------|------|------|
| 单元测试 (TS) | **Vitest** | React 19 支持、Vite 原生集成、快速执行 |
| 单元测试 (Rust) | **cargo test** | Rust 内置测试框架 |
| 集成测试 | **Vitest + @tauri-apps/api mock** | 可 mock Tauri IPC 命令 |
| E2E 测试 | **Playwright** | 桌面应用支持、可靠的等待机制、网络拦截 |

---

## NFR Testing Approach

### Security

**当前状态：** 低风险（本地应用，无网络通信，无用户认证）

**测试点：**
| 测试 | 优先级 | 方法 |
|------|--------|------|
| SQL 注入防护 | P1 | 单元测试：搜索输入过滤特殊字符 |
| XSS 防护 | P1 | 单元测试：HTML 内容展示时转义 |
| 敏感数据过滤 | P3 (Future) | MVP 后续版本实现 |

**评估：** ✅ PASS - MVP 阶段安全风险可控

### Performance

**当前状态：** 关键 NFR（ASR-1 面板呼出 < 200ms）

**测试点：**
| 测试 | 优先级 | 方法 | 阈值 |
|------|--------|------|------|
| 面板冷启动响应 | P0 | Playwright timing | < 500ms |
| 面板热启动响应 | P0 | Playwright timing | < 200ms |
| 搜索响应时间 | P1 | 集成测试 | < 100ms (100条记录) |
| 剪贴板捕获延迟 | P1 | 集成测试 | < 50ms |
| 大列表渲染 | P2 | Playwright | 无明显卡顿 (60fps) |

**评估：** ⚠️ CONCERNS - 需要建立性能基准测试基础设施

### Reliability

**当前状态：** 需要关注错误处理和恢复

**测试点：**
| 测试 | 优先级 | 方法 |
|------|--------|------|
| 数据库操作错误处理 | P1 | 集成测试：模拟 SQL 错误 |
| 剪贴板读取失败 | P1 | 集成测试：mock 插件错误 |
| 图片保存失败 | P1 | 集成测试：模拟磁盘满 |
| 权限缺失降级 | P1 | E2E 测试：辅助功能权限检查 |
| 应用崩溃恢复 | P2 | E2E 测试：重启后数据完整性 |

**评估：** ⚠️ CONCERNS - 架构已规划简单字符串错误，需要实现完整错误处理流

### Maintainability

**当前状态：** 待建立

**目标：**
| 指标 | 目标 | 方法 |
|------|------|------|
| 测试覆盖率 | ≥ 70% | Vitest coverage + cargo tarpaulin |
| 代码重复 | < 5% | jscpd |
| TypeScript 严格模式 | 100% | tsc --noEmit |
| Rust Clippy 警告 | 0 | cargo clippy |

**评估：** ⚠️ CONCERNS - 需要在 Sprint 0 建立 CI 质量门禁

---

## Test Environment Requirements

### 本地开发环境

| 组件 | 要求 | 用途 |
|------|------|------|
| Node.js | 18+ (ES2022) | 前端测试 |
| Rust | Edition 2021 | 后端测试 |
| macOS | 12+ (Monterey) | E2E 测试（需要有头模式） |
| Xcode CLI Tools | 最新版 | Tauri 编译 |

### CI 环境 (GitHub Actions)

| 环境 | 用途 | 限制 |
|------|------|------|
| ubuntu-latest | 单元测试、类型检查、lint | 无 macOS 原生功能 |
| macos-latest | E2E 测试、Tauri 构建 | 有头模式受限 |

**CI 策略：**
1. **快速反馈层** (ubuntu-latest, < 2min)：
   - TypeScript 类型检查
   - ESLint
   - Vitest 单元测试
   - cargo clippy + cargo test

2. **完整验证层** (macos-latest, < 10min)：
   - Tauri 构建
   - Playwright E2E（使用 `headless: false` 或 `xvfb-run`）

---

## Testability Concerns (Blockers & Risks)

### ⚠️ 高优先级 Concerns

| ID | 类别 | 问题 | 影响 | 缓解措施 |
|----|------|------|------|----------|
| TC-1 | TECH | 剪贴板插件难以 Mock | 无法隔离测试剪贴板监听逻辑 | 创建 clipboard-service 抽象层 |
| TC-2 | TECH | NSPanel 行为无法在 CI headless 模式测试 | E2E 覆盖受限 | 本地有头模式测试 + 手动验收 |
| TC-3 | OPS | 全局快捷键在测试环境可能冲突 | 测试不稳定 | 测试专用快捷键或 mock 快捷键事件 |

### 🔵 中等优先级 Concerns

| ID | 类别 | 问题 | 影响 | 缓解措施 |
|----|------|------|------|----------|
| TC-4 | DATA | 图片文件清理机制 | 测试残留数据 | fixture 自动清理 |
| TC-5 | PERF | 性能测试基准不稳定 | 假阳性失败 | 多次运行取平均值 |
| TC-6 | TECH | Rust 测试与 Tauri 运行时集成 | 集成测试复杂度 | 使用 tauri-test crate（如可用） |

---

## Recommendations for Sprint 0

### 必须完成 (P0)

1. **安装测试框架**
   ```bash
   # 前端测试
   npm add -D vitest @testing-library/react @testing-library/dom jsdom
   npm add -D @playwright/test

   # Rust 测试 (内置，无需额外安装)
   ```

2. **创建测试配置**
   - `vitest.config.ts`：配置 React 测试环境
   - `playwright.config.ts`：配置 Tauri 应用测试
   - `src-tauri/Cargo.toml`：添加 `[dev-dependencies]`

3. **创建 Mock 层**
   - `src/test-utils/tauri-mock.ts`：Mock Tauri invoke/listen
   - `src/test-utils/factories.ts`：测试数据工厂

4. **添加 CI 工作流**
   - `.github/workflows/test.yml`：单元测试 + 类型检查
   - `.github/workflows/e2e.yml`：E2E 测试（macos-latest）

### 推荐完成 (P1)

5. **建立测试目录结构**
   ```
   src/
   ├── components/
   │   └── ClipboardCard.test.tsx  # co-located
   ├── stores/
   │   └── clipboardStore.test.ts  # co-located
   └── test-utils/
       ├── tauri-mock.ts
       ├── factories.ts
       └── setup.ts

   tests/
   ├── e2e/
   │   └── app.spec.ts
   └── integration/
       └── clipboard.integration.test.ts
   ```

6. **创建测试数据工厂**
   - `createClipboardItem()`：生成测试剪贴板记录
   - `seedDatabase()`：填充测试数据库

7. **设置覆盖率报告**
   - Vitest coverage 配置
   - cargo tarpaulin 配置

---

## Next Workflows

**推荐执行顺序：**

1. **`*framework`**：初始化测试框架（安装依赖、配置文件）
2. **`*ci`**：搭建 CI/CD 质量流水线
3. **`*atdd`**：为 Epic 1 生成 P0 测试用例（ATDD 驱动）
4. **`*automate`**：在实现完成后扩展测试覆盖

---

## Approval

**Test Design Approved By:**

- [ ] Tech Lead: _________________ Date: _________
- [ ] QA Lead: _________________ Date: _________

**Comments:**

---

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `_bmad/bmm/testarch/test-design`
**Mode**: System-Level (Phase 3)
**Version**: 4.0 (BMad v6)
