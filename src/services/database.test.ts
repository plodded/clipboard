/**
 * Story 2.2: SQLite 数据持久化 - 数据库服务单元测试
 *
 * 使用 vi.mock() 模拟 @tauri-apps/plugin-sql 模块
 * 测试 CRUD 操作、类型转换和错误处理
 *
 * Test IDs: 2.2-UNIT-DB-{SEQ}
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClipboardType } from '@/types';
import type { ClipboardItem } from '@/types';

// Mock functions - defined before vi.mock calls
const mockExecute = vi.fn();
const mockSelect = vi.fn();
const mockClose = vi.fn();
const mockLoad = vi.fn();

// Mock @tauri-apps/plugin-sql
vi.mock('@tauri-apps/plugin-sql', () => ({
  default: {
    load: (...args: unknown[]) => mockLoad(...args),
  },
}));

// Mock tauri-plugin-log
vi.mock('@tauri-apps/plugin-log', () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));

// Import after mocks are set up
import {
  initDatabase,
  getClipboardItems,
  saveClipboardItem,
  deleteClipboardItem,
  updateItemTimestamp,
  toDbItem,
  fromDbItem,
  resetDatabase,
} from './database';
import type { DbClipboardItem } from './database';

describe('Story 2.2: Database Service Unit Tests', () => {
  const mockDatabaseInstance = {
    execute: mockExecute,
    select: mockSelect,
    close: mockClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset database singleton for each test
    resetDatabase();
    // Set up default mock behavior
    mockLoad.mockResolvedValue(mockDatabaseInstance);
    mockExecute.mockResolvedValue({ rowsAffected: 1 });
    mockSelect.mockResolvedValue([]);
    mockClose.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // Database Initialization Tests
  // ========================================
  describe('[2.2-UNIT-DB-001] initDatabase', () => {
    it('should initialize database connection with correct path', async () => {
      const db = await initDatabase();

      expect(mockLoad).toHaveBeenCalledWith('sqlite:macpaste.db');
      expect(db).toBe(mockDatabaseInstance);
    });

    it('should return cached connection on subsequent calls', async () => {
      const db1 = await initDatabase();
      const db2 = await initDatabase();

      expect(mockLoad).toHaveBeenCalledTimes(1);
      expect(db1).toBe(db2);
    });

    it('should throw error when database connection fails', async () => {
      mockLoad.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(initDatabase()).rejects.toThrow('Failed to initialize database');
    });
  });

  // ========================================
  // CRUD Operations Tests
  // ========================================
  describe('[2.2-UNIT-DB-002] getClipboardItems', () => {
    const mockDbItems: DbClipboardItem[] = [
      {
        id: 'item-1',
        type: 'Text',
        content: 'Hello World',
        preview_text: 'Hello World',
        timestamp: 1703750000000,
        is_starred: 0,
        app_name: 'VSCode',
        metadata: null,
      },
      {
        id: 'item-2',
        type: 'Image',
        content: '/path/to/image.png',
        preview_text: null,
        timestamp: 1703749000000,
        is_starred: 1,
        app_name: null,
        metadata: '{"width":100,"height":100}',
      },
    ];

    it('should fetch clipboard items with default pagination', async () => {
      mockSelect.mockResolvedValueOnce(mockDbItems);

      const items = await getClipboardItems();

      expect(mockSelect).toHaveBeenCalledWith(
        'SELECT * FROM clipboard_items ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
        [100, 0]
      );
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe('item-1');
    });

    it('should fetch clipboard items with custom pagination', async () => {
      mockSelect.mockResolvedValueOnce([mockDbItems[0]]);

      const items = await getClipboardItems(50, 10);

      expect(mockSelect).toHaveBeenCalledWith(
        'SELECT * FROM clipboard_items ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
        [50, 10]
      );
      expect(items).toHaveLength(1);
    });

    it('should convert DbClipboardItem to ClipboardItem correctly', async () => {
      mockSelect.mockResolvedValueOnce(mockDbItems);

      const items = await getClipboardItems();

      // Check first item (text type)
      expect(items[0]).toEqual({
        id: 'item-1',
        type: ClipboardType.Text,
        content: 'Hello World',
        previewText: 'Hello World',
        timestamp: 1703750000000,
        isStarred: false,
        metadata: { appName: 'VSCode' },
      });

      // Check second item (image type with starred and metadata)
      expect(items[1]).toEqual({
        id: 'item-2',
        type: ClipboardType.Image,
        content: '/path/to/image.png',
        previewText: undefined,
        timestamp: 1703749000000,
        isStarred: true,
        metadata: { width: 100, height: 100 },
      });
    });

    it('should return empty array when no items found', async () => {
      mockSelect.mockResolvedValueOnce([]);

      const items = await getClipboardItems();

      expect(items).toEqual([]);
    });
  });

  describe('[2.2-UNIT-DB-003] saveClipboardItem', () => {
    const testItem: ClipboardItem = {
      id: 'test-id',
      type: ClipboardType.Text,
      content: 'Test content',
      previewText: 'Test content',
      timestamp: 1703750000000,
      isStarred: true,
      metadata: { appName: 'Safari' },
    };

    it('should save clipboard item with correct SQL and parameters', async () => {
      await saveClipboardItem(testItem);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO clipboard_items'),
        ['test-id', 'Text', 'Test content', 'Test content', 1703750000000, 1, 'Safari', null]
      );
    });

    it('should convert boolean isStarred to integer', async () => {
      const starredItem = { ...testItem, isStarred: true };
      const unstarredItem = { ...testItem, id: 'unstarred', isStarred: false };

      await saveClipboardItem(starredItem);
      await saveClipboardItem(unstarredItem);

      // First call should have is_starred = 1
      expect(mockExecute.mock.calls[0][1][5]).toBe(1);
      // Second call should have is_starred = 0
      expect(mockExecute.mock.calls[1][1][5]).toBe(0);
    });

    it('should handle undefined optional fields', async () => {
      const minimalItem: ClipboardItem = {
        id: 'minimal-id',
        type: ClipboardType.Text,
        content: 'Content',
        timestamp: 1703750000000,
        isStarred: false,
      };

      await saveClipboardItem(minimalItem);

      const params = mockExecute.mock.calls[0][1];
      expect(params[3]).toBeNull(); // preview_text
      expect(params[6]).toBeNull(); // app_name
      expect(params[7]).toBeNull(); // metadata
    });

    it('should serialize metadata without appName', async () => {
      const itemWithMetadata: ClipboardItem = {
        id: 'meta-id',
        type: ClipboardType.Image,
        content: '/path/to/image.png',
        timestamp: 1703750000000,
        isStarred: false,
        metadata: {
          appName: 'Preview',
          width: 800,
          height: 600,
          dimensions: '800x600',
        },
      };

      await saveClipboardItem(itemWithMetadata);

      const params = mockExecute.mock.calls[0][1];
      expect(params[6]).toBe('Preview'); // app_name extracted
      expect(JSON.parse(params[7])).toEqual({
        width: 800,
        height: 600,
        dimensions: '800x600',
      }); // metadata without appName
    });
  });

  describe('[2.2-UNIT-DB-004] deleteClipboardItem', () => {
    it('should delete item by id', async () => {
      await deleteClipboardItem('item-to-delete');

      expect(mockExecute).toHaveBeenCalledWith(
        'DELETE FROM clipboard_items WHERE id = $1',
        ['item-to-delete']
      );
    });
  });

  describe('[2.2-UNIT-DB-005] updateItemTimestamp', () => {
    it('should update timestamp for given item id', async () => {
      const mockNow = 1703800000000;
      vi.spyOn(Date, 'now').mockReturnValue(mockNow);

      await updateItemTimestamp('item-id');

      expect(mockExecute).toHaveBeenCalledWith(
        'UPDATE clipboard_items SET timestamp = $1 WHERE id = $2',
        [mockNow, 'item-id']
      );

      vi.spyOn(Date, 'now').mockRestore();
    });
  });

  // ========================================
  // Type Conversion Tests
  // ========================================
  describe('[2.2-UNIT-DB-006] toDbItem', () => {
    it('should convert ClipboardItem to DbClipboardItem', () => {
      const item: ClipboardItem = {
        id: 'test-id',
        type: ClipboardType.RTF,
        content: 'RTF content',
        previewText: 'Hello',
        timestamp: 1703750000000,
        isStarred: true,
        metadata: { appName: 'Chrome', dimensions: '100x100' },
      };

      const dbItem = toDbItem(item);

      expect(dbItem).toEqual({
        id: 'test-id',
        type: 'RTF',
        content: 'RTF content',
        preview_text: 'Hello',
        timestamp: 1703750000000,
        is_starred: 1,
        app_name: 'Chrome',
        metadata: '{"dimensions":"100x100"}',
      });
    });

    it('should convert undefined optional fields to null', () => {
      const item: ClipboardItem = {
        id: 'test-id',
        type: ClipboardType.Text,
        content: 'content',
        timestamp: 1703750000000,
        isStarred: false,
      };

      const dbItem = toDbItem(item);

      expect(dbItem.preview_text).toBeNull();
      expect(dbItem.app_name).toBeNull();
      expect(dbItem.metadata).toBeNull();
      expect(dbItem.is_starred).toBe(0);
    });

    it('should handle metadata with only appName', () => {
      const item: ClipboardItem = {
        id: 'test-id',
        type: ClipboardType.Text,
        content: 'content',
        timestamp: 1703750000000,
        isStarred: false,
        metadata: { appName: 'Terminal' },
      };

      const dbItem = toDbItem(item);

      expect(dbItem.app_name).toBe('Terminal');
      expect(dbItem.metadata).toBeNull(); // No other fields to serialize
    });
  });

  describe('[2.2-UNIT-DB-007] fromDbItem', () => {
    it('should convert DbClipboardItem to ClipboardItem', () => {
      const dbItem: DbClipboardItem = {
        id: 'test-id',
        type: 'RTF',
        content: 'RTF content',
        preview_text: 'Preview',
        timestamp: 1703750000000,
        is_starred: 1,
        app_name: 'Word',
        metadata: null,
      };

      const item = fromDbItem(dbItem);

      expect(item).toEqual({
        id: 'test-id',
        type: ClipboardType.RTF,
        content: 'RTF content',
        previewText: 'Preview',
        timestamp: 1703750000000,
        isStarred: true,
        metadata: { appName: 'Word' },
      });
    });

    it('should convert null fields to undefined', () => {
      const dbItem: DbClipboardItem = {
        id: 'test-id',
        type: 'Text',
        content: 'content',
        preview_text: null,
        timestamp: 1703750000000,
        is_starred: 0,
        app_name: null,
        metadata: null,
      };

      const item = fromDbItem(dbItem);

      expect(item.previewText).toBeUndefined();
      expect(item.metadata).toBeUndefined();
      expect(item.isStarred).toBe(false);
    });

    it('should merge appName with parsed metadata', () => {
      const dbItem: DbClipboardItem = {
        id: 'test-id',
        type: 'Image',
        content: '/path/to/image.png',
        preview_text: null,
        timestamp: 1703750000000,
        is_starred: 0,
        app_name: 'Preview',
        metadata: '{"width":800,"height":600}',
      };

      const item = fromDbItem(dbItem);

      expect(item.metadata).toEqual({
        appName: 'Preview',
        width: 800,
        height: 600,
      });
    });

    it('should handle all ClipboardType values', () => {
      const types = ['Text', 'Image', 'RTF', 'File'];
      const expectedTypes = [
        ClipboardType.Text,
        ClipboardType.Image,
        ClipboardType.RTF,
        ClipboardType.File,
      ];

      types.forEach((type, index) => {
        const dbItem: DbClipboardItem = {
          id: `id-${type}`,
          type,
          content: 'content',
          preview_text: null,
          timestamp: 1703750000000,
          is_starred: 0,
          app_name: null,
          metadata: null,
        };

        const item = fromDbItem(dbItem);
        expect(item.type).toBe(expectedTypes[index]);
      });
    });

    it('should handle invalid JSON metadata gracefully', () => {
      const dbItem: DbClipboardItem = {
        id: 'test-id',
        type: 'Text',
        content: 'content',
        preview_text: null,
        timestamp: 1703750000000,
        is_starred: 0,
        app_name: 'App',
        metadata: 'invalid-json{',
      };

      const item = fromDbItem(dbItem);

      // Should still work, just with appName only
      expect(item.metadata).toEqual({ appName: 'App' });
    });
  });

  // ========================================
  // Error Handling Tests
  // ========================================
  describe('[2.2-UNIT-DB-008] Error Handling', () => {
    it('should handle database query errors gracefully', async () => {
      mockSelect.mockRejectedValueOnce(new Error('Query failed'));

      await expect(getClipboardItems()).rejects.toThrow('Failed to fetch clipboard items');
    });

    it('should handle save errors gracefully', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Insert failed'));

      const item: ClipboardItem = {
        id: 'test',
        type: ClipboardType.Text,
        content: 'content',
        timestamp: Date.now(),
        isStarred: false,
      };

      await expect(saveClipboardItem(item)).rejects.toThrow('Failed to save clipboard item');
    });

    it('should handle delete errors gracefully', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(deleteClipboardItem('id')).rejects.toThrow('Failed to delete clipboard item');
    });

    it('should handle update errors gracefully', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Update failed'));

      await expect(updateItemTimestamp('id')).rejects.toThrow('Failed to update item timestamp');
    });
  });
});
