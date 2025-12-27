/**
 * Story 2.2: clipboardStore - 剪贴板状态管理 + 数据库集成
 *
 * 使用 Zustand 管理剪贴板历史状态
 * 通过 database service 实现 SQLite 持久化
 */

import { create } from 'zustand';
import { FilterCategory } from '../types';
import type { ClipboardItem } from '../types';
import {
  getClipboardItems,
  saveClipboardItem,
  deleteClipboardItem as dbDeleteItem,
  updateItemTimestamp as dbUpdateTimestamp,
} from '../services/database';

interface ClipboardStore {
  // State
  items: ClipboardItem[];
  selectedIndex: number;
  searchQuery: string;
  filterCategory: FilterCategory;
  isLoading: boolean;
  isDbLoaded: boolean;
  toastMessage: string | null;

  // Actions
  loadFromDatabase: () => Promise<void>;
  setItems: (items: ClipboardItem[]) => void;
  addItem: (item: ClipboardItem) => Promise<void>;
  updateItemTimestamp: (id: string) => Promise<void>;
  toggleStar: (id: string) => void;
  deleteItem: (id: string) => Promise<void>;
  setSelectedIndex: (index: number) => void;
  setSearchQuery: (query: string) => void;
  setFilterCategory: (category: FilterCategory) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
}

export const useClipboardStore = create<ClipboardStore>()((set, get) => ({
  // State with default values
  items: [],
  selectedIndex: 0,
  searchQuery: '',
  filterCategory: FilterCategory.All,
  isLoading: false,
  isDbLoaded: false,
  toastMessage: null,

  // Load items from database on app startup
  loadFromDatabase: async () => {
    if (get().isDbLoaded) return; // Prevent duplicate loads

    set({ isLoading: true });
    try {
      const items = await getClipboardItems(100);
      set({ items, isDbLoaded: true, isLoading: false });
    } catch (error) {
      console.error('Failed to load from database:', error);
      set({ isLoading: false });
      get().showToast('加载历史记录失败');
    }
  },

  // Set items (for initialization or bulk operations)
  setItems: (items) => set({ items }),

  // Add item and persist to database
  addItem: async (item) => {
    // 1. Update Store immediately for UI responsiveness
    set((state) => ({
      items: [item, ...state.items],
    }));

    // 2. Persist to database
    try {
      await saveClipboardItem(item);
    } catch (error) {
      console.error('Failed to save item to database:', error);
      // Optionally rollback on failure
      // set((state) => ({
      //   items: state.items.filter((i) => i.id !== item.id),
      // }));
    }
  },

  // Update item timestamp (for deduplication)
  updateItemTimestamp: async (id) => {
    const newTimestamp = Date.now();

    // 1. Update Store - move item to front with new timestamp
    set((state) => {
      const item = state.items.find((i) => i.id === id);
      if (!item) return state;

      const updatedItem = { ...item, timestamp: newTimestamp };
      const otherItems = state.items.filter((i) => i.id !== id);
      return { items: [updatedItem, ...otherItems] };
    });

    // 2. Update database
    try {
      await dbUpdateTimestamp(id);
    } catch (error) {
      console.error('Failed to update timestamp in database:', error);
    }
  },

  // Toggle star status (local only for now, will add DB sync in future story)
  toggleStar: (id) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, isStarred: !item.isStarred } : item
      ),
    })),

  // Delete item and remove from database
  deleteItem: async (id) => {
    // 1. Update Store immediately
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));

    // 2. Delete from database
    try {
      await dbDeleteItem(id);
    } catch (error) {
      console.error('Failed to delete item from database:', error);
    }
  },

  setSelectedIndex: (index) => set({ selectedIndex: index }),

  // CRITICAL: setSearchQuery and setFilterCategory must reset selectedIndex to 0
  setSearchQuery: (query) => set({ searchQuery: query, selectedIndex: 0 }),

  setFilterCategory: (category) => set({ filterCategory: category, selectedIndex: 0 }),

  showToast: (message) => set({ toastMessage: message }),

  hideToast: () => set({ toastMessage: null }),
}));
