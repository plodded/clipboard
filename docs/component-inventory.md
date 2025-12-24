# MacPaste 组件清单

> 生成日期：2025-12-24

## 组件概览

| 组件 | 文件 | 行数 | 类型 |
|------|------|------|------|
| App | `src/App.tsx` | 267 | 页面 |
| ClipboardCard | `src/components/ClipboardCard.tsx` | 100 | 展示 |
| FilterBar | `src/components/FilterBar.tsx` | 52 | 导航 |
| SearchBar | `src/components/SearchBar.tsx` | 44 | 输入 |

## 组件详情

### App

**位置**: `src/App.tsx`

**职责**: 主应用组件，管理全局状态和布局

**状态**:
- `isOpen` - 面板显示状态
- `items` - 剪贴板历史列表
- `searchQuery` - 搜索关键词
- `filterCategory` - 当前过滤分类
- `selectedIndex` - 选中项索引
- `toastMessage` - Toast 提示

**功能**:
- 剪贴板历史管理
- 搜索和过滤
- 键盘导航 (←/→/Enter/Esc)
- localStorage 持久化
- Toast 通知

---

### ClipboardCard

**位置**: `src/components/ClipboardCard.tsx`

**职责**: 显示单个剪贴板项目

**Props**:
```typescript
interface ClipboardCardProps {
  item: ClipboardItem;
  isActive: boolean;
  onClick: () => void;
  onStarToggle: (e: MouseEvent) => void;
}
```

**功能**:
- 根据类型显示不同图标
- 图片预览 (ClipboardType.Image)
- 文本预览 (ClipboardType.Text/RTF)
- 文件路径显示 (ClipboardType.File)
- 收藏按钮
- 时间戳显示
- 活跃状态高亮

**依赖图标**: FileText, Image, Type, Paperclip, Star, Clock, Copy

---

### FilterBar

**位置**: `src/components/FilterBar.tsx`

**职责**: 分类过滤和结果计数

**Props**:
```typescript
interface FilterBarProps {
  currentFilter: FilterCategory;
  onSelect: (filter: FilterCategory) => void;
  resultCount: number;
}
```

**过滤选项**:
| 分类 | 标签 | 图标 |
|------|------|------|
| All | 全部 | Grid |
| Text | 文本 | FileText |
| Image | 图片 | Image |
| File | 文件 | Paperclip |
| Starred | 收藏 | Star |

---

### SearchBar

**位置**: `src/components/SearchBar.tsx`

**职责**: 搜索输入框

**Props**:
```typescript
interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  isVisible: boolean;
}
```

**功能**:
- 受控输入
- 面板打开时自动聚焦
- 面板关闭时失焦

**依赖图标**: Search

---

## 工具函数

### utils.ts

| 函数 | 用途 |
|------|------|
| `cn(...inputs)` | 合并 CSS 类名 (clsx + tailwind-merge) |
| `stripHtml(html)` | 从 HTML 提取纯文本 |
| `formatTime(timestamp)` | 格式化时间（刚刚/X分钟前/X小时前） |

---

## 类型定义

### types.ts

```typescript
// 剪贴板类型
enum ClipboardType {
  Text = 'Text',
  RTF = 'RTF',
  Image = 'Image',
  File = 'File'
}

// 剪贴板项目
interface ClipboardItem {
  id: string;
  type: ClipboardType;
  content: string;
  previewText?: string;
  timestamp: number;
  isStarred: boolean;
  metadata?: {
    appName?: string;
    dimensions?: string;
    size?: string;
  };
}

// 过滤分类
enum FilterCategory {
  All = 'All',
  Text = 'Text',
  Image = 'Image',
  File = 'File',
  Starred = 'Starred'
}
```

---

## 设计系统

### 颜色

- 背景: `slate-900`, `black/20`, `white/10`
- 主色: `blue-500`, `indigo-500`, `purple-600`
- 强调: `yellow-400` (收藏), `green-400` (成功)

### 动画

- `animateIn` - 淡入缩放动画
- `transition-all duration-200` - 通用过渡

### 间距

- 卡片: `p-3`, `gap-4`
- 面板高度: `340px`

---

*此文档由 BMAD Document Project 工作流自动生成*
