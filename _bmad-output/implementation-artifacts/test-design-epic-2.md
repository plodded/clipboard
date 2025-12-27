# Test Design: Epic 2 - 真实数据层（Real Data Layer）

**Date:** 2025-12-27
**Author:** Murat (TEA Agent)
**Status:** ✅ Approved (with minor revisions)
**Reviewed:** 2025-12-27 (Party Mode Review)

---

## Executive Summary

**Scope:** Full test design for Epic 2 - Real Data Layer

**Epic Goal:** 替换 mock 数据为真实后端实现，包括剪贴板监听、SQLite 持久化、图片存储等后端能力，使应用具备完整的生产级剪贴板管理功能。

**Stories Covered:**
- Story 2.1: 剪贴板监听与内容捕获 (FR1-FR5)
- Story 2.2: SQLite 数据持久化 (FR8-FR10)
- Story 2.3: 图片存储与加载 (FR4扩展, FR32)
- Story 2.4: 剪贴板写入与自动粘贴 (FR6, FR7)
- Story 2.5: 搜索过滤后端实现 (FR11-FR13)
- Story 2.6: 收藏管理后端实现 (FR14-FR15)

**Risk Summary:**

- Total risks identified: **12**
- High-priority risks (≥6): **4**
- Critical categories: **DATA, SEC, TECH, BUS**

**Coverage Summary:**

- P0 scenarios: 18 tests (~36 hours)
- P1 scenarios: 24 tests (~24 hours)
- P2/P3 scenarios: 17 tests (~8.5 hours)
- **Total effort**: 69.5 hours (~9 days)

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| R-001 | DATA | 剪贴板内容丢失：监听中断或存储失败导致用户复制内容未被捕获 | 2 | 3 | **6** | 实现重试机制 + 错误日志 + 用户通知 | DEV | Sprint 2.1 |
| R-002 | DATA | 图片存储泄漏：删除记录时图片文件未同步删除，磁盘空间占用持续增长 | 3 | 2 | **6** | 事务性删除（DB + 文件系统一起）+ 定期清理任务 | DEV | Sprint 2.3 |
| R-003 | SEC | 敏感内容暴露：密码/API Key 等敏感信息被存储和显示 | 2 | 3 | **6** | Phase 2 实现敏感内容过滤（MVP 阶段记录风险） | DEV | Post-MVP |
| R-004 | BUS | 自动粘贴失败：辅助功能权限未授予导致核心功能不可用 | 3 | 2 | **6** | 优雅降级（仅写入剪贴板）+ 清晰权限引导 | DEV | Sprint 2.4 |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-005 | TECH | 剪贴板插件兼容性：tauri-plugin-clipboard-x 可能不支持某些特殊内容类型 | 2 | 2 | 4 | 充分测试边界情况，记录不支持的类型 | QA |
| R-006 | PERF | 大图片处理延迟：4K 截图（10MB+）处理和存储导致 UI 卡顿 | 2 | 2 | 4 | 异步处理 + 进度指示 | DEV |
| R-007 | DATA | 数据库迁移风险：Schema 变更导致历史数据丢失 | 2 | 2 | 4 | 实现 migration 脚本，备份策略 | DEV |
| R-008 | TECH | 内容去重误判：哈希碰撞导致不同内容被判定为重复 | 1 | 3 | 3 | 使用 SHA-256 + 内容长度双重校验 | DEV |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------- |
| R-009 | OPS | 日志文件过大：长时间运行后日志占用过多磁盘空间 | 1 | 2 | 2 | 配置日志轮转（tauri-plugin-log 内置） |
| R-010 | PERF | 搜索响应慢：历史记录超过 1000 条时查询变慢 | 1 | 2 | 2 | 添加 SQLite 索引，分页加载 |
| R-011 | BUS | RTF 内容显示问题：富文本预览不完整 | 1 | 1 | 1 | 只显示纯文本预览，用户点击后复制完整 RTF |
| R-012 | OPS | 应用启动时数据库初始化失败 | 1 | 2 | 2 | 错误处理 + 用户友好提示 + 重试 |

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

