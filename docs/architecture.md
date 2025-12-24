# MacPaste 架构文档

> 生成日期：2025-12-24
> 扫描模式：深度扫描 (deep)
> 项目类型：desktop (Tauri 2.x 桌面应用)

## 1. 执行摘要

MacPaste 是一个 macOS 剪贴板管理器，使用 Tauri 2.x 框架构建。项目采用 React 19 + TypeScript 前端和 Rust 后端的混合架构，通过 Tauri IPC 进行通信。

**当前状态**：UI 原型阶段 - 前端 UI 已完成，后端剪贴板监听功能待实现。

## 2. 技术栈

### 2.1 前端技术

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | React | 19.0.0 | 函数式组件 + Hooks |
| 语言 | TypeScript | 5.7.2 | 严格模式 |
| 构建 | Vite | 6.0.5 | 开发服务器 + 生产构建 |
| 样式 | TailwindCSS | 3.4.17 | 原子化 CSS |
| 图标 | Lucide React | 0.469.0 | SVG 图标库 |
| 工具 | clsx + tailwind-merge | - | CSS 类名处理 |

### 2.2 后端技术

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 语言 | Rust | Edition 2021 | 系统级编程 |
| 框架 | Tauri | 2.x | 轻量级桌面框架 |
| 序列化 | serde | 1.x | JSON 序列化 |
| 插件 | tauri-plugin-shell | 2.x | Shell 命令支持 |

## 3. 架构模式

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     MacPaste Desktop App                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   Frontend (WebView)                     ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  ││
│  │  │   App    │  │Components│  │   State Management   │  ││
│  │  │ (React)  │──│ClipCard  │──│ useState/useMemo     │  ││
│  │  │          │  │FilterBar │  │ localStorage         │  ││
│  │  │          │  │SearchBar │  │                      │  ││
│  │  └──────────┘  └──────────┘  └──────────────────────┘  ││
│  └────────────────────────┬────────────────────────────────┘│
│                           │ Tauri IPC (invoke)              │
│  ┌────────────────────────▼────────────────────────────────┐│
│  │                   Backend (Rust)                         ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  ││
│  │  │  main.rs │──│  lib.rs  │──│  Tauri Commands      │  ││
│  │  │ (entry)  │  │  (run)   │  │  (greet, 待扩展)     │  ││
│  │  └──────────┘  └──────────┘  └──────────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 3.2 前端组件层次

```
App.tsx
├── SearchBar          # 搜索输入框
├── FilterBar          # 分类过滤器 (全部/文本/图片/文件/收藏)
└── ClipboardCard[]    # 剪贴板项目卡片列表
```

### 3.3 数据流

```
用户操作 → React State → 过滤/搜索 → 渲染
    │
    └→ localStorage (持久化)

未来扩展:
用户操作 → Tauri invoke → Rust 后端 → 系统剪贴板
```

## 4. 核心数据模型

### 4.1 ClipboardItem

```typescript
interface ClipboardItem {
  id: string;                    // 唯一标识
  type: ClipboardType;           // Text | RTF | Image | File
  content: string;               // 内容（文本/URL/路径）
  previewText?: string;          // RTF 预览文本
  timestamp: number;             // 时间戳
  isStarred: boolean;            // 收藏状态
  metadata?: {
    appName?: string;            // 来源应用
    dimensions?: string;         // 图片尺寸
    size?: string;               // 文件大小
  };
}
```

### 4.2 FilterCategory

```typescript
enum FilterCategory {
  All = 'All',
  Text = 'Text',
  Image = 'Image',
  File = 'File',
  Starred = 'Starred'
}
```

## 5. 状态管理

| 状态 | 类型 | 用途 |
|------|------|------|
| `isOpen` | boolean | 面板显示/隐藏 |
| `items` | ClipboardItem[] | 剪贴板历史 |
| `searchQuery` | string | 搜索关键词 |
| `filterCategory` | FilterCategory | 当前过滤分类 |
| `selectedIndex` | number | 当前选中索引 |
| `toastMessage` | string \| null | Toast 提示 |

**持久化策略**：使用 `localStorage` 存储剪贴板历史（key: `macos-clipboard-history`）

## 6. 入口点

| 层 | 文件 | 说明 |
|----|------|------|
| 前端 | `src/main.tsx` | React 应用入口 |
| 后端 | `src-tauri/src/main.rs` | Rust 应用入口 |
| HTML | `index.html` | WebView 容器 |

## 7. 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+Shift+V` | 切换面板显示 |
| `←` / `→` | 选择上/下一项 |
| `Enter` | 复制选中项 |
| `Esc` | 关闭面板 |

## 8. 待实现功能

1. **Rust 剪贴板监听** - 监听系统剪贴板变化
2. **真实剪贴板写入** - 通过 Tauri command 写入剪贴板
3. **全局快捷键** - 使用 Tauri 注册全局快捷键
4. **数据持久化** - 迁移到 SQLite 或 Tauri 存储
5. **图片预览** - 本地图片预览而非 URL

## 9. 构建配置

### 9.1 Tauri 配置 (tauri.conf.json)

- **产品名称**: MacPaste
- **标识符**: com.macpaste.desktop
- **窗口尺寸**: 1200 x 800
- **前端端口**: 1420 (开发模式)

### 9.2 发布优化 (Cargo.toml)

```toml
[profile.release]
codegen-units = 1
lto = true
opt-level = "s"
panic = "abort"
strip = true
```

---

*此文档由 BMAD Document Project 工作流自动生成*
