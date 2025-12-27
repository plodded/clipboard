/**
 * Story 2.2: clipboardStore 单元测试
 *
 * 测试 Zustand Store 状态管理和数据库集成
 * 使用 vi.mock 模拟数据库服务
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterCategory, ClipboardType } from '../types';
import type { ClipboardItem } from '../types';

// Mock database service
const mockGetClipboardItems = vi.fn();
const mockSaveClipboardItem = vi.fn();
const mockDeleteClipboardItem = vi.fn();
const mockUpdateItemTimestamp = vi.fn();

vi.mock('../services/database', () => ({
  getClipboardItems: (...args: unknown[]) => mockGetClipboardItems(...args),
  saveClipboardItem: (...args: unknown[]) => mockSaveClipboardItem(...args),
  deleteClipboardItem: (...args: unknown[]) => mockDeleteClipboardItem(...args),
  updateItemTimestamp: (...args: unknown[]) => mockUpdateItemTimestamp(...args),
}));

// Import store after mocks
import { useClipboardStore } from './clipboardStore';

// Test data factory
function createTestItem(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: `test-${Date.now()}`,
    type: ClipboardType.Text,
    content: 'Test content',
    timestamp: Date.now(),
    isStarred: false,
    ...overrides,
  };
}

describe('clipboardStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to default state
    useClipboardStore.setState({
      items: [],
      selectedIndex: 0,
      searchQuery: '',
      filterCategory: FilterCategory.All,
      isLoading: false,
      isDbLoaded: false,
      toastMessage: null,
    });
    // Default mock implementations
    mockGetClipboardItems.mockResolvedValue([]);
    mockSaveClipboardItem.mockResolvedValue(undefined);
    mockDeleteClipboardItem.mockResolvedValue(undefined);
    mockUpdateItemTimestamp.mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('should initialize with empty items', () => {
      const state = useClipboardStore.getState();
      expect(state.items).toEqual([]);
    });

    it('should initialize with default values', () => {
      const state = useClipboardStore.getState();
      expect(state.selectedIndex).toBe(0);
      expect(state.searchQuery).toBe('');
      expect(state.filterCategory).toBe(FilterCategory.All);
      expect(state.isLoading).toBe(false);
      expect(state.isDbLoaded).toBe(false);
      expect(state.toastMessage).toBeNull();
    });
  });

  describe('loadFromDatabase', () => {
    it('should load items from database', async () => {
      const mockItems: ClipboardItem[] = [
        createTestItem({ id: 'item-1' }),
        createTestItem({ id: 'item-2' }),
      ];
      mockGetClipboardItems.mockResolvedValueOnce(mockItems);

      await useClipboardStore.getState().loadFromDatabase();

      const state = useClipboardStore.getState();
      expect(state.items).toEqual(mockItems);
      expect(state.isDbLoaded).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(mockGetClipboardItems).toHaveBeenCalledWith(100);
    });

    it('should not reload if already loaded', async () => {
      useClipboardStore.setState({ isDbLoaded: true });

      await useClipboardStore.getState().loadFromDatabase();

      expect(mockGetClipboardItems).not.toHaveBeenCalled();
    });

    it('should handle load error gracefully', async () => {
      mockGetClipboardItems.mockRejectedValueOnce(new Error('Load failed'));

      await useClipboardStore.getState().loadFromDatabase();

      const state = useClipboardStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.toastMessage).toBe('加载历史记录失败');
    });
  });

  describe('items operations', () => {
    it('should set items', () => {
      const newItems = [createTestItem({ id: 'new-1' })];
      useClipboardStore.getState().setItems(newItems);
      expect(useClipboardStore.getState().items).toEqual(newItems);
    });

    it('should add item to the beginning and save to database', async () => {
      const existingItem = createTestItem({ id: 'existing' });
      useClipboardStore.setState({ items: [existingItem] });

      const newItem = createTestItem({ id: 'new-item' });
      await useClipboardStore.getState().addItem(newItem);

      const items = useClipboardStore.getState().items;
      expect(items[0]).toEqual(newItem);
      expect(items.length).toBe(2);
      expect(mockSaveClipboardItem).toHaveBeenCalledWith(newItem);
    });

    it('should handle addItem database error gracefully', async () => {
      mockSaveClipboardItem.mockRejectedValueOnce(new Error('Save failed'));

      const newItem = createTestItem();
      await useClipboardStore.getState().addItem(newItem);

      // Item should still be added to store even if DB save fails
      const items = useClipboardStore.getState().items;
      expect(items[0]).toEqual(newItem);
    });

    it('should toggle star status', () => {
      const item = createTestItem({ id: 'star-test', isStarred: false });
      useClipboardStore.setState({ items: [item] });

      useClipboardStore.getState().toggleStar('star-test');

      const updatedItem = useClipboardStore.getState().items.find((i) => i.id === 'star-test');
      expect(updatedItem?.isStarred).toBe(true);
    });

    it('should delete item and remove from database', async () => {
      const item = createTestItem({ id: 'to-delete' });
      useClipboardStore.setState({ items: [item] });

      await useClipboardStore.getState().deleteItem('to-delete');

      const items = useClipboardStore.getState().items;
      expect(items.length).toBe(0);
      expect(mockDeleteClipboardItem).toHaveBeenCalledWith('to-delete');
    });

    it('should update item timestamp and move to front', async () => {
      const item1 = createTestItem({ id: 'item-1', timestamp: 1000 });
      const item2 = createTestItem({ id: 'item-2', timestamp: 2000 });
      useClipboardStore.setState({ items: [item2, item1] });

      await useClipboardStore.getState().updateItemTimestamp('item-1');

      const items = useClipboardStore.getState().items;
      expect(items[0].id).toBe('item-1');
      expect(items[0].timestamp).toBeGreaterThan(2000);
      expect(mockUpdateItemTimestamp).toHaveBeenCalledWith('item-1');
    });
  });

  describe('search and filter with selectedIndex reset', () => {
    it('should update search query and reset selectedIndex to 0', () => {
      useClipboardStore.getState().setSelectedIndex(3);
      expect(useClipboardStore.getState().selectedIndex).toBe(3);

      useClipboardStore.getState().setSearchQuery('test');

      const state = useClipboardStore.getState();
      expect(state.searchQuery).toBe('test');
      expect(state.selectedIndex).toBe(0);
    });

    it('should update filter category and reset selectedIndex to 0', () => {
      useClipboardStore.getState().setSelectedIndex(5);
      expect(useClipboardStore.getState().selectedIndex).toBe(5);

      useClipboardStore.getState().setFilterCategory(FilterCategory.Image);

      const state = useClipboardStore.getState();
      expect(state.filterCategory).toBe(FilterCategory.Image);
      expect(state.selectedIndex).toBe(0);
    });
  });

  describe('selectedIndex operations', () => {
    it('should update selectedIndex', () => {
      useClipboardStore.getState().setSelectedIndex(2);
      expect(useClipboardStore.getState().selectedIndex).toBe(2);
    });
  });

  describe('toast operations', () => {
    it('should show toast message', () => {
      useClipboardStore.getState().showToast('Test message');
      expect(useClipboardStore.getState().toastMessage).toBe('Test message');
    });

    it('should hide toast message', () => {
      useClipboardStore.getState().showToast('Test message');
      useClipboardStore.getState().hideToast();
      expect(useClipboardStore.getState().toastMessage).toBeNull();
    });
  });
});
