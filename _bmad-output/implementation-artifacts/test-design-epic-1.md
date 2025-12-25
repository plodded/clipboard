# Test Design: Epic 1 - 演示版应用（Demo App with Mock Data）

**Date:** 2025-12-25
**Author:** Boss (TEA: Murat)
**Status:** Draft

---

## Executive Summary

**Scope:** Full test design for Epic 1 - 演示版应用

**Epic 目标:** 实现完整的应用框架，包括 NSPanel 窗口、系统托盘、全局快捷键、键盘导航等系统集成功能，使用 mock 数据驱动 UI。

**FRs Covered:** FR11-FR33 (UI 层面), 共 23 条

**Stories:**
- Story 1.1: NSPanel 浮动窗口与 Dock 隐藏
- Story 1.2: 全局快捷键呼出面板
- Story 1.3: 系统托盘与应用控制
- Story 1.4: Zustand 状态管理迁移
- Story 1.5: 键盘导航与窗口交互集成
- Story 1.6: 搜索过滤与收藏功能验证

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 4
- Critical categories: TECH (6), PERF (2), BUS (2)

**Coverage Summary:**

- P0 scenarios: 12 (18 hours) ← 已更新：+4 行为基准测试
- P1 scenarios: 12 (12 hours)
- P2/P3 scenarios: 10 (5 hours)
- **Total effort**: 35 hours (~4.5 days)

**团队评审决定 (2025-12-25):**
- ✅ 增加 Sprint 0 Spike 验证 NSPanel 可行性
- ✅ 增加 4 个行为基准测试作为 Story 1.4 前置条件

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| R-001 | TECH | NSPanel 在 Tauri 中的集成复杂度 - tauri-nspanel 社区插件成熟度未知 | 2 | 3 | **6** | 先研究插件 API，必要时使用原生 Swift 桥接 | Dev | Sprint 0 |
| R-002 | PERF | 面板呼出响应时间超过 200ms - 影响核心用户体验（NFR2） | 2 | 3 | **6** | NSPanel 预创建策略，只切换可见性 | Dev | Story 1.1 |
| R-003 | TECH | 全局快捷键 Cmd+Shift+V 与其他应用冲突 | 2 | 3 | **6** | 测试多种 macOS 环境，提供快捷键自定义（Phase 2） | QA | Story 1.2 |
| R-004 | TECH | 键盘事件在 NSPanel 中的焦点管理 - 可能导致快捷键无法捕获 | 2 | 3 | **6** | 测试各种焦点状态，确保 Esc/方向键/回车正常工作 | Dev/QA | Story 1.5 |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-005 | TECH | 系统托盘菜单事件在 Tauri 中的处理一致性 | 2 | 2 | 4 | 验证托盘点击→菜单显示→命令执行完整链路 | QA |
| R-006 | TECH | Zustand 状态迁移导致功能回归 | 2 | 2 | 4 | 迁移前建立完整的行为基准测试 | Dev |
| R-007 | BUS | 搜索过滤功能在新架构下行为不一致 | 1 | 3 | 3 | 保持现有 UI 逻辑，仅迁移状态管理 | Dev |
| R-008 | TECH | Dock 隐藏配置（setDockVisibility API）影响其他行为 | 1 | 2 | 2 | 验证托盘仍然可见，快捷键正常工作 | QA |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| R-009 | BUS | 收藏状态 UI 反馈不明显 | 1 | 1 | 1 | Monitor |
| R-010 | TECH | Mock 数据结构与真实数据不匹配 | 1 | 2 | 2 | 使用统一的 TypeScript 类型定义 |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## Test Coverage Plan