| Requirement | Story | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ----- | ---------- | --------- | ---------- | ----- | ----- |
| FR1: 后台监听剪贴板变化 | 2.1 | Integration | R-001 | 2 | QA | Mock clipboard events |
| FR2: 捕获纯文本内容 | 2.1 | Integration | R-001 | 2 | QA | 基础文本捕获验证 |
| FR8: 持久化存储 | 2.2 | Integration | R-001, R-007 | 3 | QA | DB 读写验证 |
| FR4+FR32: 图片存储 | 2.3 | Integration | R-002, R-006 | 3 | QA | 图片保存 + 路径引用 |
| FR6: 写入剪贴板 | 2.4 | Integration | - | 2 | QA | 各类型内容写入 |
| FR7: 自动粘贴 | 2.4 | E2E | R-004 | 2 | QA | 权限授予/未授予场景 |
| 图片删除同步 | 2.3 | Integration | R-002 | 2 | QA | 删除记录时图片也删除 |
| 数据库初始化 | 2.2 | Integration | R-012 | 2 | QA | Schema 创建验证 |

**Total P0**: 18 tests, ~36 hours

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement | Story | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ----- | ---------- | --------- | ---------- | ----- | ----- |
| FR3: 捕获 RTF 内容 | 2.1 | Integration | R-005 | 2 | QA | 富文本处理验证 |
| FR4: 捕获图片内容 | 2.1 | Integration | R-005, R-006 | 3 | QA | 多种图片格式 |
| FR5: 捕获文件引用 | 2.1 | Integration | R-005 | 2 | QA | 文件路径捕获 |
| FR9: 保存来源应用信息 | 2.2 | Integration | - | 2 | QA | app_name 字段验证 |
| FR10: 保存时间戳 | 2.2 | Unit | - | 1 | DEV | timestamp 格式 |
| FR11: 关键词搜索 | 2.5 | Integration | R-010 | 3 | QA | SQL LIKE 查询 |
| FR12: 类型过滤 | 2.5 | Integration | - | 3 | QA | text/image/file 过滤 |
| FR13: 收藏过滤 | 2.5 | Integration | - | 2 | QA | is_starred = 1 |
| FR14: 标记收藏 | 2.6 | Integration | - | 2 | QA | toggle_star(id) |
| FR15: 取消收藏 | 2.6 | Integration | - | 2 | QA | toggle 逻辑 |
| 内容去重 | 2.1 | Unit | R-008 | 2 | DEV | 相同内容检测 |

**Total P1**: 24 tests, ~24 hours

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement | Story | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ----- | ---------- | --------- | ---------- | ----- | ----- |
| 大图片处理 | 2.3 | Integration | R-006 | 2 | QA | 10MB+ 图片 |
| 批量数据查询 | 2.5 | Integration | R-010 | 2 | QA | **1000+ 记录性能** (updated) |
| 日志记录 | ALL | Unit | R-009 | 2 | DEV | 错误日志格式 |
| 图片格式支持 | 2.3 | Integration | - | 3 | QA | PNG/JPEG/GIF/WebP |
| 特殊字符搜索 | 2.5 | Integration | - | 2 | QA | SQL 注入防护 |
| 并发操作 | 2.2 | Integration | - | 2 | QA | 多次快速复制 |
| SQLite WAL 模式 | 2.2 | Integration | - | 1 | DEV | WAL 模式配置验证 (new) |

**Total P2**: 14 tests, ~7 hours

### P3 (Low) - Run on-demand

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement | Story | Test Level | Test Count | Owner | Notes |
| ----------- | ----- | ---------- | ---------- | ----- | ----- |
| 启动性能 | 2.2 | E2E | 1 | QA | 数据库加载时间 |
| 内存使用 | 2.3 | Manual | 1 | QA | 图片缓存管理 |
| 边界测试 | ALL | Unit | 1 | DEV | 空值/极端输入 |

