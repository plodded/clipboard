# Story 2.1: 剪贴板监听与内容捕获

Status: ready-for-dev

---

## Story

**As a** MacPaste 用户,
**I want** 应用自动捕获我复制的所有内容,
**So that** 我的剪贴板历史被实时记录，无需手动操作。

---

## Acceptance Criteria

1. **Given** 应用在后台运行 **When** 用户在任意应用中复制纯文本内容 **Then** MacPaste 自动捕获该内容 **And** 新记录出现在历史列表顶部

2. **Given** 应用在后台运行 **When** 用户复制富文本内容（如从 Word 复制带格式文本）**Then** MacPaste 捕获 RTF 格式内容 **And** 显示纯文本预览

3. **Given** 应用在后台运行 **When** 用户复制图片（如截图或从网页复制图片）**Then** MacPaste 捕获图片内容 **And** 在历史列表中显示缩略图预览

4. **Given** 应用在后台运行 **When** 用户在 Finder 中复制文件 **Then** MacPaste 捕获文件引用 **And** 显示文件名和类型图标

5. **Given** 剪贴板监听正在运行 **When** 捕获到新内容 **Then** 自动记录来源应用名称和时间戳

6. **Given** 用户连续复制相同内容 **When** 剪贴板监听检测到重复内容 **Then** 不创建新记录，仅更新现有记录的时间戳

---

## Tasks / Subtasks

### Phase 1: 插件安装与基础配置