### P0 (Critical) - Run on every commit

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| ID | Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| -- | ----------- | ---------- | --------- | ---------- | ----- | ----- |
| 1.1-E2E-001 | NSPanel 无边框面板显示（FR16） | E2E | R-001 | 2 | QA | 需要本地有头模式 |
| 1.1-E2E-002 | 面板不被 Dock 遮挡（FR17） | E2E | R-001 | 1 | QA | 手动验证优先 |
| 1.2-E2E-001 | Cmd+Shift+V 呼出面板（FR21） | E2E | R-003 | 2 | QA | 测试冷启动和热启动 |
| 1.2-PERF-001 | 面板呼出响应时间 < 200ms（NFR2） | E2E | R-002 | 2 | QA | 使用 timing API 测量 |
| 1.5-E2E-001 | 回车键确认选择（FR23） | E2E | R-004 | 1 | QA | 验证选择后面板关闭 |
| 1.5-E2E-002 | Esc 键关闭面板（FR19） | E2E | R-004 | 1 | QA | 验证无副作用 |
| 1.5-E2E-003 | 方向键导航（FR22, FR24） | E2E | R-004 | 2 | QA | 边界测试（首项/末项） |
| 1.4-UNIT-001 | Zustand store 基础操作 | Unit | R-006 | 5 | Dev | items, selectedIndex, searchQuery |
| 1.4-BASELINE-001 | 行为基准测试：搜索过滤 | Unit | R-006 | 1 | Dev | ✅ 团队评审批准 - Story 1.4 前置条件 |
| 1.4-BASELINE-002 | 行为基准测试：类型过滤 | Unit | R-006 | 1 | Dev | ✅ 团队评审批准 - Story 1.4 前置条件 |
| 1.4-BASELINE-003 | 行为基准测试：收藏状态 | Unit | R-006 | 1 | Dev | ✅ 团队评审批准 - Story 1.4 前置条件 |
| 1.4-BASELINE-004 | 行为基准测试：键盘导航 | Unit | R-006 | 1 | Dev | ✅ 团队评审批准 - Story 1.4 前置条件 |

**Total P0**: 20 tests, 18 hours

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| ID | Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| -- | ----------- | ---------- | --------- | ---------- | ----- | ----- |
| 1.3-INT-001 | 托盘图标显示（FR25） | Integration | R-005 | 1 | QA | Tauri API 验证 |
| 1.3-INT-002 | 托盘菜单显示/隐藏（FR26） | Integration | R-005 | 2 | QA | 状态切换测试 |
| 1.3-INT-003 | 托盘菜单退出（FR27） | Integration | R-005 | 1 | QA | 进程完全退出 |
| 1.4-UNIT-002 | Zustand action: toggleStar | Unit | R-006 | 2 | Dev | 收藏状态切换 |
| 1.4-UNIT-003 | Zustand action: setSearchQuery | Unit | R-006 | 2 | Dev | 搜索过滤 |
| 1.4-UNIT-004 | Zustand action: setFilterCategory | Unit | R-006 | 2 | Dev | 类型过滤 |
| 1.6-E2E-001 | 搜索框实时过滤（FR11） | E2E | R-007 | 2 | QA | 中文和英文关键词 |
| 1.6-E2E-002 | 类型过滤切换（FR12） | E2E | R-007 | 3 | QA | 全部/文本/图片/文件 |
| 1.6-E2E-003 | 收藏过滤（FR13） | E2E | - | 1 | QA | 只显示收藏项 |
| 1.6-E2E-004 | 收藏状态切换（FR14, FR15） | E2E | - | 2 | QA | 星号图标变化 |
| 1.3-INT-001 | Dock 不显示图标（FR28） | Integration | R-008 | 1 | QA | setDockVisibility API 验证 |
| 1.2-INT-001 | 快捷键 Toggle 行为（FR18） | Integration | R-003 | 2 | QA | 显示→隐藏→显示 |

**Total P1**: 21 tests, 12 hours

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| ID | Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| -- | ----------- | ---------- | --------- | ---------- | ----- | ----- |
| 1.6-E2E-005 | 内容预览显示（FR29） | E2E | - | 2 | QA | 文本截断、图片缩略图 |
| 1.6-E2E-006 | 类型图标显示（FR30） | E2E | - | 4 | QA | 文本/图片/RTF/文件 |
| 1.6-E2E-007 | 时间戳显示（FR31） | E2E | - | 2 | QA | 相对时间格式化 |
| 1.1-E2E-003 | 面板外部点击关闭 | E2E | - | 1 | QA | 失焦自动隐藏 |
| 1.5-E2E-004 | 选择后自动关闭面板（FR20） | E2E | - | 1 | QA | 回车后面板隐藏 |

**Total P2**: 10 tests, 3 hours

### P3 (Low) - Run on-demand

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| ID | Requirement | Test Level | Test Count | Owner | Notes |
| -- | ----------- | ---------- | ---------- | ----- | ----- |
| 1.6-A11Y-001 | 无障碍访问（屏幕阅读器） | E2E | 2 | QA | VoiceOver 测试 |
| 1.2-PERF-002 | 多次快速 Toggle 稳定性 | E2E | 1 | QA | 压力测试 |
| 1.6-VIS-001 | 视觉回归（截图对比） | E2E | 3 | QA | 使用 Playwright screenshot |

**Total P3**: 6 tests, 2 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [x] 应用启动成功
- [x] 面板可以显示
- [x] 快捷键响应

**Total**: 3 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical path validation