**Total P3**: 3 tests, ~1.5 hours

---

## Test Level Distribution

基于 MacPaste 技术栈特点（Tauri + React + SQLite），测试层级分布如下：

| Test Level | Count | Percentage | Rationale |
| ---------- | ----- | ---------- | --------- |
| **Unit** | 8 | 14% | 纯逻辑函数（去重、格式转换、时间戳） |
| **Integration (IPC Mock)** | 42 | 72% | Tauri Commands + SQLite 操作（核心覆盖） |
| **E2E (Playwright)** | 8 | 14% | 关键用户流程验证 |

> **注意**: 由于 macOS WKWebView 不支持 WebDriver，E2E 测试在 Playwright 浏览器模式运行，使用 `mockIPC` 模拟 Tauri 后端。

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] 剪贴板监听启动成功 (30s)
- [ ] 数据库连接正常 (30s)
- [ ] 纯文本复制捕获成功 (1min)
- [ ] 历史记录列表加载 (1min)

**Total**: 4 scenarios, ~3 min

### P0 Tests (<15 min)

**Purpose**: Critical path validation

- [ ] 剪贴板监听生命周期 (Integration)
- [ ] 纯文本/RTF 内容捕获 (Integration)
- [ ] SQLite 持久化读写 (Integration)
- [ ] 图片存储与路径引用 (Integration)
- [ ] 图片删除同步清理 (Integration)
- [ ] 剪贴板写入各类型 (Integration)
- [ ] 自动粘贴权限处理 (E2E)

**Total**: 18 scenarios, ~15 min

### P1 Tests (<30 min)

**Purpose**: Important feature coverage

- [ ] RTF/图片/文件引用捕获 (Integration)
- [ ] 来源应用和时间戳记录 (Integration)
- [ ] 搜索功能后端实现 (Integration)
- [ ] 类型过滤后端实现 (Integration)
- [ ] 收藏管理后端实现 (Integration)
- [ ] 内容去重逻辑 (Unit)

**Total**: 24 scenarios, ~25 min

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage

- [ ] 大图片处理性能 (Integration)
- [ ] 批量数据查询性能 (Integration)
- [ ] 多种图片格式支持 (Integration)
- [ ] 特殊字符和 SQL 注入防护 (Integration)
- [ ] 并发操作稳定性 (Integration)

**Total**: 16 scenarios, ~45 min

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
| -------- | ----- | ---------- | ----------- | ----- |
| P0 | 18 | 2.0 | 36 | 复杂 IPC Mock 设置，关键路径 |
| P1 | 24 | 1.0 | 24 | 标准覆盖 |
| P2 | 14 | 0.5 | 7 | 简单场景 (updated) |
| P3 | 3 | 0.5 | 1.5 | 探索性 |
| **Total** | **59** | **-** | **68.5** | **~9 days** |

### Prerequisites

**Test Data:**

- `createClipboardItem()` factory - 使用 faker-js 生成随机剪贴板数据
- `createMockImage()` factory - 生成测试图片（Base64 或临时文件）
- `mockDatabase()` fixture - 预填充 SQLite 测试数据

**Tooling:**

- `mockIPCCommands()` - Tauri IPC Mock 工具
- `@faker-js/faker` - 测试数据生成
- `vitest` - 单元/集成测试运行器
- `playwright` - E2E 测试

**Environment:**

- Vitest + jsdom 环境配置
- SQLite in-memory 或临时文件数据库
- Playwright 浏览器模式（非 Tauri 应用）

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths (剪贴板监听 + 存储)**: ≥80%
- **Security scenarios**: 100%
- **Business logic (搜索/过滤/收藏)**: ≥70%
- **Edge cases**: ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] No high-risk (≥6) items unmitigated
- [ ] 图片存储泄漏测试通过 (R-002)
- [ ] 权限降级场景测试通过 (R-004)

