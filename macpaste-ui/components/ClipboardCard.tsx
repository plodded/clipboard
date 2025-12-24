import React from 'react';
import { ClipboardItem, ClipboardType } from '../types';
import { cn, formatTime } from '../utils';
import { FileText, Image as ImageIcon, Type, Paperclip, Star, Clock, Copy } from 'lucide-react';

interface ClipboardCardProps {
  item: ClipboardItem;
  isActive: boolean;
  onClick: () => void;
  onStarToggle: (e: React.MouseEvent) => void;
}

const ClipboardCard: React.FC<ClipboardCardProps> = ({ item, isActive, onClick, onStarToggle }) => {
  const renderIcon = () => {
    switch (item.type) {
      case ClipboardType.Image: return <ImageIcon className="w-4 h-4 text-purple-400" />;
      case ClipboardType.File: return <Paperclip className="w-4 h-4 text-blue-400" />;
      case ClipboardType.RTF: return <Type className="w-4 h-4 text-orange-400" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const renderContent = () => {
    if (item.type === ClipboardType.Image) {
      return (
        <div className="w-full h-full flex items-center justify-center overflow-hidden bg-black/20 rounded-md">
          <img src={item.content} alt="Clipboard" className="w-full h-full object-cover opacity-90" />
        </div>
      );
    }

    // For RTF, prioritize previewText, fallback to stripped content
    const textToShow = item.previewText || item.content;

    return (
      <div className="w-full h-full p-1 overflow-hidden">
        <p className="text-sm text-gray-200 break-words whitespace-pre-wrap font-mono leading-relaxed line-clamp-[8]">
          {textToShow}
        </p>
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex-shrink-0 w-[220px] h-[240px] rounded-xl transition-all duration-200 ease-out cursor-pointer group select-none snap-center",
        "flex flex-col overflow-hidden border",
        isActive
          ? "bg-white/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-105 z-10"
          : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10 scale-100 opacity-70 hover:opacity-100"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/5 bg-black/10">
        <div className="flex items-center gap-2">
          {renderIcon()}
          <span className="text-xs font-medium text-gray-400 truncate max-w-[80px]">
            {item.metadata?.appName || 'System'}
          </span>
        </div>

        {/* Star Button */}
        <button
          onClick={onStarToggle}
          className={cn(
            "p-1.5 rounded-full transition-colors hover:bg-white/10",
            item.isStarred ? "text-yellow-400" : "text-gray-600 hover:text-gray-300"
          )}
          title={item.isStarred ? "取消收藏" : "收藏"}
        >
          <Star className={cn("w-3.5 h-3.5", item.isStarred && "fill-current")} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 p-3 overflow-hidden">
        {renderContent()}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-white/5 bg-black/10 flex justify-between items-center text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(item.timestamp)}
        </span>
        {isActive && (
          <span className="flex items-center gap-1 text-blue-400 font-medium animate-pulse">
            <Copy className="w-3 h-3" />
            Enter 复制
          </span>
        )}
      </div>
    </div>
  );
};

export default ClipboardCard;