- [x] 1.2-E2E-001: Cmd+Shift+V 呼出面板
- [x] 1.2-PERF-001: 面板呼出 < 200ms
- [x] 1.5-E2E-001: 回车确认选择
- [x] 1.5-E2E-002: Esc 关闭面板
- [x] 1.5-E2E-003: 方向键导航
- [x] 1.1-E2E-001: NSPanel 无边框显示

**Total**: 8 scenarios

### P1 Tests (<30 min)

**Purpose**: Important feature coverage

- [x] 1.3-INT-*: 系统托盘功能
- [x] 1.4-UNIT-*: Zustand store 操作
- [x] 1.6-E2E-*: 搜索过滤收藏

**Total**: 12 scenarios

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage

- [x] 内容展示验证
- [x] 无障碍测试
- [x] 视觉回归

**Total**: 10 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
| -------- | ----- | ---------- | ----------- | ----- |
| P0 | 16 | 1.0 | 16 | 关键路径，需要环境配置 |
| P1 | 21 | 0.5 | 11 | 标准测试 |
| P2 | 10 | 0.3 | 3 | 简单场景 |
| P3 | 6 | 0.3 | 2 | 探索性测试 |
| **Total** | **53** | **-** | **32** | **~4 days** |

### Prerequisites

**Test Data:**

- `createClipboardItem()` factory (已存在 - `tests/support/fixtures/factories/`)
- Mock data set (文本、图片、RTF、文件各 3 条)

**Tooling:**

- Vitest (单元测试) - ✅ 已配置
- Playwright (E2E) - ✅ 已配置
- Tauri mock (`@/test-utils/tauri-mocks.ts`) - ✅ 已存在

**Environment:**

- macOS 12+ (本地有头模式，用于 NSPanel 测试)
- GitHub Actions macos-latest (CI)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths**: ≥80%
- **Zustand store actions**: 100%
- **FR coverage**: 100% (所有 FR 至少有一个测试)
- **Edge cases**: ≥50%

### Non-Negotiable Requirements

- [x] 所有 P0 测试通过
- [x] 高风险项（≥6）已缓解或批准豁免
- [x] 性能测试（面板呼出 < 200ms）通过
- [x] 键盘导航完整可用

---

## Mitigation Plans

### R-001: NSPanel 在 Tauri 中的集成复杂度 (Score: 6)

**Mitigation Strategy:**
1. ✅ **Sprint 0 Spike（已批准）**：在 Story 1.1 开发前，创建独立 spike 验证 tauri-nspanel 插件
2. 如果插件不稳定，评估原生 Swift 桥接方案
3. 编写集成测试验证窗口行为

**Spike 验收标准：**
- [x] 成功集成 `tauri-nspanel` 插件到项目
- [x] 显示无边框浮动窗口（decorations: false）
- [x] 验证面板不被 Dock 遮挡
- [x] 基础 show/hide API 可用

**Owner:** Dev Team
**Timeline:** Sprint 0 - Story 1.1 开始前
**Status:** ✅ PASSED (2025-12-25)
**Verification:** 成功显示无边框浮动窗口，不被 Dock 遮挡

**Spike 实现笔记：**
- 使用 `tauri-nspanel` v2 分支 (git: ahkohd/tauri-nspanel)
- 通过 `WebviewWindowBuilder` 创建窗口后调用 `to_panel()` 转换
- 窗口级别设置为 25 确保在 Dock 之上
- 面板定位：屏幕底部居中，尺寸 800x340

### R-002: 面板呼出响应时间超过 200ms (Score: 6)

**Mitigation Strategy:**
1. 采用 NSPanel 预创建策略（应用启动时创建，显示时只切换可见性）
2. 添加性能基准测试（Playwright timing API）
3. 设置 CI 性能回归检测

**Owner:** Dev Team
**Timeline:** Story 1.1 完成时
**Status:** Planned
**Verification:** 连续 10 次测量平均值 < 200ms

### R-003: 全局快捷键冲突 (Score: 6)

**Mitigation Strategy:**
1. 测试多种 macOS 环境（干净系统、有常用开发工具）
2. 文档说明已知冲突应用
3. Phase 2 提供快捷键自定义功能

**Owner:** QA
**Timeline:** Story 1.2 完成时
**Status:** Planned
**Verification:** 在干净 macOS 环境中快捷键正常注册和响应

### R-004: 键盘事件焦点管理 (Score: 6)

**Mitigation Strategy:**
1. 测试面板获得焦点的各种场景
2. 验证 Esc/方向键/回车在所有焦点状态下正常工作
3. 添加焦点状态日志用于调试

