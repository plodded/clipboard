import { useEffect, useMemo, useRef, useCallback, type MouseEvent } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ClipboardType, FilterCategory } from './types';
import { useClipboardStore } from './stores/clipboardStore';
import ClipboardCard from './components/ClipboardCard';
import FilterBar from './components/FilterBar';
import SearchBar from './components/SearchBar';
import { cn } from './utils';
import { ClipboardList, SearchX } from 'lucide-react';
import { startClipboardListening, stopClipboardListening, setErrorCallback } from './services/clipboard';

function App() {
  // --- State from Zustand Store ---
  const items = useClipboardStore((state) => state.items);
  const searchQuery = useClipboardStore((state) => state.searchQuery);
  const filterCategory = useClipboardStore((state) => state.filterCategory);
  const selectedIndex = useClipboardStore((state) => state.selectedIndex);
  const toastMessage = useClipboardStore((state) => state.toastMessage);
  const isDbLoaded = useClipboardStore((state) => state.isDbLoaded);

  // --- Actions from Store ---
  const loadFromDatabase = useClipboardStore((state) => state.loadFromDatabase);
  const setItems = useClipboardStore((state) => state.setItems);
  const setSearchQuery = useClipboardStore((state) => state.setSearchQuery);
  const setFilterCategory = useClipboardStore((state) => state.setFilterCategory);
  const setSelectedIndex = useClipboardStore((state) => state.setSelectedIndex);
  const showToast = useClipboardStore((state) => state.showToast);
  const hideToast = useClipboardStore((state) => state.hideToast);
  const toggleStarAction = useClipboardStore((state) => state.toggleStar);

  // --- Database Loading on App Startup ---
  // Story 2.2: Load clipboard history from SQLite database
  useEffect(() => {
    if (!isDbLoaded) {
      loadFromDatabase();
    }
  }, [isDbLoaded, loadFromDatabase]);

  // --- Refs (not migrated to store - DOM references) ---
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // --- Auto-hide on blur (click outside panel) ---
  useEffect(() => {
    const handleBlur = () => {
      // When window loses focus, hide the panel
      invoke('hide_panel').catch(console.error);
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  // --- Clipboard Listening Lifecycle ---
  useEffect(() => {
    let mounted = true;

    // 设置错误回调（用于重试失败后显示 Toast）
    setErrorCallback((message) => {
      if (mounted) {
        showToast(message);
        setTimeout(hideToast, 3000);
      }
    });

    const initClipboardListening = async () => {
      try {
        await startClipboardListening();
        if (mounted) {
          console.log('[Clipboard] Listening started successfully');
        }
      } catch (err) {
        console.error('[Clipboard] Failed to start listening:', err);
        // 错误已通过 setErrorCallback 处理，这里不需要额外处理
      }
    };

    initClipboardListening();

    return () => {
      mounted = false;
      setErrorCallback(null);
      stopClipboardListening().catch(console.error);
    };
  }, [showToast, hideToast]);

  // --- Auto-focus search on window focus ---
  // 当窗口重新获得焦点时，确保搜索框聚焦
  // 这解决了焦点在其他元素（如收藏按钮）上时，隐藏后重新显示面板无法使用键盘的问题
  useEffect(() => {
    const handleWindowFocus = () => {
      const searchInput = document.querySelector('input[placeholder*="搜索"]') as HTMLInputElement;
      if (searchInput) {
        // 小延迟确保 DOM 和窗口焦点状态就绪
        setTimeout(() => searchInput.focus(), 50);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, []);

  // NOTE: localStorage initialization and saving are now handled by Zustand persist middleware
  // The following useEffect hooks have been removed:
  // - Load from localStorage (lines 23-37 in original)
  // - Save to localStorage (lines 51-55 in original)

  // --- Filtering Logic ---
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Category Filter
      if (filterCategory !== FilterCategory.All) {
        if (filterCategory === FilterCategory.Starred && !item.isStarred) return false;
        if (filterCategory === FilterCategory.Text && item.type !== ClipboardType.Text && item.type !== ClipboardType.RTF) return false;
        if (filterCategory === FilterCategory.Image && item.type !== ClipboardType.Image) return false;
        if (filterCategory === FilterCategory.File && item.type !== ClipboardType.File) return false;
      }

      // 2. Search Query
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      const contentMatch = item.content.toLowerCase().includes(lowerQuery);
      const metadataMatch = item.metadata?.appName?.toLowerCase().includes(lowerQuery);
      const previewMatch = item.previewText?.toLowerCase().includes(lowerQuery);

      return contentMatch || metadataMatch || previewMatch;
    });
  }, [items, filterCategory, searchQuery]);

  // NOTE: "Reset selection when filter changes" useEffect has been removed
  // This logic is now handled inside store actions: setSearchQuery and setFilterCategory
  // Both actions automatically reset selectedIndex to 0

  // Scroll to active item
  useEffect(() => {
    if (itemRefs.current[selectedIndex] && scrollContainerRef.current) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedIndex, filteredItems]);

  // --- Actions ---

  const handleCopy = useCallback((item: typeof items[0]) => {
    // TODO: [Epic-2] Replace with invoke('write_clipboard', { content: item.content })
    console.log(`[Mock] Copied to clipboard: ${item.content}`);

    // TODO: [Epic-2] Replace with real clipboard event handling - this mock logic will be removed
    const updatedItems = items.filter(i => i.id !== item.id);
    const updatedItem = { ...item, timestamp: Date.now() };
    setItems([updatedItem, ...updatedItems]);

    showToast("已复制到剪贴板");
    setTimeout(() => {
      // Hide panel after copy
      invoke('hide_panel').catch(console.error);
      hideToast();
    }, 800);
  }, [items, setItems, showToast, hideToast]);

  const toggleStar = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    toggleStarAction(id);
  };

  // --- Keyboard Navigation ---
  // Note: Global shortcut (Cmd+Shift+V) is now handled by Rust via tauri-plugin-global-shortcut
  // We only handle panel-level keyboard events here
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          invoke('hide_panel').catch(console.error);
          break;
        case 'ArrowRight':
          e.preventDefault();
          setSelectedIndex(Math.min(selectedIndex + 1, filteredItems.length - 1));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            handleCopy(filteredItems[selectedIndex]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, selectedIndex, handleCopy, setSelectedIndex]);


  // --- Render Helpers ---

  // Handle refs for scrolling
  const setItemRef = (el: HTMLDivElement | null, index: number) => {
    itemRefs.current[index] = el;
  };

  return (
    // Panel is always visible - NSPanel controls actual window visibility
    // 高度使用 h-full 填充窗口，实际高度由 Rust 端 panel.rs 中的 PANEL_HEIGHT 定义
    <div className="w-screen h-full bg-slate-900/85 backdrop-blur-2xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col">

      {/* Top Bar: Search, Filter & Status */}
      <div className="flex-none h-16 px-6 flex items-center justify-between border-b border-white/5 bg-black/10">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold tracking-widest text-gray-500 uppercase hidden sm:block">Clipboard History</span>
          <SearchBar isVisible={true} />
          <FilterBar resultCount={filteredItems.length} />
        </div>

        <div className="text-xs text-gray-400 flex items-center gap-4">
          <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1.5 rounded">↵</kbd> 复制</span>
          <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1.5 rounded">Esc</kbd> 关闭</span>
        </div>
      </div>

      {/* Cards Scroll Area */}
      <div
        ref={scrollContainerRef}
        className={cn(
          "flex-1 flex items-center gap-4 px-6 overflow-x-auto overflow-y-hidden scrollbar-hide snap-x",
          filteredItems.length === 0 && "justify-center"
        )}
      >
        {filteredItems.length === 0 ? (
          items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-4 border border-white/10 shadow-inner">
                <ClipboardList className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">剪贴板为空</h3>
              <p className="text-gray-500">开始复制吧！复制的内容会显示在这里。</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-4 border border-white/10 shadow-inner">
                <SearchX className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">没有匹配结果</h3>
              <button
                onClick={() => { setSearchQuery(''); setFilterCategory(FilterCategory.All); }}
                className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-full transition-all border border-white/10 hover:border-white/20"
              >
                清除搜索和过滤
              </button>
            </div>
          )
        ) : (
          filteredItems.map((item, index) => (
            <div key={item.id} ref={(el) => setItemRef(el, index)}>
              <ClipboardCard
                item={item}
                isActive={index === selectedIndex}
                onClick={() => setSelectedIndex(index)}
                onStarToggle={(e) => toggleStar(e, item.id)}
              />
            </div>
          ))
        )}
      </div>

      {/* Toast Notification */}
      <div
        className={cn(
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-3 bg-black/80 text-white rounded-lg backdrop-blur-md shadow-2xl transition-opacity duration-200 pointer-events-none z-[60]",
          toastMessage ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-green-400">✓</span>
          {toastMessage}
        </div>
      </div>

    </div>
  );
}

export default App;
