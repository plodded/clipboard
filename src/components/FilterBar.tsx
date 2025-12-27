import { FilterCategory } from '../types';
import { useClipboardStore } from '../stores/clipboardStore';
import { cn } from '../utils';
import { Grid, FileText, Image as ImageIcon, Paperclip, Star } from 'lucide-react';

interface FilterBarProps {
  resultCount: number;
}

function FilterBar({ resultCount }: FilterBarProps) {
  // Get state and action directly from store
  const currentFilter = useClipboardStore((state) => state.filterCategory);
  const onSelect = useClipboardStore((state) => state.setFilterCategory);

  const filters = [
    { key: FilterCategory.All, label: '全部', icon: Grid },
    { key: FilterCategory.Text, label: '文本', icon: FileText },
    { key: FilterCategory.Image, label: '图片', icon: ImageIcon },
    { key: FilterCategory.File, label: '文件', icon: Paperclip },
    { key: FilterCategory.Starred, label: '收藏', icon: Star },
  ];

  return (
    <div data-testid="filter-bar" className="flex items-center justify-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isSelected = currentFilter === filter.key;

        return (
          <button
            key={filter.key}
            data-testid={`filter-${filter.key}`}
            aria-pressed={isSelected}
            onClick={() => onSelect(filter.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
              isSelected
                ? "bg-white text-black shadow-md"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{filter.label}</span>
          </button>
        );
      })}

      <div className="w-px h-4 bg-white/20 mx-1" />
      <span className="text-xs text-gray-500 font-mono px-1">
        {resultCount} 项
      </span>
    </div>
  );
}

export default FilterBar;
