import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INITIAL_MOCK_DATA, STORAGE_KEY } from '../constants';
import type { ClipboardItem, FilterCategory } from '../types';
import { FilterCategory as FC } from '../types';

interface ClipboardStore {
  // State
  items: ClipboardItem[];
  selectedIndex: number;
  searchQuery: string;
  filterCategory: FilterCategory;
  isLoading: boolean;
  toastMessage: string | null;

  // Actions
  setItems: (items: ClipboardItem[]) => void;
  addItem: (item: ClipboardItem) => void;
  toggleStar: (id: string) => void;
  deleteItem: (id: string) => void;
  setSelectedIndex: (index: number) => void;
  setSearchQuery: (query: string) => void;
  setFilterCategory: (category: FilterCategory) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
}

export const useClipboardStore = create<ClipboardStore>()(
  persist(
    (set) => ({
      // State with default values
      items: INITIAL_MOCK_DATA,
      selectedIndex: 0,
      searchQuery: '',
      filterCategory: FC.All,
      isLoading: false,
      toastMessage: null,

      // Actions
      setItems: (items) => set({ items }),

      addItem: (item) => set((state) => ({
        items: [item, ...state.items],
      })),

      toggleStar: (id) => set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, isStarred: !item.isStarred } : item
        ),
      })),

      deleteItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      })),

      setSelectedIndex: (index) => set({ selectedIndex: index }),

      // CRITICAL: setSearchQuery and setFilterCategory must reset selectedIndex to 0
      setSearchQuery: (query) => set({ searchQuery: query, selectedIndex: 0 }),

      setFilterCategory: (category) => set({ filterCategory: category, selectedIndex: 0 }),

      showToast: (message) => set({ toastMessage: message }),

      hideToast: () => set({ toastMessage: null }),
    }),
    {
      name: STORAGE_KEY,
      // Only persist items to localStorage
      partialize: (state) => ({ items: state.items }),
    }
  )
);
