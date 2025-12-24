# MacPaste 开发指南

> 生成日期：2025-12-24

## 环境要求

### 必需软件

| 软件 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 18+ | 前端开发 |
| **npm** | 9+ | 包管理 |
| **Rust** | 1.70+ | 后端开发 |
| **Xcode Command Line Tools** | 最新 | macOS 编译 |

### 安装 Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd clipboardmanager
```

### 2. 安装依赖

```bash
# 前端依赖
npm install

# Rust 依赖 (自动在首次构建时安装)
```

### 3. 开发模式

```bash
# 启动 Tauri 开发服务器
npm run tauri dev
```

这会同时启动：
- Vite 开发服务器 (端口 1420)
- Tauri 桌面应用窗口

### 4. 生产构建

```bash
# 构建发布版本
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`

## 项目脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 仅启动 Vite 开发服务器 |
| `npm run build` | 仅构建前端 |
| `npm run preview` | 预览构建结果 |
| `npm run tauri` | Tauri CLI |
| `npm run tauri dev` | 开发模式（推荐） |
| `npm run tauri build` | 生产构建 |

## 开发工作流

### 前端开发

1. 修改 `src/` 下的文件
2. Vite HMR 自动刷新
3. 在 Tauri 窗口中查看效果

### 后端开发

1. 修改 `src-tauri/src/` 下的 Rust 文件
2. Tauri 自动重新编译
3. 应用自动重启

### 添加 Tauri Command

1. 在 `lib.rs` 中定义命令：

```rust
#[tauri::command]
fn my_command(arg: String) -> String {
    format!("Result: {}", arg)
}
```

2. 注册命令：

```rust
.invoke_handler(tauri::generate_handler![greet, my_command])
```

3. 前端调用：

```typescript
import { invoke } from '@tauri-apps/api/core';

const result = await invoke('my_command', { arg: 'hello' });
```

## 代码规范

### TypeScript

- 使用严格模式 (`strict: true`)
- 无未使用变量 (`noUnusedLocals: true`)
- 路径别名 `@/` 指向 `src/`

### React

- 函数式组件 + Hooks
- 组件文件使用 PascalCase
- 每个组件一个文件

### Rust

- 使用 `cargo fmt` 格式化
- 使用 `cargo clippy` 检查

## 目录约定

```
src/
├── components/     # 可复用组件
├── hooks/          # 自定义 Hooks (待创建)
├── utils/          # 工具函数 (待创建)
├── types.ts        # 类型定义
├── constants.ts    # 常量
└── App.tsx         # 主组件
```

## 调试

### 前端调试

- 使用浏览器 DevTools (Tauri 窗口中按 `Cmd+Option+I`)
- Console 日志
- React DevTools (需安装扩展)

### 后端调试

- `println!()` 宏
- `dbg!()` 宏
- Rust 日志库 (`tracing`, `log`)

## 常见问题

### Q: 首次运行 `tauri dev` 很慢？

A: 首次运行需要编译 Rust 依赖，这是正常的。后续运行会快很多。

### Q: 如何更新 Tauri？

```bash
npm update @tauri-apps/cli @tauri-apps/api
cd src-tauri && cargo update
```

### Q: 如何添加 Tauri 插件？

1. 安装 npm 包：`npm install @tauri-apps/plugin-xxx`
2. 添加 Cargo 依赖：在 `Cargo.toml` 添加
3. 在 `lib.rs` 中初始化插件

---

*此文档由 BMAD Document Project 工作流自动生成*
