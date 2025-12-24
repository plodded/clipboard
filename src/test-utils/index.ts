/**
 * 测试工具导出
 *
 * 统一导出所有测试工具，简化导入。
 *
 * @example
 * ```ts
 * import { render, mockIPCCommands, createClipboardItem } from '@/test-utils'
 * ```
 */

// React Testing Library 包装
export * from './render'

// Tauri Mock 工具
export * from './tauri-mocks'

// 数据工厂 (从 tests/support 重新导出)
export {
  createClipboardItem,
  createClipboardItems,
  ClipboardFactory,
  type ClipboardItem,
  type ClipboardContentType,
} from '../../tests/support/fixtures/factories/clipboard-factory'