- [ ] Task 1: 安装 tauri-plugin-clipboard-x (AC: #1-#5)
  - [ ] 1.1 运行 `cargo add tauri-plugin-clipboard-x` 添加 Rust 依赖
  - [ ] 1.2 运行 `npm add tauri-plugin-clipboard-x-api` 添加前端 API
  - [ ] 1.3 在 `src-tauri/src/lib.rs` 中注册插件：`.plugin(tauri_plugin_clipboard_x::init())`
  - [ ] 1.4 配置 capabilities/default.json 添加 clipboard-x 权限
  - [ ] 1.5 验证 `npm run tauri dev` 启动无报错

- [ ] Task 1.5: **Spike - 验证插件 API** (AC: All) ⚠️ 关键
  - [ ] 1.5.1 查阅 [tauri-plugin-clipboard-x GitHub](https://github.com/AYangMing/tauri-plugin-clipboard-x) 确认 API 签名
  - [ ] 1.5.2 验证 `readImage()` 返回格式（Base64 字符串 或 Uint8Array）
  - [ ] 1.5.3 验证 `readFiles()` 返回格式（路径数组格式）
  - [ ] 1.5.4 确认是否支持获取来源应用名称（`getSourceApp()` 或类似 API）
  - [ ] 1.5.5 验证 HTML 内容读取 API（`readHtml()` 是否可用）
  - [ ] 1.5.6 记录 API 发现到 Dev Notes，更新代码示例

### Phase 2: 剪贴板监听服务

- [ ] Task 2: 创建 ClipboardService (AC: #1, #5)
  - [ ] 2.1 创建 `src/services/clipboard.ts`
  - [ ] 2.2 实现 `startClipboardListening()` 函数
  - [ ] 2.3 实现 `stopClipboardListening()` 函数
  - [ ] 2.4 实现 `onClipboardChange` 事件处理
  - [ ] 2.5 添加单元测试 `src/services/clipboard.test.ts`

- [ ] Task 3: 集成到应用生命周期 (AC: #1)
  - [ ] 3.1 在 `App.tsx` 或 `main.tsx` 中启动监听
  - [ ] 3.2 在应用卸载时停止监听
  - [ ] 3.3 处理监听启动失败的错误情况

### Phase 3: 内容类型处理

- [ ] Task 4: 纯文本内容处理 (AC: #1)
  - [ ] 4.1 捕获文本内容并提取 `text_content`
  - [ ] 4.2 生成 `preview_text`（截取前 100 字符）
  - [ ] 4.3 调用 `clipboardStore.addItem()` 添加到 Store
  - [ ] 4.4 添加集成测试验证文本捕获

- [ ] Task 5: RTF 内容处理 (AC: #2)
  - [ ] 5.1 检测 RTF 内容类型
  - [ ] 5.2 提取纯文本预览（stripHtml 或类似处理）
  - [ ] 5.3 保存原始 RTF 数据用于后续粘贴
  - [ ] 5.4 添加集成测试验证 RTF 捕获

- [ ] Task 6: 图片内容处理 (AC: #3)
  - [ ] 6.1 检测图片类型（PNG, JPEG, GIF, WebP）
  - [ ] 6.2 提取图片数据（Base64 或 Blob）
  - [ ] 6.3 **注意**: 图片存储逻辑在 Story 2.3 实现，此处仅捕获
  - [ ] 6.4 临时方案：将图片数据存储在内存（Store）中
  - [ ] 6.5 添加集成测试验证图片捕获

- [ ] Task 7: 文件引用处理 (AC: #4)
  - [ ] 7.1 检测文件引用类型
  - [ ] 7.2 提取文件路径列表
  - [ ] 7.3 生成文件名预览（多文件时显示"N 个文件"）
  - [ ] 7.4 添加集成测试验证文件捕获

### Phase 4: 元数据与去重

- [ ] Task 8: 来源应用与时间戳 (AC: #5)
  - [ ] 8.1 获取当前活跃应用名称（tauri-plugin-clipboard-x 可能支持）
  - [ ] 8.2 如不支持，使用占位符 "Unknown App"
  - [ ] 8.3 生成 Unix 时间戳
  - [ ] 8.4 添加单元测试验证元数据

- [ ] Task 9: 内容去重逻辑 (AC: #6)
  - [ ] 9.1 实现内容哈希计算（SHA-256 或简单字符串比较）
  - [ ] 9.2 检查 Store 中是否已存在相同内容
  - [ ] 9.3 重复时更新 timestamp，不创建新记录
  - [ ] 9.4 添加单元测试验证去重逻辑

### Phase 5: 错误处理与健壮性

- [ ] Task 10: 错误处理与重试 (AC: All, Risk R-001)
  - [ ] 10.1 实现监听断开重试机制（指数退避：1s → 2s → 4s → 8s → 16s，最大 5 次）
  - [ ] 10.2 超过重试次数后显示 Toast 通知用户
  - [ ] 10.3 记录错误日志到 tauri-plugin-log
  - [ ] 10.4 添加健康检查机制（可选）

### Phase 6: 验证与测试

- [ ] Task 11: 单元测试完善 (AC: All)
  - [ ] 11.1 clipboardService 单元测试
  - [ ] 11.2 内容类型检测测试
  - [ ] 11.3 去重逻辑测试
  - [ ] 11.4 确保所有测试通过

- [ ] Task 12: 集成测试 (AC: All)
  - [ ] 12.1 使用 mockIPC 测试剪贴板事件处理
  - [ ] 12.2 测试各内容类型的完整流程
  - [ ] 12.3 测试 Store 状态更新

- [ ] Task 13: 手动验收测试 (AC: All)
  - [ ] 13.1 复制纯文本，验证自动捕获
  - [ ] 13.2 复制带格式文本（从 Word 或网页），验证 RTF 处理
  - [ ] 13.3 截图或复制图片，验证图片捕获
  - [ ] 13.4 在 Finder 中复制文件，验证文件引用
  - [ ] 13.5 连续复制相同内容，验证去重

---

## Dev Notes

### 插件 API 参考

**tauri-plugin-clipboard-x 关键 API：**

```typescript
// src/services/clipboard.ts
import {
  startListening,
  stopListening,
  onClipboardChange,
  readText,
  readHtml,
  readRtf,
  readImage,
  readFiles
} from 'tauri-plugin-clipboard-x-api';

// 启动监听
export async function startClipboardListening() {
  await startListening();

  // 监听剪贴板变化事件
  const unlisten = await onClipboardChange(async () => {
    // 读取剪贴板内容
    const text = await readText();
    const html = await readHtml();
    const rtf = await readRtf();
    const image = await readImage(); // Base64
    const files = await readFiles(); // 文件路径数组

    // 处理内容...
  });

  return unlisten;
}
```

> **⚠️ 重要**: 需要验证 API 实际签名，以上为预期用法。

### 内容类型判断策略

按优先级顺序检测内容类型：

1. **Image**: `readImage()` 返回非空 → ClipboardType.Image
2. **Files**: `readFiles()` 返回非空数组 → ClipboardType.File
3. **HTML**: `readHtml()` 返回非空 → ClipboardType.Text (带 HTML 元数据，提取纯文本预览)
4. **RTF**: `readRtf()` 返回非空 → ClipboardType.Text (带 RTF 元数据，提取纯文本预览)
5. **Text**: `readText()` 返回非空 → ClipboardType.Text
6. **Unknown**: 以上都为空 → 忽略，不创建记录

> **HTML vs RTF 处理**: 两者都保存原始内容用于后续粘贴，但 UI 显示纯文本预览。使用现有 `stripHtml()` 工具函数处理 HTML。

### 图片临时显示方案 (Story 2.1 范围)

由于图片文件持久化在 Story 2.3 实现，本 Story 采用临时方案：

| 方面 | 处理方式 |
|------|----------|
| **存储位置** | 图片数据以 Base64 存储在 Zustand Store (内存) |
| **UI 渲染** | 直接使用 `data:image/png;base64,{data}` 渲染缩略图 |
| **已知限制** | 应用重启后图片丢失（预期行为，Story 2.3 解决） |
| **大图片风险** | 4K 截图 (10MB+) 可能导致内存占用过高，建议限制 Base64 长度 |

```typescript
// 临时方案示例
const imageItem: ClipboardItem = {
  id: generateId(),
  type: ClipboardType.Image,
  content: `data:image/png;base64,${base64Data}`, // 直接用于 <img src>
  preview_text: '图片',
  timestamp: Date.now(),
  // ...
};
```

### 去重策略详解 (AC #6)

| 内容类型 | 去重方式 | 说明 |
|----------|----------|------|
| **Text** | 内容字符串完全匹配 | `item.content === newContent` |
| **HTML/RTF** | 纯文本预览匹配 | 比较 `preview_text`，忽略格式差异 |
| **Image** | 内容哈希比较 | SHA-256 或 MD5 哈希（如 Base64 过长） |
| **File** | 文件路径完全匹配 | 比较路径数组 JSON 字符串 |

```typescript
// 去重检查示例
function isDuplicate(newItem: ClipboardItem, existingItems: ClipboardItem[]): string | null {
  for (const item of existingItems) {
    if (item.type !== newItem.type) continue;

    switch (newItem.type) {
      case ClipboardType.Text:
        if (item.content === newItem.content) return item.id;
        break;
      case ClipboardType.Image:
        // 比较哈希或截断的 Base64
        if (item.content.slice(0, 1000) === newItem.content.slice(0, 1000)) return item.id;
        break;
      case ClipboardType.File:
        if (item.content === newItem.content) return item.id;
        break;
    }
  }
  return null; // 非重复
}
```

### 数据结构 (来自 types.ts)

```typescript
interface ClipboardItem {
  id: string;
  type: ClipboardType;
  content: string;           // 文本内容 或 图片 Base64 或 文件路径
  preview_text?: string;     // 预览文本（截取前 100 字符）
  timestamp: number;         // Unix 时间戳
  is_starred: boolean;       // 是否收藏
  app_name?: string;         // 来源应用
  metadata?: string;         // 扩展元数据（JSON 字符串）
}
```

### 与 Store 集成

使用 Epic 1 已实现的 Zustand Store：

```typescript
import { useClipboardStore } from '@/stores/clipboardStore';

// 添加新内容
const { addItem, items } = useClipboardStore.getState();

// 去重检查
const isDuplicate = items.some(item =>
  item.content === newContent && item.type === newType
);

if (isDuplicate) {
  // 更新 timestamp
} else {
  addItem(newItem);
}
```

### Store 调整需求 ⚠️

当前 `clipboardStore` 可能需要以下调整以支持去重更新：

| 新增/修改 | 说明 |
|-----------|------|
| `updateItemTimestamp(id: string)` | 更新已存在记录的时间戳，并将其移至列表顶部 |
| `findDuplicateId(content, type)` | 检查是否存在重复内容，返回 id 或 null |

**实现示例：**

```typescript
// clipboardStore.ts 新增 action
updateItemTimestamp: (id: string) => set((state) => {
  const index = state.items.findIndex(item => item.id === id);
  if (index === -1) return state;

  const updatedItem = {
    ...state.items[index],
    timestamp: Date.now(),
  };

  // 移除旧位置，添加到顶部
  const newItems = [
    updatedItem,
    ...state.items.slice(0, index),
    ...state.items.slice(index + 1),
  ];

  return { items: newItems };
}),
```

> **决策点**: Dev Agent 可选择在 Store 中实现，或在 clipboard service 中处理逻辑。

### 错误处理策略 (Risk R-001)

```typescript
const MAX_RETRIES = 5;
const INITIAL_DELAY = 1000; // 1s

async function startWithRetry(attempt = 0): Promise<void> {
  try {
    await startListening();
    console.log('Clipboard listening started');
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      const delay = INITIAL_DELAY * Math.pow(2, attempt); // 指数退避
      console.warn(`Retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      return startWithRetry(attempt + 1);
    }
    // 超过重试次数，通知用户
    showToast('剪贴板监听启动失败，请重启应用');
    throw error;
  }
}
```

---

## Project Structure Notes

### 新建文件

```
src/
└── services/
    ├── clipboard.ts           # 剪贴板监听服务
    └── clipboard.test.ts      # 单元测试

tests/
└── integration/
    └── clipboard-capture.test.ts  # 集成测试
```

### 修改文件

| 文件 | 变更 |
|------|------|
| `src-tauri/Cargo.toml` | 添加 tauri-plugin-clipboard-x 依赖 |
| `src-tauri/src/lib.rs` | 注册 clipboard-x 插件 |
| `src-tauri/capabilities/default.json` | 添加 clipboard-x 权限 |
| `package.json` | 添加 tauri-plugin-clipboard-x-api 依赖 |
| `src/App.tsx` 或 `src/main.tsx` | 启动剪贴板监听 |
| `src/stores/clipboardStore.ts` | 可能需要调整 addItem 逻辑 |

### 命名约定

| 元素 | 模式 | 示例 |
|------|------|------|
| 服务文件 | camelCase.ts | `clipboard.ts` |
| 服务函数 | camelCase | `startClipboardListening()` |
| 事件处理 | handleXxx | `handleClipboardChange()` |
| 测试文件 | *.test.ts | `clipboard.test.ts` |

---

## Architecture Compliance

### 技术栈确认

| 技术 | 版本 | 状态 |
|------|------|------|
| tauri-plugin-clipboard-x | latest | 需安装 |
| tauri-plugin-clipboard-x-api | latest | 需安装 |
| Zustand | ^5.0.9 | ✅ 已安装 (Epic 1) |
| tauri-plugin-log | - | ✅ 已安装 (Epic 1) |

### 架构决策遵循

- [x] 使用 tauri-plugin-clipboard-x 进行剪贴板监听（architecture.md#Clipboard-Monitoring）
- [x] 前端调用 startListening() 启动监听（architecture.md）
- [x] 使用 Zustand Store 管理状态（architecture.md#State-Management）
- [x] 错误处理使用 try-catch + Toast（architecture.md#Error-Handling）
- [x] 日志使用 tauri-plugin-log（architecture.md#Logging）

---

## Previous Story Intelligence

### 来自 Epic 1 的关键学习

| 学习点 | 应用于本 Story |
|--------|----------------|
| TDD 方法论 | 先写测试再写代码 |
| mockIPC 模式有效 | 使用 mockIPCCommands 测试剪贴板事件 |
| KISS/YAGNI/DRY 原则 | 最小化实现，避免过度设计 |
| data-testid 选择器 | E2E 测试使用 data-testid |

### 来自 Epic 1 Retro 的行动项

| 行动项 | 状态 | 备注 |
|--------|------|------|
| 采用 TDD | ✅ 应用 | 本 Story 先写测试 |
| mockIPC 模板 | ⏳ 进行中 | 需要创建 clipboard mock |

### 代码模式参考

```typescript
// Epic 1 中的 invoke 调用模式
import { invoke } from '@tauri-apps/api/core';
invoke('hide_panel').catch(console.error);

// Epic 1 中的 Toast 显示模式
const { showToast } = useClipboardStore.getState();
showToast('操作成功');
```

---

## Testing Requirements

### 单元测试

**文件**: `src/services/clipboard.test.ts`

```typescript
describe('ClipboardService', () => {
  // 启动/停止测试
  it('should start clipboard listening', async () => {});
  it('should stop clipboard listening', async () => {});

  // 内容类型检测
  it('should detect text content type', () => {});
  it('should detect RTF content type', () => {});
  it('should detect image content type', () => {});
  it('should detect file content type', () => {});

  // 去重逻辑
  it('should detect duplicate text content', () => {});
  it('should update timestamp for duplicate', () => {});

  // 错误处理
  it('should retry on connection failure', async () => {});
  it('should show toast after max retries', async () => {});
});
```

### 集成测试

**文件**: `tests/integration/clipboard-capture.test.ts`

```typescript
describe('Clipboard Capture Integration', () => {
  // P0 测试
  it('should capture plain text and add to store', async () => {});
  it('should prepend new item to list', async () => {});

  // P1 测试
  it('should capture RTF with text preview', async () => {});
  it('should capture image content', async () => {});
  it('should capture file references', async () => {});
  it('should record app name and timestamp', async () => {});
  it('should not create duplicate for same content', async () => {});
});
```

### 手动验收清单

- [ ] 复制纯文本，新记录出现在列表顶部
- [ ] 复制带格式文本，显示纯文本预览
- [ ] 截图后，MacPaste 捕获图片
- [ ] Finder 复制文件，显示文件名
- [ ] 连续复制相同内容，不产生重复记录

---

## Risk Mitigation Checklist

| Risk ID | 描述 | 缓解措施 | 状态 |
|---------|------|----------|------|
| R-001 | 剪贴板内容丢失 | 指数退避重试 + 错误日志 + Toast 通知 | ⏳ Task 10 |
| R-005 | 插件兼容性 | 充分测试边界情况，记录不支持的类型 | ⏳ Task 4-7 |
| R-008 | 去重误判 | SHA-256 + 内容长度双重校验 | ⏳ Task 9 |

---

## KISS/YAGNI/DRY 决策记录

| 决策项 | 原则 | 决策 | 理由 |
|--------|------|------|------|
| 来源应用检测 | YAGNI | 先用占位符 | 如插件不支持则跳过 |
| 图片本地存储 | YAGNI | 本 Story 不实现 | Story 2.3 实现 |
| 复杂去重算法 | KISS | 简单字符串比较 | MVP 足够，后续优化 |
| 后台服务架构 | KISS | 直接在前端调用 | 无需复杂后台服务 |

---

## References

- [Source: architecture.md#Clipboard-Monitoring] tauri-plugin-clipboard-x 集成
- [Source: architecture.md#State-Management] Zustand Store 设计
- [Source: architecture.md#Error-Handling] 错误处理模式
- [Source: epics.md#Story-2.1] Story 详细需求
- [Source: test-design-epic-2.md#Story-2.1] 测试场景设计
- [Source: epic-1-retro-2025-12-27.md] Epic 1 回顾学习点

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

- 2025-12-27: Story 审查更新 - 应用 SM 审查建议
  - 新增 Task 1.5: Spike 验证插件 API
  - 新增图片临时显示方案说明
  - 新增去重策略详解（按内容类型）
  - 新增 Store 调整需求（updateItemTimestamp action）
  - 补充 HTML 内容处理策略
- 2025-12-27: Story 创建 - 由 BMAD SM Agent 自动生成
