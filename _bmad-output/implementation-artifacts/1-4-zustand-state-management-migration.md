# Story 1.4: Zustand 状态管理迁移

Status: review

---

## Story

**As a** 开发者,
**I want** 将现有 React State 迁移到 Zustand 状态管理,
**So that** 应用具备可维护的全局状态架构，为后续真实数据集成做好准备。

---

## Acceptance Criteria

1. **Given** 状态迁移完成后 **When** 应用启动 **Then** 所有现有功能（搜索、过滤、收藏、导航）行为与迁移前完全一致

2. **Given** clipboardStore 已创建 **When** 组件需要访问剪贴板数据 **Then** 通过 `useClipboardStore` hook 获取，无需通过 props 传递

3. **Given** 用户执行任何状态变更操作（搜索、过滤、收藏）**When** 操作完成 **Then** 相关状态在 store 中正确更新，UI 响应式刷新

4. **Given** 迁移完成 **When** 检查代码结构 **Then** `App.tsx` 中不再包含 `useState` 管理的业务状态（items, searchQuery 等）

---

## Tasks / Subtasks

- [x] Task 1: 安装 Zustand 依赖 (AC: #2)
  - [x] 1.1 运行 `npm install zustand`
  - [x] 1.2 验证 package.json 更新

- [x] Task 2: 创建 clipboardStore (AC: #2, #3)
  - [x] 2.1 创建 `src/stores/clipboardStore.ts`
  - [x] 2.2 定义 ClipboardStore interface（状态 + actions）
  - [x] 2.3 实现 create() 函数创建 store
    - ⚠️ **CRITICAL**: 使用 `INITIAL_MOCK_DATA` 作为 items 默认值（防止 Demo 回归）
    - ⚠️ **CRITICAL**: persist 中间件使用 `STORAGE_KEY` 常量（不要硬编码）
    - ⚠️ **CRITICAL**: `setSearchQuery` 和 `setFilterCategory` 必须同时重置 `selectedIndex = 0`
  - [x] 2.4 实现 filteredItems 派生状态（保持在 App.tsx 中使用 useMemo）
  - [x] 2.5 添加单元测试 `src/stores/clipboardStore.test.ts`

- [x] Task 3: 迁移 App.tsx 状态到 Store (AC: #1, #4)
  - [x] 3.1 移除 useState 声明（items, searchQuery, filterCategory, selectedIndex, toastMessage）
  - [x] 3.2 使用 useClipboardStore 获取状态
  - [x] 3.3 替换 setXxx 调用为 store actions
  - [x] 3.4 保留 useRef（scrollContainerRef, itemRefs）- 不迁移到 store
  - [x] 3.5 保留 useEffect（blur 监听、滚动同步）- 继续使用 store 状态
  - [x] 3.6 **移除** "重置选中" useEffect (App.tsx:79-82) - 逻辑已移至 store actions

- [x] Task 4: 更新子组件 Props (AC: #2)
  - [x] 4.1 SearchBar: 直接从 store 获取 query，移除 props
  - [x] 4.2 FilterBar: 直接从 store 获取 filter，移除 props
  - [x] 4.3 ClipboardCard: 保持 props（item, isActive）- 由 map 遍历提供

- [x] Task 5: 验证功能完整性 (AC: #1)
  - [x] 5.1 搜索功能：输入关键词，列表实时过滤
  - [x] 5.2 过滤功能：切换类型，显示对应记录
  - [x] 5.3 收藏功能：点击星号，状态切换并持久化
  - [x] 5.4 键盘导航：方向键移动，回车复制，Esc 关闭
  - [x] 5.5 Toast 显示：复制后显示提示

---

## Dev Notes

### 需要迁移的状态（来自 App.tsx:13-17）

```typescript
// 当前使用 useState 管理的状态
const [items, setItems] = useState<ClipboardItem[]>([]);
const [searchQuery, setSearchQuery] = useState('');
const [filterCategory, setFilterCategory] = useState<FilterCategory>(FilterCategory.All);
const [selectedIndex, setSelectedIndex] = useState(0);
const [toastMessage, setToastMessage] = useState<string | null>(null);
```

### Store 设计（来自 architecture.md + KISS/YAGNI/DRY 优化）

```typescript
// src/stores/clipboardStore.ts
import { INITIAL_MOCK_DATA, STORAGE_KEY } from '../constants';

interface ClipboardStore {
  // State (默认值见下方实现)
  items: ClipboardItem[];           // 默认: INITIAL_MOCK_DATA
  selectedIndex: number;            // 默认: 0
  searchQuery: string;              // 默认: ''
  filterCategory: FilterCategory;   // 默认: FilterCategory.All
  isLoading: boolean;               // 默认: false
  toastMessage: string | null;      // 默认: null

  // Actions
  setItems: (items: ClipboardItem[]) => void;
  addItem: (item: ClipboardItem) => void;
  toggleStar: (id: string) => void;
  deleteItem: (id: string) => void;
  setSelectedIndex: (index: number) => void;
  setSearchQuery: (query: string) => void;      // ⚠️ 同时重置 selectedIndex = 0
  setFilterCategory: (category: FilterCategory) => void;  // ⚠️ 同时重置 selectedIndex = 0
  showToast: (message: string) => void;
  hideToast: () => void;
}
```

**Actions 实现要点：**
```typescript
// setSearchQuery 和 setFilterCategory 必须同时重置 selectedIndex
setSearchQuery: (query) => set({ searchQuery: query, selectedIndex: 0 }),
setFilterCategory: (category) => set({ filterCategory: category, selectedIndex: 0 }),
```

### filteredItems 派生状态

**两种实现方式：**

1. **Store 内计算（推荐）**：使用 Zustand 的 `subscribeWithSelector` 中间件
2. **组件内 useMemo**：保持当前模式，在 App.tsx 中使用 useMemo

**推荐方案**：保持 useMemo 在 App.tsx 中，原因：
- 简单直接，无需额外中间件
- 过滤逻辑与 UI 紧密相关
- 符合现有代码模式

### LocalStorage 持久化

当前实现（App.tsx:23-37, 51-55）：
- 初始化时从 localStorage 加载
- items 变化时保存到 localStorage

**迁移方案**：使用 Zustand `persist` 中间件

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INITIAL_MOCK_DATA, STORAGE_KEY } from '../constants';
import { ClipboardItem, FilterCategory } from '../types';

export const useClipboardStore = create<ClipboardStore>()(
  persist(
    (set) => ({
      // ⚠️ CRITICAL: 使用 INITIAL_MOCK_DATA 作为默认值
      items: INITIAL_MOCK_DATA,
      selectedIndex: 0,
      searchQuery: '',
      filterCategory: FilterCategory.All,
      isLoading: false,
      toastMessage: null,

      // Actions...
      setSearchQuery: (query) => set({ searchQuery: query, selectedIndex: 0 }),
      setFilterCategory: (category) => set({ filterCategory: category, selectedIndex: 0 }),
      // ... 其他 actions
    }),
    {
      // ⚠️ CRITICAL: 使用 STORAGE_KEY 常量，不要硬编码
      name: STORAGE_KEY,
      partialize: (state) => ({ items: state.items }), // 仅持久化 items
    }
  )
);
```

> **YAGNI 决策**：不添加 devtools 中间件（当前 store 足够简单，无调试需求）

### 不迁移到 Store 的内容

| 保留在组件 | 原因 |
|-----------|------|
| `scrollContainerRef` | DOM 引用，非共享状态 |
| `itemRefs` | DOM 引用数组 |
| blur 监听 useEffect | 窗口事件，与特定组件生命周期绑定 |
| 滚动同步 useEffect | 需要 DOM 操作 |

### 需要移除的代码

| 移除项 | 原因 |
|--------|------|
| "重置选中" useEffect (App.tsx:79-82) | 逻辑已移至 store 的 `setSearchQuery` 和 `setFilterCategory` actions |
| localStorage 初始化 useEffect (App.tsx:23-37) | 由 persist 中间件自动处理 |
| localStorage 保存 useEffect (App.tsx:51-55) | 由 persist 中间件自动处理 |

---

## Project Structure Notes

### 新建文件

```
src/
└── stores/
    ├── clipboardStore.ts       # Zustand store 定义
    └── clipboardStore.test.ts  # 单元测试
```

### 修改文件

| 文件 | 变更 |
|------|------|
| `src/App.tsx` | 移除 useState，使用 useClipboardStore |
| `src/components/SearchBar.tsx` | 可选：直接使用 store |
| `src/components/FilterBar.tsx` | 可选：直接使用 store |

### 命名约定

- Store 文件：`camelCase.ts` → `clipboardStore.ts`
- Hook 导出：`useClipboardStore`
- Actions：`camelCase` → `setItems`, `toggleStar`

---

## Architecture Compliance

### 技术栈确认

| 技术 | 版本 | 状态 |
|------|------|------|
| Zustand | latest | 需安装 |
| React | 19.0.0 | ✅ 已安装 |
| TypeScript | 5.7.2 | ✅ 已安装 |

### 架构决策遵循

- [x] 使用 Zustand 替代 useState（architecture.md#State-Management）
- [x] Store 位置：`src/stores/` 目录
- [x] Actions 命名：camelCase（setItems, toggleStar）
- [x] 类型定义：使用现有 `types.ts` 中的类型

---

## Previous Story Intelligence

### 来自 Story 1.1-1.3 的关键学习

| 学习点 | 应用于本 Story |
|--------|----------------|
| 前端 blur 事件方案 | 保持现有实现，不迁移到 store |
| invoke 调用模式 | handleCopy 中的 invoke('hide_panel') 保持不变 |
| 组件结构稳定 | SearchBar, FilterBar, ClipboardCard 接口保持稳定 |

### 代码模式参考

```typescript
// 现有的 invoke 调用模式 (App.tsx:43, 109, 129)
invoke('hide_panel').catch(console.error);
```

---

## Testing Requirements

### 单元测试

**文件**: `src/stores/clipboardStore.test.ts`

```typescript
describe('clipboardStore', () => {
  // 初始化测试
  it('should initialize with INITIAL_MOCK_DATA', () => {});

  // Items 操作
  it('should add item to the beginning', () => {});
  it('should toggle star status', () => {});

  // 搜索/过滤 + 重置选中（CRITICAL）
  it('should update search query and reset selectedIndex to 0', () => {});
  it('should update filter category and reset selectedIndex to 0', () => {});

  // 选中索引
  it('should update selectedIndex', () => {});

  // Toast
  it('should show and hide toast', () => {});
});
```

> **测试重点**：验证 `setSearchQuery` 和 `setFilterCategory` 同时重置 `selectedIndex`

### 集成测试验证点

- [x] 搜索输入同步更新过滤结果
- [x] 过滤按钮切换正确过滤
- [x] 收藏状态持久化到 localStorage
- [x] 键盘导航正常工作

---

## KISS/YAGNI/DRY 决策记录

| 决策项 | 原则 | 决策 | 理由 |
|--------|------|------|------|
| 使用 `INITIAL_MOCK_DATA` 默认值 | YAGNI ✅ | **接受** | Epic 1 Demo App 当前需求 |
| 使用 `STORAGE_KEY` 常量 | DRY ✅ | **接受** | 避免硬编码重复 |
| Actions 内重置 selectedIndex | KISS ✅ | **接受** | 减少组件 useEffect |
| 封装 promoteItemToTop | YAGNI ⚠️ | **拒绝** | Epic 2 将替换此逻辑 |
| 添加 devtools 中间件 | KISS ❌ | **拒绝** | 增加复杂度，当前无调试需求 |

---

## References

- [Source: architecture.md#State-Management] Zustand 架构决策
- [Source: architecture.md#Implementation-Patterns] 命名约定和代码模式
- [Source: types.ts] ClipboardItem, FilterCategory 类型定义
- [Source: App.tsx:13-17] 当前状态定义
- [Source: constants.ts:76] STORAGE_KEY 常量定义
- [Source: devlog-story-1.1-1.3.md] 前置 Story 实现细节

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

1. **Task 1**: 安装 Zustand ^5.0.9 完成
2. **Task 2**: 创建 clipboardStore 完成
   - 实现了完整的 ClipboardStore interface
   - 使用 persist 中间件实现 localStorage 持久化
   - 12 个单元测试全部通过
   - 关键：setSearchQuery 和 setFilterCategory 同时重置 selectedIndex
3. **Task 3**: 迁移 App.tsx 状态完成
   - 移除了 5 个 useState 声明
   - 移除了 3 个相关的 useEffect（localStorage 加载/保存 + 重置选中）
   - 保留了 DOM refs 和必要的 useEffect
4. **Task 4**: 更新子组件完成
   - SearchBar: 直接从 store 获取 query/setQuery
   - FilterBar: 直接从 store 获取 filter/setFilter，保留 resultCount props
   - ClipboardCard: 保持 props 不变
5. **Task 5**: 验证完成
   - TypeScript 类型检查通过
   - 29 个单元测试全部通过
   - 前端构建成功

### File List

**新建文件：**
- `src/stores/clipboardStore.ts` - Zustand store 定义
- `src/stores/clipboardStore.test.ts` - 12 个单元测试

**修改文件：**
- `src/App.tsx` - 移除 useState，使用 useClipboardStore
- `src/components/SearchBar.tsx` - 直接从 store 获取状态
- `src/components/FilterBar.tsx` - 直接从 store 获取状态
- `package.json` - 添加 zustand 依赖

---

## Change Log

- 2025-12-26: Story 1.4 实现完成 - Zustand 状态管理迁移
  - 安装 Zustand ^5.0.9
  - 创建 clipboardStore with persist 中间件
  - 迁移 App.tsx 状态到 store
  - 更新 SearchBar 和 FilterBar 组件
  - 添加 12 个单元测试，全部通过
