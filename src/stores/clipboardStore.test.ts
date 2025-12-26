import { describe, it, expect, beforeEach } from 'vitest';
import { useClipboardStore } from './clipboardStore';
import { INITIAL_MOCK_DATA, STORAGE_KEY } from '../constants';
import { FilterCategory, ClipboardType } from '../types';

describe('clipboardStore', () => {
  beforeEach(() => {
    // Clear localStorage and reset store before each test
    localStorage.clear();
    useClipboardStore.setState({
      items: INITIAL_MOCK_DATA,
      selectedIndex: 0,
      searchQuery: '',
      filterCategory: FilterCategory.All,
      isLoading: false,
      toastMessage: null,
    });
  });

  describe('initialization', () => {
    it('should initialize with INITIAL_MOCK_DATA', () => {
      const state = useClipboardStore.getState();
      expect(state.items).toEqual(INITIAL_MOCK_DATA);
    });

    it('should initialize with default values', () => {
      const state = useClipboardStore.getState();
      expect(state.selectedIndex).toBe(0);
      expect(state.searchQuery).toBe('');
      expect(state.filterCategory).toBe(FilterCategory.All);
      expect(state.isLoading).toBe(false);
      expect(state.toastMessage).toBeNull();
    });
  });

  describe('items operations', () => {
    it('should set items', () => {
      const newItems = [{ ...INITIAL_MOCK_DATA[0], id: 'new-1' }];
      useClipboardStore.getState().setItems(newItems);
      expect(useClipboardStore.getState().items).toEqual(newItems);
    });

    it('should add item to the beginning', () => {
      const newItem = {
        id: 'new-item',
        type: ClipboardType.Text,
        content: 'New item content',
        timestamp: Date.now(),
        isStarred: false,
      };
      useClipboardStore.getState().addItem(newItem);
      const items = useClipboardStore.getState().items;
      expect(items[0]).toEqual(newItem);
      expect(items.length).toBe(INITIAL_MOCK_DATA.length + 1);
    });

    it('should toggle star status', () => {
      const itemId = INITIAL_MOCK_DATA[0].id;
      const originalStarred = INITIAL_MOCK_DATA[0].isStarred;

      useClipboardStore.getState().toggleStar(itemId);

      const updatedItem = useClipboardStore.getState().items.find(i => i.id === itemId);
      expect(updatedItem?.isStarred).toBe(!originalStarred);
    });

    it('should delete item', () => {
      const itemId = INITIAL_MOCK_DATA[0].id;
      const initialLength = useClipboardStore.getState().items.length;

      useClipboardStore.getState().deleteItem(itemId);

      const items = useClipboardStore.getState().items;
      expect(items.length).toBe(initialLength - 1);
      expect(items.find(i => i.id === itemId)).toBeUndefined();
    });
  });

  describe('search and filter with selectedIndex reset', () => {
    it('should update search query and reset selectedIndex to 0', () => {
      // First, set selectedIndex to something other than 0
      useClipboardStore.getState().setSelectedIndex(3);
      expect(useClipboardStore.getState().selectedIndex).toBe(3);

      // Now update search query
      useClipboardStore.getState().setSearchQuery('test');

      const state = useClipboardStore.getState();
      expect(state.searchQuery).toBe('test');
      expect(state.selectedIndex).toBe(0); // CRITICAL: must reset to 0
    });

    it('should update filter category and reset selectedIndex to 0', () => {
      // First, set selectedIndex to something other than 0
      useClipboardStore.getState().setSelectedIndex(5);
      expect(useClipboardStore.getState().selectedIndex).toBe(5);

      // Now update filter category
      useClipboardStore.getState().setFilterCategory(FilterCategory.Image);

      const state = useClipboardStore.getState();
      expect(state.filterCategory).toBe(FilterCategory.Image);
      expect(state.selectedIndex).toBe(0); // CRITICAL: must reset to 0
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

  describe('persistence', () => {
    it('should use correct storage key for persistence', () => {
      // Verify that STORAGE_KEY is the expected value
      expect(STORAGE_KEY).toBe('macos-clipboard-history');
    });
  });
});