---

## Story-Level Test Scenarios

### Story 2.1: 剪贴板监听与内容捕获

**Acceptance Criteria Testing:**

| AC | Test Scenario | Level | Priority |
|----|---------------|-------|----------|
| 复制纯文本自动捕获 | `test_capture_plain_text` | Integration | P0 |
| 新记录出现在列表顶部 | `test_new_item_prepended` | Integration | P0 |
| RTF 格式内容捕获 | `test_capture_rtf_content` | Integration | P1 |
| 显示纯文本预览 | `test_rtf_preview_text` | Integration | P1 |
| 图片内容捕获 | `test_capture_image_content` | Integration | P1 |
| 显示缩略图预览 | `test_image_thumbnail_display` | E2E | P1 |
| 文件引用捕获 | `test_capture_file_reference` | Integration | P1 |
| 显示文件名和类型图标 | `test_file_display_icon` | E2E | P1 |
| 自动记录来源应用和时间戳 | `test_metadata_recorded` | Integration | P1 |
| 重复内容更新时间戳 | `test_duplicate_updates_timestamp` | Integration | P1 |

### Story 2.2: SQLite 数据持久化

**Acceptance Criteria Testing:**

| AC | Test Scenario | Level | Priority |
|----|---------------|-------|----------|
| 首次启动自动创建数据库 | `test_database_auto_create` | Integration | P0 |
| 初始化 Schema | `test_schema_initialization` | Integration | P0 |
| 新内容持久化保存 | `test_item_persistence` | Integration | P0 |
| 包含所有必要字段 | `test_required_fields_saved` | Integration | P0 |
| 从数据库加载历史 | `test_load_history_on_startup` | Integration | P0 |
| 按时间戳降序排列 | `test_items_sorted_by_timestamp` | Integration | P1 |
| 重启后历史仍可见 | `test_persistence_across_restart` | Integration | P0 |
| 删除记录永久删除 | `test_delete_item_permanent` | Integration | P1 |
| 错误提示友好 | `test_database_error_handling` | Integration | P2 |
| 错误记录到日志 | `test_error_logging` | Unit | P2 |

### Story 2.3: 图片存储与加载

**Acceptance Criteria Testing:**

| AC | Test Scenario | Level | Priority |
|----|---------------|-------|----------|
| 图片保存到 images 目录 | `test_image_saved_to_directory` | Integration | P0 |
| 数据库保存相对路径 | `test_relative_path_stored` | Integration | P0 |
| 图片缩略图正确加载 | `test_thumbnail_loads_correctly` | E2E | P0 |
| 无加载失败图标 | `test_no_broken_image_icon` | E2E | P1 |
| 删除记录时图片删除 | `test_image_deleted_with_record` | Integration | P0 |
| 数据库记录同步删除 | `test_db_record_deleted` | Integration | P0 |
| 重启后图片仍显示 | `test_image_persists_after_restart` | Integration | P1 |

### Story 2.4: 剪贴板写入与自动粘贴

**Acceptance Criteria Testing:**

| AC | Test Scenario | Level | Priority |
|----|---------------|-------|----------|
| 首次粘贴权限请求提示 | `test_accessibility_permission_prompt` | E2E | P0 |
| 无权限时仅写入剪贴板 | `test_fallback_to_clipboard_only` | E2E | P0 |
| 文本写入剪贴板 | `test_write_text_to_clipboard` | Integration | P0 |
| Cmd+V 可粘贴内容 | `test_pasted_content_available` | E2E | P1 |
| 图片写入剪贴板 | `test_write_image_to_clipboard` | Integration | P0 |
| 自动粘贴到活跃应用 | `test_auto_paste_to_active_app` | E2E | P1 |
| 粘贴后面板关闭 | `test_panel_closes_after_paste` | E2E | P1 |
| 文件引用写入剪贴板 | `test_write_file_reference` | Integration | P1 |

