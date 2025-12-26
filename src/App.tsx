import { useState, useEffect, useMemo, useRef, useCallback, type MouseEvent } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ClipboardItem, ClipboardType, FilterCategory } from './types';
import { INITIAL_MOCK_DATA, STORAGE_KEY } from './constants';
import ClipboardCard from './components/ClipboardCard';
import FilterBar from './components/FilterBar';
import SearchBar from './components/SearchBar';
import { cn } from './utils';
import { ClipboardList, SearchX } from 'lucide-react';

function App() {
  // --- State ---
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>(FilterCategory.All);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // --- Initialization & Persistence ---
  useEffect(() => {
    // Load from LocalStorage or seed with Mock data
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
        setItems(INITIAL_MOCK_DATA);
      }
    } else {
      setItems(INITIAL_MOCK_DATA);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_DATA));
    }
  }, []);

  // --- Auto-hide on blur (click outside panel) ---
  useEffect(() => {
    const handleBlur = () => {
      // When window loses focus, hide the panel
      invoke('hide_panel').catch(console.error);
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  // Save changes to storage
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items]);

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

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length, filterCategory, searchQuery]);

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

  const handleCopy = useCallback((item: ClipboardItem) => {
    // In a real Tauri app, this would call the backend to write to clipboard
    console.log(`[Mock] Copied to clipboard: ${item.content}`);

    // Simulate updating timestamp and moving to front
    const updatedItems = items.filter(i => i.id !== item.id);
    const updatedItem = { ...item, timestamp: Date.now() };
    setItems([updatedItem, ...updatedItems]);

    setToastMessage("已复制到剪贴板");
    setTimeout(() => {
      // Hide panel after copy
      invoke('hide_panel').catch(console.error);
      setToastMessage(null);
    }, 800);
  }, [items]);

  const toggleStar = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, isStarred: !item.isStarred } : item
    ));
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
          setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
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
  }, [filteredItems, selectedIndex, handleCopy]);


  // --- Render Helpers ---

  // Handle refs for scrolling
  const setItemRef = (el: HTMLDivElement | null, index: number) => {
    itemRefs.current[index] = el;
  };

  return (
    // Panel is always visible - NSPanel controls actual window visibility
    <div className="w-screen h-[340px] bg-slate-900/85 backdrop-blur-2xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col">

      {/* Top Bar: Search, Filter & Status */}
      <div className="flex-none h-16 px-6 flex items-center justify-between border-b border-white/5 bg-black/10">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold tracking-widest text-gray-500 uppercase hidden sm:block">Clipboard History</span>
          <SearchBar query={searchQuery} setQuery={setSearchQuery} isVisible={true} />
          <FilterBar
            currentFilter={filterCategory}
            onSelect={setFilterCategory}
            resultCount={filteredItems.length}
          />
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
