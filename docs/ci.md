# CI/CD 流水线指南

本文档描述 MacPaste 项目的持续集成/持续部署流水线配置。

## 概览

MacPaste 使用 **GitHub Actions** 作为 CI/CD 平台，流水线在以下情况自动触发：

- 推送到 `main` 或 `develop` 分支
- 创建或更新 Pull Request

## 流水线结构

```
┌─────────────────┐
│    Install      │  安装依赖 + 缓存 (~2 min)
└────────┬────────┘
         │
    ┌────┴────┬─────────────┐
    ▼         ▼             ▼
┌───────┐ ┌─────────┐ ┌───────────────┐
│ Lint  │ │  Unit   │ │  E2E Tests    │
│ (tsc) │ │ Tests   │ │  (2 shards)   │
└───┬───┘ └────┬────┘ └───────┬───────┘
    │          │              │
    └──────────┴──────────────┤
                              ▼
                    ┌─────────────────┐
                    │    Burn-in      │  仅 PR (5 iterations)
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │    Summary      │  结果汇总
                    └─────────────────┘
```

## 阶段详解

### 1. Install (安装依赖)

- 安装 npm 依赖并缓存
- 安装 Playwright 浏览器 (Chromium + WebKit)
- 缓存策略基于 `package-lock.json` 哈希

### 2. Lint (代码检查)

- 运行 TypeScript 类型检查 (`tsc --noEmit`)
- 超时: 5 分钟

### 3. Unit Tests (单元测试)

- 运行 Vitest 单元测试
- 生成覆盖率报告
- 超时: 10 分钟

### 4. E2E Tests (端到端测试)

- 使用 Playwright 运行 E2E 测试
- **并行分片**: 2 个分片并行执行
- **浏览器**: Chromium + WebKit
- 超时: 20 分钟/分片

### 5. Burn-in (稳定性测试)

- **仅在 PR 分支运行**
- 检测变更的测试文件
- 运行 5 次迭代，任何一次失败则整体失败
- 用于发现 flaky (不稳定) 测试
- 超时: 30 分钟

### 6. Summary (结果汇总)

- 汇总所有阶段结果
- 生成 GitHub Summary 表格

## 本地运行

### 完整 CI 镜像

```bash
# 完整流水线 (包含 burn-in)
npm run test:ci

# 快速模式 (跳过 burn-in)
npm run test:ci:quick
```

### 单独运行

```bash
# TypeScript 检查
npx tsc --noEmit

# 单元测试
npm run test:unit

# E2E 测试
npm run test:e2e

# Burn-in 测试 (10 次迭代)
npm run test:burn-in

# 选择性测试 (基于变更文件)
npm run test:changed
```

## 调试失败的 CI 运行

### 1. 查看产物

失败时，CI 会上传以下产物：

- `e2e-artifacts-shard-X/` - E2E 测试产物
- `burn-in-failure-artifacts/` - Burn-in 失败产物
- `coverage-report/` - 覆盖率报告

### 2. 查看 Trace

```bash
# 下载产物后
npx playwright show-trace test-results/trace.zip
```

### 3. 本地复现

```bash
# 使用相同的 Node 版本
nvm use

# 运行失败的测试
npm run test:e2e -- tests/e2e/failing-test.spec.ts
```

## 性能目标

| 阶段 | 目标时间 |
|------|----------|
| Install | < 2 min |
| Lint | < 2 min |
| Unit Tests | < 5 min |
| E2E (per shard) | < 10 min |
| Burn-in | < 15 min |
| **总计** | **< 30 min** |

## 缓存策略

| 缓存项 | Key | 路径 |
|--------|-----|------|
| npm 缓存 | `package-lock.json` 哈希 | `~/.npm` |
| node_modules | `package-lock.json` 哈希 | `node_modules/` |
| Playwright | `package-lock.json` 哈希 | `~/.cache/ms-playwright/` |

## 并发控制

- 同一 PR 的多次推送会取消之前的运行
- 配置: `concurrency.cancel-in-progress: true`

## 状态徽章

在 README 中添加状态徽章：

```markdown
[![Tests](https://github.com/plodded/clipboard/actions/workflows/test.yml/badge.svg)](https://github.com/plodded/clipboard/actions/workflows/test.yml)
```

## 相关文件

- `.github/workflows/test.yml` - CI 配置
- `.nvmrc` - Node 版本锁定
- `playwright.config.ts` - Playwright 配置
- `vitest.config.ts` - Vitest 配置
- `scripts/ci-local.sh` - 本地 CI 镜像
- `scripts/burn-in.sh` - Burn-in 脚本
- `scripts/test-changed.sh` - 选择性测试

## 常见问题

### Q: 为什么 Burn-in 只在 PR 运行？

A: Burn-in 主要用于在合并前发现不稳定测试。在 main 分支上，代码已经过 PR 验证，无需重复运行。

### Q: 如何增加分片数量？

A: 编辑 `.github/workflows/test.yml`，修改 matrix 配置：

```yaml
matrix:
  shard: [1, 2, 3, 4]  # 增加到 4 分片
  total: [4]
```

### Q: Burn-in 失败但本地无法复现？

A: 可能是环境差异导致的 flaky 测试。尝试：

1. 使用 `npm run test:burn-in -- 20` 增加迭代次数
2. 检查是否有时间相关的断言
3. 检查是否有网络请求未 mock

---

_最后更新: 2025-12-25_