### Story 2.5: 搜索过滤后端实现

**Acceptance Criteria Testing:**

| AC | Test Scenario | Level | Priority |
|----|---------------|-------|----------|
| 关键词 SQL LIKE 查询 | `test_search_sql_like_query` | Integration | P1 |
| 返回匹配记录列表 | `test_search_returns_matches` | Integration | P1 |
| 类型过滤 WHERE 查询 | `test_filter_by_type_sql` | Integration | P1 |
| 只返回对应类型记录 | `test_filter_returns_correct_type` | Integration | P1 |
| 组合查询（搜索+过滤） | `test_combined_search_and_filter` | Integration | P1 |
| 两个条件同时满足 | `test_combined_conditions` | Integration | P1 |
| 大量数据响应时间 <100ms | `test_search_performance_1000_items` | Integration | P2 |

### Story 2.6: 收藏管理后端实现

**Acceptance Criteria Testing:**

| AC | Test Scenario | Level | Priority |
|----|---------------|-------|----------|
| 点击收藏更新 is_starred=1 | `test_toggle_star_on` | Integration | P1 |
| UI 显示收藏状态 | `test_star_icon_displayed` | E2E | P1 |
| 已收藏再点击更新 is_starred=0 | `test_toggle_star_off` | Integration | P1 |
| UI 显示未收藏状态 | `test_empty_star_displayed` | E2E | P1 |
| 重启后收藏状态保持 | `test_star_persists_after_restart` | Integration | P1 |
| 收藏过滤显示 is_starred=1 | `test_filter_starred_items` | Integration | P1 |
| 结果来自数据库查询 | `test_starred_from_db_not_memory` | Integration | P1 |

---

## Mitigation Plans

### R-001: 剪贴板内容丢失 (Score: 6)

**Mitigation Strategy:**
1. 实现剪贴板监听重试机制（连接断开时自动重连）
   - **重试参数**: 指数退避，最大 5 次，间隔 1s → 2s → 4s → 8s → 16s
   - 超过最大重试次数后显示错误通知
2. 捕获失败时记录详细错误日志
3. 显示用户友好通知（Toast："剪贴板监听已恢复"）
4. 添加健康检查机制定期验证监听状态

**Owner:** DEV
**Timeline:** Story 2.1 实现阶段
**Status:** Planned
**Verification:** 集成测试覆盖重试场景 + E2E 验证通知显示

### R-002: 图片存储泄漏 (Score: 6)

**Mitigation Strategy:**
1. 删除记录时使用正确顺序操作：
   - **Step 1**: 先删除 DB 记录（带事务）
   - **Step 2**: DB 删除成功后，再删除图片文件
   - **理由**: 即使文件删除失败，数据库也是一致的；孤儿文件可通过清理任务处理
2. 实现孤儿图片清理任务（启动时检查 images 目录，删除无对应 DB 记录的文件）
3. 记录图片删除失败到日志（便于后续清理）

**Owner:** DEV
**Timeline:** Story 2.3 实现阶段
**Status:** Planned
**Verification:** 集成测试验证删除原子性 + 手动验证磁盘清理

### R-003: 敏感内容暴露 (Score: 6)

**Mitigation Strategy:**
1. MVP 阶段：记录风险，不实现过滤
2. **⚠️ 用户文档必须明确告知**：
   - 在 README 或帮助文档中说明：MacPaste 会存储所有复制的内容，包括密码和敏感信息
   - 建议用户在复制敏感信息后手动清除历史
3. Post-MVP (Phase 2)：实现敏感内容检测（密码字段、API Key 格式）
4. Post-MVP：提供"排除应用"配置选项（如排除 1Password、Keychain Access）
5. 考虑内容加密存储

**Owner:** DEV
**Timeline:** Post-MVP (Phase 2)
**Status:** Planned (Deferred) - 用户文档说明需在 MVP 完成
**Verification:** 手动安全审查 + 用户文档说明风险

