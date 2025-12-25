import { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
}

function SearchBar({ query, setQuery }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // NSPanel 模式：面板显示时自动 focus 搜索框
  // 延迟 50ms 等待 NSPanel 显示动画完成，避免 focus 被动画打断
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-64 group">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full pl-10 pr-3 py-1.5 border border-white/10 rounded-md leading-5 bg-black/20 text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-black/40 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 sm:text-sm transition-all shadow-inner"
        placeholder="搜索历史记录..."
        spellCheck={false}
      />
    </div>
  );
};

export default SearchBar;
