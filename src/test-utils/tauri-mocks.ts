/**
 * Tauri API Mock 工具
 *
 * 提供 @tauri-apps/api/mocks 的增强封装，
 * 使测试更简洁和类型安全。
 *
 * @see https://v2.tauri.app/develop/tests/mocking/
 */

import { vi } from 'vitest'

// ============================================================
// 类型定义
// ============================================================

/**
 * IPC 命令处理器类型
 */
export type IPCHandler = (
  cmd: string,
  args: Record<string, unknown>
) => unknown | Promise<unknown>

/**
 * 事件监听器类型
 */
export type EventHandler = (payload: unknown) => void

// ============================================================
// Mock IPC
// ============================================================

/**
 * 设置 IPC 命令的 mock 响应
 *
 * @example
 * ```ts
 * // 单个命令
 * setupMockIPC((cmd, args) => {
 *   if (cmd === 'get_clipboard_history') {
 *     return [{ id: 1, text_content: 'Hello' }]
 *   }
 * })
 *
 * // 使用 mockIPCCommands 更简洁
 * mockIPCCommands({
 *   get_clipboard_history: [{ id: 1, text_content: 'Hello' }],
 *   delete_clipboard_item: { success: true },
 * })
 * ```
 */
export function setupMockIPC(handler: IPCHandler): void {
  const internals = (globalThis as Record<string, unknown>)
    .__TAURI_INTERNALS__ as {
    invoke: ReturnType<typeof vi.fn>
  }

  if (!internals) {
    throw new Error(
      'Tauri internals not found. Make sure setup.ts is loaded before tests.'
    )
  }

  internals.invoke.mockImplementation(
    async (cmd: string, args?: Record<string, unknown>) => {
      return handler(cmd, args ?? {})
    }
  )
}

/**
 * 便捷方法：使用对象映射设置多个命令的响应
 *
 * @example
 * ```ts
 * mockIPCCommands({
 *   get_clipboard_history: [],
 *   get_settings: { theme: 'dark', hotkey: 'Cmd+Shift+V' },
 *   save_settings: { success: true },
 * })
 * ```
 */
export function mockIPCCommands(
  commands: Record<string, unknown>
): void {
  setupMockIPC((cmd) => {
    if (cmd in commands) {
      const result = commands[cmd]
      // 支持函数返回值 (动态响应)
      return typeof result === 'function' ? result() : result
    }
    throw new Error(`Unexpected Tauri IPC command: ${cmd}`)
  })
}

/**
 * 模拟 IPC 命令抛出错误
 *
 * @example
 * ```ts
 * mockIPCError('save_clipboard_item', 'Database is locked')
 *
 * // 然后在测试中验证错误处理
 * await expect(saveItem()).rejects.toThrow('Database is locked')
 * ```
 */
export function mockIPCError(command: string, errorMessage: string): void {
  setupMockIPC((cmd) => {
    if (cmd === command) {
      throw new Error(errorMessage)
    }
    throw new Error(`Unexpected Tauri IPC command: ${cmd}`)
  })
}

// ============================================================
// Mock Events
// ============================================================

const eventListeners: Map<string, Set<EventHandler>> = new Map()

/**
 * 设置事件监听 mock
 *
 * @example
 * ```ts
 * // 在测试中模拟接收事件
 * emitMockEvent('clipboard-changed', { id: 1, content: 'New item' })
 * ```
 */
export function setupMockEvents(): void {
  const internals = (globalThis as Record<string, unknown>)
    .__TAURI_INTERNALS__ as Record<string, unknown>

  // Mock listen 函数
  internals.listen = vi.fn(
    async (event: string, handler: EventHandler): Promise<() => void> => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set())
      }
      eventListeners.get(event)!.add(handler)

      // 返回 unlisten 函数
      return () => {
        eventListeners.get(event)?.delete(handler)
      }
    }
  )

  // Mock emit 函数
  internals.emit = vi.fn(async (event: string, payload?: unknown) => {
    const handlers = eventListeners.get(event)
    if (handlers) {
      handlers.forEach((handler) => handler(payload))
    }
  })
}

/**
 * 触发 mock 事件
 *
 * @example
 * ```ts
 * emitMockEvent('clipboard-changed', {
 *   id: 1,
 *   content_type: 'text',
 *   text_content: 'Hello World',
 * })
 * ```
 */
export function emitMockEvent(event: string, payload?: unknown): void {
  const handlers = eventListeners.get(event)
  if (handlers) {
    handlers.forEach((handler) =>
      handler({
        event,
        payload,
        id: Math.random(),
      })
    )
  }
}

/**
 * 清除所有事件监听器
 */
export function clearMockEvents(): void {
  eventListeners.clear()
}

// ============================================================
// Mock Window
// ============================================================

/**
 * 模拟 Tauri 窗口
 *
 * @example
 * ```ts
 * mockWindow('main', { width: 800, height: 600 })
 * ```
 */
export function mockWindow(
  label: string,
  properties?: {
    width?: number
    height?: number
    x?: number
    y?: number
    isVisible?: boolean
    isFocused?: boolean
  }
): void {
  const internals = (globalThis as Record<string, unknown>)
    .__TAURI_INTERNALS__ as Record<string, unknown>

  const defaultProps = {
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    isVisible: true,
    isFocused: true,
    ...properties,
  }

  internals.metadata = {
    currentWindow: { label, ...defaultProps },
    currentWebview: { label },
  }

  // Mock window-related IPC commands
  const originalInvoke = internals.invoke as (
    cmd: string,
    args?: Record<string, unknown>
  ) => Promise<unknown>
  internals.invoke = vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
    switch (cmd) {
      case 'plugin:window|inner_size':
        return { width: defaultProps.width, height: defaultProps.height }
      case 'plugin:window|outer_position':
        return { x: defaultProps.x, y: defaultProps.y }
      case 'plugin:window|is_visible':
        return defaultProps.isVisible
      case 'plugin:window|is_focused':
        return defaultProps.isFocused
      default:
        if (originalInvoke) {
          return originalInvoke(cmd, args)
        }
        throw new Error(`Unknown window command: ${cmd}`)
    }
  })
}

// ============================================================
// 断言辅助
// ============================================================

/**
 * 获取 invoke mock 用于断言
 *
 * @example
 * ```ts
 * const invoke = getInvokeMock()
 * await doSomething()
 * expect(invoke).toHaveBeenCalledWith('save_settings', { theme: 'dark' })
 * ```
 */
export function getInvokeMock(): ReturnType<typeof vi.fn> {
  const internals = (globalThis as Record<string, unknown>)
    .__TAURI_INTERNALS__ as {
    invoke: ReturnType<typeof vi.fn>
  }
  return internals.invoke
}

/**
 * 验证是否调用了特定的 IPC 命令
 *
 * @example
 * ```ts
 * await saveSettings({ theme: 'dark' })
 * expectInvokedWith('save_settings', { theme: 'dark' })
 * ```
 */
export function expectInvokedWith(
  command: string,
  args?: Record<string, unknown>
): void {
  const invoke = getInvokeMock()
  if (args) {
    expect(invoke).toHaveBeenCalledWith(command, args)
  } else {
    expect(invoke).toHaveBeenCalledWith(command, expect.anything())
  }
}

/**
 * 验证 IPC 命令未被调用
 */
export function expectNotInvoked(command: string): void {
  const invoke = getInvokeMock()
  const calls = (invoke.mock.calls as unknown[][]).filter(
    (call) => call[0] === command
  )
  expect(calls).toHaveLength(0)
}