### R-004: 自动粘贴失败 (Score: 6)

**Mitigation Strategy:**
1. **🔬 需要 Spike 验证**：在 Story 2.4 开始前，需验证 Tauri 2.x 中辅助功能权限检测的实现方式
   - 需确认：`AXIsProcessTrustedWithOptions` API 如何通过 Rust 调用
   - 是否需要自定义 Tauri 命令封装
2. 首次尝试时检测辅助功能权限状态
3. 未授权时显示清晰的权限引导（跳转到系统偏好设置）
4. 优雅降级：仅写入剪贴板，显示 Toast "已复制，请手动粘贴"
5. 记录权限状态避免重复提示

**Owner:** DEV
**Timeline:** Story 2.4 实现阶段（Spike 在 Story 开始前完成）
**Status:** Planned - **Spike Required**
**Verification:** E2E 测试覆盖两种权限场景

---

## Assumptions and Dependencies

### Assumptions

1. `tauri-plugin-clipboard-x` 支持所有 PRD 中指定的内容类型（Text/RTF/Image/Files）
2. SQLite 性能足以处理 1000+ 条历史记录的实时查询
3. macOS 辅助功能权限 API 可通过 Tauri 正确调用
4. 图片存储目录权限在 Tauri app data 目录下已正确配置

### Dependencies

1. **tauri-plugin-clipboard-x v2.x** - 剪贴板监听核心依赖 - Required by Sprint 2.1
2. **tauri-plugin-sql (SQLite)** - 数据持久化 - Required by Sprint 2.2
3. **Epic 1 完成** - NSPanel、全局快捷键、Zustand Store 已实现 - ✅ Completed

### Risks to Plan

- **Risk**: tauri-plugin-clipboard-x 不支持某些图片格式
  - **Impact**: 部分图片无法捕获
  - **Contingency**: 降级为不支持该格式，记录日志

- **Risk**: 辅助功能权限检测 API 不可靠
  - **Impact**: 无法准确判断权限状态
  - **Contingency**: 总是尝试粘贴，捕获失败后降级

---

## macOS 测试限制说明

> ⚠️ **Critical Constraint**: macOS WKWebView 不支持 WebDriver 协议

**影响:**
- 无法进行真实的 Tauri E2E 测试（启动应用 + 自动化操作）
- 无法自动化测试 NSPanel 窗口行为、全局快捷键响应

**替代策略:**
1. 使用 `mockIPC` 进行 IPC 集成测试（覆盖 80%+ Tauri 命令）
2. Playwright 测试浏览器 UI 层（不启动 Tauri 应用）
3. **手动验收测试清单**（Must-Pass）:
   - [ ] 复制文本，MacPaste 自动捕获
   - [ ] 复制图片，缩略图正确显示
   - [ ] 选择历史项，自动粘贴到其他应用
   - [ ] 重启应用，历史记录保留
   - [ ] 删除图片类型记录，磁盘文件同步删除

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (separate workflow; not auto-run).
- Run `*automate` for broader coverage once implementation exists.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: Boss Date: ____
- [ ] Tech Lead: ____ Date: ____
- [ ] QA Lead: Murat (TEA) Date: 2025-12-27

**Comments:**

---

## Appendix

### Party Mode Review Summary (2025-12-27)

**Reviewers:** John (PM), Winston (Architect), Amelia (Dev), Murat (TEA)

**Review Outcome:** ✅ APPROVED with minor revisions

**Changes Applied:**
1. ✅ R-001: 增加具体重试参数（指数退避 1s/2s/4s/8s/16s，最大 5 次）
2. ✅ R-002: 修正删除顺序（先 DB 后文件，确保数据库一致性）
3. ✅ R-003: 增加用户文档说明要求（敏感内容风险告知）
4. ✅ R-004: 增加 Spike 验证要求（辅助功能权限 API 调研）
5. ✅ P2 测试: 搜索性能测试从 100 条提升到 1000 条
6. ✅ P2 测试: 新增 SQLite WAL 模式配置验证测试
7. ✅ 附录: 新增测试代码示例

