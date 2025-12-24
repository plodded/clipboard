# MacPaste 项目文档索引

> 生成日期：2025-12-24
> 工作流版本：1.2.0
> 扫描模式：深度扫描 (deep)

---

## 项目概览

| 属性 | 值 |
|------|-----|
| **类型** | Monolith |
| **主要语言** | TypeScript + Rust |
| **架构** | Tauri IPC Desktop App |
| **状态** | UI 原型阶段 |

## 快速参考

| 类别 | 技术 |
|------|------|
| **前端** | React 19.0.0 + TypeScript 5.7.2 |
| **构建** | Vite 6.0.5 |
| **样式** | TailwindCSS 3.4.17 |
| **后端** | Rust (Edition 2021) + Tauri 2.x |
| **入口点** | `src/main.tsx` (前端) / `src-tauri/src/main.rs` (后端) |
| **架构模式** | 组件化 + Hooks 状态管理 |

---

## 生成的文档

### 核心文档

- [项目概览](./project-overview.md) - 项目基本信息和快速开始
- [架构文档](./architecture.md) - 技术栈、架构模式、数据模型
- [源代码树分析](./source-tree-analysis.md) - 目录结构和关键文件

### 开发文档

- [开发指南](./development-guide.md) - 环境配置、脚本命令、开发工作流
- [组件清单](./component-inventory.md) - UI 组件详情和类型定义

### 系统文件

- [扫描状态报告](./project-scan-report.json) - 工作流状态和发现

---

## 现有文档

| 文档 | 路径 | 说明 |
|------|------|------|
| UI 原型说明 | `macpaste-ui/README.md` | AI Studio 生成的 UI 原型运行说明 |

---

## 快速开始

### 环境要求

- Node.js 18+
- Rust 1.70+
- Xcode Command Line Tools (macOS)

### 安装和运行

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 生产构建
npm run tauri build
```

### 常用快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+Shift+V` | 切换面板 |
| `←` / `→` | 选择项目 |
| `Enter` | 复制选中项 |
| `Esc` | 关闭面板 |

---

## 后续步骤

1. **阅读架构文档** - 了解项目结构和技术决策
2. **参考开发指南** - 设置开发环境
3. **创建 PRD** - 规划新功能开发

### 推荐的 BMAD 工作流

```bash
# 创建产品需求文档
/bmad:bmm:workflows:create-prd

# 创建架构设计
/bmad:bmm:workflows:create-architecture
```

---

## 文档更新

如需更新此文档，请运行：

```bash
/bmad:bmm:workflows:document-project
```

---

*此索引由 BMAD Document Project 工作流自动生成*
*项目根目录：`/Volumes/Samsung PSSD T9/dev/clipboardmanager`*
