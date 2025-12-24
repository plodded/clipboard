/**
 * Vitest 全局测试设置
 *
 * 此文件在每个测试文件之前执行，用于：
 * 1. 设置 jsdom 环境的 polyfills
 * 2. 配置 Tauri API mocks
 * 3. 清理测试状态
 */

import { afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// ============================================================
// WebCrypto Polyfill
// ============================================================
// jsdom 不提供 WebCrypto API，但 Tauri IPC 需要它生成请求 ID
// 使用 Node.js 的 crypto 模块填充

import { randomFillSync } from 'crypto'

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      getRandomValues: <T extends ArrayBufferView | null>(array: T): T => {
        if (array === null) return array
        randomFillSync(array as NodeJS.ArrayBufferView)
        return array
      },
      randomUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0
          const v = c === 'x' ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
      },
    },
    writable: true,
    configurable: true,
  })
})

// ============================================================
// Tauri 环境模拟
// ============================================================
// 模拟 Tauri 的全局对象，使 @tauri-apps/api 可以在测试环境中工作

beforeAll(() => {
  // 模拟 __TAURI_INTERNALS__ 对象
  ;(globalThis as Record<string, unknown>).__TAURI_INTERNALS__ = {
    invoke: vi.fn(),
    transformCallback: vi.fn((callback: () => void) => {
      const id = Math.random()
      ;(globalThis as Record<string, unknown>)[`_${id}`] = callback
      return id
    }),
    convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
    metadata: {
      currentWindow: { label: 'main' },
      currentWebview: { label: 'main' },
    },
  }

  // 模拟 window.__TAURI__ 用于检测 Tauri 环境
  ;(globalThis as Record<string, unknown>).__TAURI__ = {
    version: '2.0.0',
  }
})

// ============================================================
// 测试清理
// ============================================================

afterEach(() => {
  // 清理 React Testing Library 渲染的组件
  cleanup()

  // 重置所有 mock
  vi.clearAllMocks()
})

// ============================================================
// 全局 Mock 辅助函数
// ============================================================
// 这些函数可在测试中直接使用

/**
 * 模拟 Tauri invoke 命令的返回值
 *
 * @example
 * ```ts
 * mockTauriInvoke('get_clipboard_history', [
 *   { id: 1, content_type: 'text', text_content: 'Hello' }
 * ])
 * ```
 */
export function mockTauriInvoke<T>(command: string, returnValue: T): void {
  const internals = (globalThis as Record<string, unknown>).__TAURI_INTERNALS__ as {
    invoke: ReturnType<typeof vi.fn>
  }

  internals.invoke.mockImplementation(async (cmd: string) => {
    if (cmd === command) {
      return returnValue
    }
    throw new Error(`Unexpected Tauri command: ${cmd}`)
  })
}

/**
 * 模拟多个 Tauri invoke 命令
 *
 * @example
 * ```ts
 * mockTauriInvokeMultiple({
 *   'get_clipboard_history': [],
 *   'delete_clipboard_item': { success: true },
 * })
 * ```
 */
export function mockTauriInvokeMultiple(
  commands: Record<string, unknown>
): void {
  const internals = (globalThis as Record<string, unknown>).__TAURI_INTERNALS__ as {
    invoke: ReturnType<typeof vi.fn>
  }

  internals.invoke.mockImplementation(async (cmd: string) => {
    if (cmd in commands) {
      return commands[cmd]
    }
    throw new Error(`Unexpected Tauri command: ${cmd}`)
  })
}

/**
 * 获取 Tauri invoke 的 mock 实例，用于断言
 */
export function getTauriInvokeMock(): ReturnType<typeof vi.fn> {
  const internals = (globalThis as Record<string, unknown>).__TAURI_INTERNALS__ as {
    invoke: ReturnType<typeof vi.fn>
  }
  return internals.invoke
}