### Test Code Examples

**图片删除测试实现示例：**

```typescript
// tests/integration/image-deletion.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mockIPCCommands, getInvokeMock } from '@/test-utils/tauri-mocks'
import { createClipboardItem } from '../support/fixtures/factories/clipboard-factory'
import { createTempImageFile, fileExists } from '../support/fixtures/factories/image-factory'

describe('Image Deletion Sync', () => {
  it('should delete image file when record is deleted', async () => {
    // Arrange: Create image item with real temp file
    const imagePath = createTempImageFile('png')
    const item = createClipboardItem({
      content_type: 'image',
      image_path: imagePath
    })

    mockIPCCommands({
      get_item_by_id: item,
      delete_item: { success: true },
    })

    // Act: Delete the item
    await invoke('delete_item', { id: item.id })

    // Assert: Both DB record and file should be gone
    expect(await fileExists(imagePath)).toBe(false)
    expect(getInvokeMock()).toHaveBeenCalledWith('delete_item', { id: item.id })
  })
})
```

**搜索性能测试实现示例：**

```typescript
// tests/integration/search-performance.test.ts
import { describe, it, expect } from 'vitest'
import { mockIPCCommands } from '@/test-utils/tauri-mocks'
import { createClipboardItems } from '../support/fixtures/factories/clipboard-factory'

describe('Search Performance', () => {
  it('should return results within 100ms for 1000 items', async () => {
    // Arrange: Generate 1000 items
    const items = createClipboardItems(1000)

    mockIPCCommands({
      search_clipboard_items: (args) => {
        // Simulate DB filtering
        return items.filter(i =>
          i.content.includes(args.query) ||
          i.preview_text?.includes(args.query)
        )
      },
    })

    // Act: Measure search time
    const start = performance.now()
    await invoke('search_clipboard_items', { query: 'test', filter: 'all' })
    const duration = performance.now() - start

    // Assert: Should complete within 100ms
    expect(duration).toBeLessThan(100)
  })
})
```

### Test Factory Extension Required

**需要创建 `image-factory.ts`：**

```typescript
// tests/support/fixtures/factories/image-factory.ts
import { writeFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export function createMockImage(format: 'png' | 'jpeg' = 'png'): Uint8Array {
  // Generate minimal valid image bytes
  if (format === 'png') {
    // Minimal 1x1 transparent PNG
    return new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      // ... IHDR, IDAT, IEND chunks
    ])
  }
  // Minimal JPEG implementation
  return new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, /* ... */ 0xFF, 0xD9])
}

export function createTempImageFile(format: 'png' | 'jpeg' = 'png'): string {
  const filename = `test-${Date.now()}.${format}`
  const filepath = join(tmpdir(), filename)
  writeFileSync(filepath, createMockImage(format))
  return filepath
}

export function fileExists(path: string): boolean {
  return existsSync(path)
}

export function cleanupTempImage(path: string): void {
  if (existsSync(path)) unlinkSync(path)
}
```

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (6 categories, scoring 1-9)
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection (Unit/Integration/E2E)
- `test-priorities-matrix.md` - P0-P3 prioritization criteria

### Related Documents

- PRD: `_bmad-output/project-planning-artifacts/prd.md`
- Epic: `_bmad-output/project-planning-artifacts/epics.md` (Epic 2 section)
- Architecture: `_bmad-output/project-planning-artifacts/architecture.md`
- Test Design Epic 1: `_bmad-output/implementation-artifacts/test-design-epic-1.md`

---

**Generated by**: Murat - TEA Agent (Master Test Architect)
**Workflow**: `_bmad/bmm/testarch/test-design`
**Version**: 4.0 (BMad v6)
**Last Updated**: 2025-12-27 (Party Mode Review)
