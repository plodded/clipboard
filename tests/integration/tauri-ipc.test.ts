/**
 * Tauri IPC 集成测试
 *
 * 展示如何测试前端与 Tauri 后端的 IPC 通信。
 * 使用 mockIPC 模拟后端响应。
 */

import { describe, it, expect } from 'vitest'
import {
  mockIPCCommands,
  mockIPCError,
  getInvokeMock,
} from '@/test-utils/tauri-mocks'
import {
  createClipboardItem,
  createClipboardItems,
} from '../support/fixtures/factories/clipboard-factory'

// 模拟 Tauri invoke API
// 注意：实际项目中这些函数会从 store 或 service 中导入
async function getClipboardHistory(): Promise<unknown[]> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('get_clipboard_history')
}

async function deleteClipboardItem(id: number): Promise<{ success: boolean }> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('delete_clipboard_item', { id })
}

async function saveSettings(settings: Record<string, unknown>): Promise<{ success: boolean }> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('save_settings', settings)
}

describe('Tauri IPC Integration', () => {
  describe('get_clipboard_history', () => {
    it('should return clipboard items', async () => {
      // Arrange: 设置 mock 数据
      const mockItems = createClipboardItems(3)
      mockIPCCommands({
        get_clipboard_history: mockItems,
      })

      // Act: 调用 IPC 命令
      const result = await getClipboardHistory()

      // Assert: 验证结果
      expect(result).toHaveLength(3)
      expect(result).toEqual(mockItems)
    })

    it('should return empty array when no items', async () => {
      mockIPCCommands({
        get_clipboard_history: [],
      })

      const result = await getClipboardHistory()
      expect(result).toEqual([])
    })

    it('should handle error gracefully', async () => {
      mockIPCError('get_clipboard_history', 'Database connection failed')

      await expect(getClipboardHistory()).rejects.toThrow(
        'Database connection failed'
      )
    })
  })

  describe('delete_clipboard_item', () => {
    it('should delete item and return success', async () => {
      mockIPCCommands({
        delete_clipboard_item: { success: true },
      })

      const result = await deleteClipboardItem(123)

      expect(result).toEqual({ success: true })
      // 验证 invoke 被调用，命令名正确
      const invoke = getInvokeMock()
      expect(invoke).toHaveBeenCalled()
      expect(invoke.mock.calls[0][0]).toBe('delete_clipboard_item')
    })

    it('should handle deletion failure', async () => {
      mockIPCCommands({
        delete_clipboard_item: { success: false },
      })

      const result = await deleteClipboardItem(999)
      expect(result.success).toBe(false)
    })
  })

  describe('save_settings', () => {
    it('should save settings correctly', async () => {
      mockIPCCommands({
        save_settings: { success: true },
      })

      const settings = {
        theme: 'dark',
        hotkey: 'Cmd+Shift+V',
        maxHistorySize: 100,
      }

      await saveSettings(settings)

      // 验证 invoke 被调用，参数正确
      const invoke = getInvokeMock()
      expect(invoke).toHaveBeenCalled()
      expect(invoke.mock.calls[0][0]).toBe('save_settings')
      expect(invoke.mock.calls[0][1]).toEqual(settings)
    })
  })
})

describe('Clipboard Data Factory', () => {
  it('should create text clipboard item', () => {
    const item = createClipboardItem({ content_type: 'text' })

    expect(item.content_type).toBe('text')
    expect(item.text_content).toBeTruthy()
    expect(item.image_path).toBeNull()
  })

  it('should create image clipboard item', () => {
    const item = createClipboardItem({ content_type: 'image' })

    expect(item.content_type).toBe('image')
    expect(item.image_path).toBeTruthy()
    expect(item.text_content).toBeNull()
  })

  it('should allow overriding properties', () => {
    const item = createClipboardItem({
      id: 999,
      is_pinned: true,
      text_content: 'Custom content',
    })

    expect(item.id).toBe(999)
    expect(item.is_pinned).toBe(true)
    expect(item.text_content).toBe('Custom content')
  })

  it('should create multiple items with sequential IDs', () => {
    const items = createClipboardItems(5)

    expect(items).toHaveLength(5)
    items.forEach((item, index) => {
      expect(item.id).toBe(index + 1)
    })
  })
})