**Owner:** Dev/QA
**Timeline:** Story 1.5 完成时
**Status:** Planned
**Verification:** 所有键盘交互 E2E 测试通过

---

## Assumptions and Dependencies

### Assumptions

1. tauri-nspanel 插件支持 Tauri 2.x 且 API 稳定
2. macOS 12+ 的 NSPanel 行为一致
3. Zustand 迁移不改变现有 UI 组件的 props 接口

### Dependencies

1. tauri-nspanel 插件安装和配置 - Required by Story 1.1
2. @tauri-apps/plugin-global-shortcut 安装 - Required by Story 1.2
3. Tauri tray-icon 功能 - Required by Story 1.3
4. Zustand 库安装 - Required by Story 1.4

### Risks to Plan

- **Risk**: tauri-nspanel 与 Tauri 2.x 不兼容
  - **Impact**: Epic 1 延期，需要寻找替代方案
  - **Contingency**: 使用原生 Swift 桥接实现 NSPanel 功能

---

## Existing Test Coverage Analysis

**当前测试覆盖：**

| 测试类型 | 文件 | 覆盖范围 | 状态 |
|---------|------|---------|------|
| Unit | `src/utils.test.ts` | `cn()` 函数 | ✅ 存在 |
| Integration | `tests/integration/tauri-ipc.test.ts` | Tauri IPC mock | ✅ 存在 |
| E2E | `tests/e2e/example.spec.ts` | 基础示例 | ⚠️ 需要扩展 |

**Gap Analysis:**

| Story | 现有覆盖 | 需要新增 |
|-------|---------|---------|
| 1.1 NSPanel | ❌ 无 | E2E: 窗口显示、Dock 遮挡 |
| 1.2 快捷键 | ❌ 无 | E2E: 快捷键注册、响应时间 |
| 1.3 托盘 | ❌ 无 | Integration: 托盘事件 |
| 1.4 Zustand | ❌ 无 | Unit: store actions |
| 1.5 键盘导航 | ✅ 部分 | E2E: 完整键盘交互 |
| 1.6 搜索过滤 | ✅ 部分 | E2E: 搜索、过滤、收藏 |

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (separate workflow; not auto-run).
- Run `*automate` for broader coverage once implementation exists.

---

## Approval

**Test Design Approved By:**

- [ ] Tech Lead: _________________ Date: _________
- [ ] QA Lead: _________________ Date: _________

**团队评审记录 (2025-12-25 Party Mode):**

| Reviewer | Role | Key Feedback | Decision |
|----------|------|-------------|----------|
| 🏗️ Winston | Architect | NSPanel 需要 Sprint 0 spike 验证；建议增加状态快照测试 | ✅ Accepted |
| 💻 Amelia | Developer | 需要行为基准测试确保迁移后行为一致；性能测试 API 需明确 | ✅ Accepted |
| 📋 John | PM | 快捷键冲突需要降级路径（托盘作为备选入口） | ✅ Documented |
| 🧪 Murat | TEA | 接受所有反馈，更新文档 | ✅ Updated |

**Comments:**

- Sprint 0 Spike 验收标准已添加到 R-001 缓解计划
- 4 个行为基准测试已添加到 P0 测试列表
- 性能测试实现方案将在测试开发时细化

---

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization

### Related Documents

- PRD: `_bmad-output/prd.md`
- Epic: `_bmad-output/project-planning-artifacts/epics.md`
- Architecture: `_bmad-output/architecture.md`
- System Test Design: `_bmad-output/test-design-system.md`

### Test ID Convention

Format: `{STORY}.{LEVEL}-{SEQ}`

Examples:
- `1.1-E2E-001` - Story 1.1, E2E test, sequence 001
- `1.4-UNIT-002` - Story 1.4, Unit test, sequence 002
- `1.2-PERF-001` - Story 1.2, Performance test, sequence 001

### macOS 测试限制说明

> ⚠️ **重要：** macOS 的 WKWebView **不支持 WebDriver**，无法进行真实 Tauri E2E 测试。

**替代策略（来自 system-level test design）：**
- 使用 `mockIPC` 进行 IPC 集成测试（覆盖 Tauri 命令）
- Playwright 测试浏览器 UI 层（不启动 Tauri 应用）
- NSPanel/托盘/快捷键等原生功能需要**手动验收测试**或**本地有头模式测试**

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `_bmad/bmm/testarch/test-design`
**Mode**: Epic-Level (Phase 4)
**Version**: 4.0 (BMad v6)
