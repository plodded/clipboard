/**
 * ClipboardHandler 单元测试
 *
 * 测试剪贴板内容处理器的核心功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClipboardType } from '@/types';
import type { ClipboardItem } from '@/types';
import { detectContent, findDuplicateId, handleClipboardContent } from './clipboardHandler';
import { useClipboardStore } from '@/stores/clipboardStore';

// Mock @tauri-apps/plugin-log
vi.mock('@tauri-apps/plugin-log', () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));

describe('ClipboardHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectContent', () => {
    it('should detect text content', () => {
      const data = {
        text: { type: 'text' as const, value: 'Hello, World!', count: 1 },
      };

      const result = detectContent(data);

      expect(result).not.toBeNull();
      expect(result!.type).toBe(ClipboardType.Text);
      expect(result!.content).toBe('Hello, World!');
      expect(result!.previewText).toBe('Hello, World!');
    });

    it('should detect image content with dimensions', () => {
      const data = {
        image: {
          type: 'image' as const,
          value: '/path/to/image.png',
          count: 1,
          width: 800,
          height: 600,
        },
      };

      const result = detectContent(data);

      expect(result).not.toBeNull();
      expect(result!.type).toBe(ClipboardType.Image);
      expect(result!.content).toBe('/path/to/image.png');
      expect(result!.previewText).toBe('图片 (800x600)');
      expect(result!.metadata?.width).toBe(800);
      expect(result!.metadata?.height).toBe(600);
    });

    it('should detect file content', () => {
      const data = {
        files: {
          type: 'files' as const,
          value: ['/path/to/file1.txt', '/path/to/file2.pdf'],
          count: 2,
        },
      };

      const result = detectContent(data);

      expect(result).not.toBeNull();
      expect(result!.type).toBe(ClipboardType.File);
      expect(result!.previewText).toBe('2 个文件');
      expect(result!.metadata?.fileCount).toBe(2);
    });

    it('should detect single file with filename preview', () => {
      const data = {
        files: {
          type: 'files' as const,
          value: ['/Users/test/Documents/report.pdf'],
          count: 1,
        },
      };

      const result = detectContent(data);

      expect(result).not.toBeNull();
      expect(result!.type).toBe(ClipboardType.File);
      expect(result!.previewText).toBe('report.pdf');
    });

    it('should detect RTF content', () => {
      const data = {
        rtf: { type: 'rtf' as const, value: '{\\rtf1 Hello}', count: 1 },
        text: { type: 'text' as const, value: 'Hello', count: 1 },
      };

      const result = detectContent(data);

      expect(result).not.toBeNull();
      expect(result!.type).toBe(ClipboardType.RTF);
      expect(result!.content).toBe('{\\rtf1 Hello}');
      expect(result!.previewText).toBe('Hello');
    });

    it('should detect HTML content as Text type', () => {
      const data = {
        html: { type: 'html' as const, value: '<p>Hello</p>', count: 1 },
        text: { type: 'text' as const, value: 'Hello', count: 1 },
      };

      const result = detectContent(data);

      expect(result).not.toBeNull();
      expect(result!.type).toBe(ClipboardType.Text);
      expect(result!.content).toBe('<p>Hello</p>');
    });

    it('should prioritize image over text', () => {
      const data = {
        image: {
          type: 'image' as const,
          value: '/path/to/image.png',
          count: 1,
          width: 100,
          height: 100,
        },
        text: { type: 'text' as const, value: 'Some text', count: 1 },
      };

      const result = detectContent(data);

      expect(result!.type).toBe(ClipboardType.Image);
    });

    it('should prioritize files over text', () => {
      const data = {
        files: {
          type: 'files' as const,
          value: ['/path/to/file.txt'],
          count: 1,
        },
        text: { type: 'text' as const, value: 'Some text', count: 1 },
      };

      const result = detectContent(data);

      expect(result!.type).toBe(ClipboardType.File);
    });

    // 回归测试：Bug Fix #1 - 文件复制被误识别为图像
    // macOS 复制文件时同时包含文件路径和文件图标图像数据
    // Files 必须优先于 Image 检测，否则文件复制会变成图标图像
    it('should prioritize files over image (regression test for Bug Fix #1)', () => {
      const data = {
        files: {
          type: 'files' as const,
          value: ['/Users/test/Documents/report.pdf'],
          count: 1,
        },
        image: {
          type: 'image' as const,
          value: '/tmp/file-icon.png', // 文件图标
          count: 1,
          width: 64,
          height: 64,
        },
        text: { type: 'text' as const, value: 'report.pdf', count: 1 },
      };

      const result = detectContent(data);

      expect(result!.type).toBe(ClipboardType.File);
      expect(result!.previewText).toBe('report.pdf');
    });

    it('should return null for empty data', () => {
      const result = detectContent({});

      expect(result).toBeNull();
    });

    it('should truncate long text preview', () => {
      const longText = 'A'.repeat(200);
      const data = {
        text: { type: 'text' as const, value: longText, count: 1 },
      };

      const result = detectContent(data);

      expect(result!.previewText.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(result!.previewText.endsWith('...')).toBe(true);
    });
  });

  describe('findDuplicateId', () => {
    const existingItems: ClipboardItem[] = [
      {
        id: 'text-1',
        type: ClipboardType.Text,
        content: 'Hello, World!',
        timestamp: Date.now(),
        isStarred: false,
      },
      {
        id: 'image-1',
        type: ClipboardType.Image,
        content: '/path/to/image.png',
        timestamp: Date.now(),
        isStarred: false,
        metadata: { width: 800, height: 600 },
      },
      {
        id: 'file-1',
        type: ClipboardType.File,
        content: JSON.stringify(['/path/to/file.txt']),
        timestamp: Date.now(),
        isStarred: false,
      },
    ];

    it('should find duplicate text content', () => {
      const newContent = {
        type: ClipboardType.Text,
        content: 'Hello, World!',
        previewText: 'Hello, World!',
      };

      const result = findDuplicateId(newContent, existingItems);

      expect(result).toBe('text-1');
    });

    // 图片使用路径比较去重（不用尺寸，因为多次截屏尺寸相同但内容不同）
    it('should deduplicate images by path (same screenshot triggers twice)', () => {
      const newContent = {
        type: ClipboardType.Image,
        content: '/path/to/image.png', // 与 existingItems 中的路径相同
        previewText: '图片',
        metadata: { width: 800, height: 600 },
      };

      const result = findDuplicateId(newContent, existingItems);

      expect(result).toBe('image-1'); // 路径相同，视为重复
    });

    // 多次截屏不同图片 → 路径不同 → 不去重
    it('should not deduplicate images with different paths (multiple screenshots)', () => {
      const newContent = {
        type: ClipboardType.Image,
        content: '/path/to/screenshot-2.png', // 不同路径
        previewText: '图片',
        metadata: { width: 800, height: 600 }, // 即使尺寸相同，路径不同也不去重
      };

      const result = findDuplicateId(newContent, existingItems);

      expect(result).toBeNull(); // 不同路径，视为新内容
    });

    it('should find duplicate file paths', () => {
      const newContent = {
        type: ClipboardType.File,
        content: JSON.stringify(['/path/to/file.txt']),
        previewText: 'file.txt',
      };

      const result = findDuplicateId(newContent, existingItems);

      expect(result).toBe('file-1');
    });

    it('should not find duplicate for new content', () => {
      const newContent = {
        type: ClipboardType.Text,
        content: 'New content',
        previewText: 'New content',
      };

      const result = findDuplicateId(newContent, existingItems);

      expect(result).toBeNull();
    });

    it('should not match different types', () => {
      const newContent = {
        type: ClipboardType.RTF,
        content: 'Hello, World!',
        previewText: 'Hello, World!',
      };

      const result = findDuplicateId(newContent, existingItems);

      expect(result).toBeNull();
    });
  });

  describe('handleClipboardContent', () => {
    beforeEach(() => {
      // 重置 Store 状态
      useClipboardStore.setState({
        items: [],
        searchQuery: '',
        filterCategory: undefined,
        selectedIndex: 0,
        toastMessage: null,
      });
    });

    afterEach(() => {
      useClipboardStore.setState({ items: [] });
    });

    it('should add new text content to store', () => {
      const data = {
        text: { type: 'text' as const, value: 'New text content', count: 1 },
      };

      handleClipboardContent(data);

      const items = useClipboardStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe(ClipboardType.Text);
      expect(items[0].content).toBe('New text content');
    });

    it('should skip when no valid content detected', () => {
      const data = {};

      handleClipboardContent(data);

      const items = useClipboardStore.getState().items;
      expect(items).toHaveLength(0);
    });

    it('should update timestamp for duplicate content', () => {
      // 先添加一个项目
      const existingItem: ClipboardItem = {
        id: 'existing-1',
        type: ClipboardType.Text,
        content: 'Duplicate text',
        timestamp: 1000,
        isStarred: false,
      };
      useClipboardStore.setState({ items: [existingItem] });

      // 添加相同内容
      const data = {
        text: { type: 'text' as const, value: 'Duplicate text', count: 1 },
      };

      const beforeTimestamp = Date.now();
      handleClipboardContent(data);

      const items = useClipboardStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('existing-1');
      expect(items[0].timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
    });

    it('should add image content with metadata', () => {
      const data = {
        image: {
          type: 'image' as const,
          value: '/tmp/image.png',
          count: 1,
          width: 1920,
          height: 1080,
        },
      };

      handleClipboardContent(data);

      const items = useClipboardStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe(ClipboardType.Image);
      expect(items[0].metadata?.width).toBe(1920);
      expect(items[0].metadata?.height).toBe(1080);
    });

    it('should add file content', () => {
      const data = {
        files: {
          type: 'files' as const,
          value: ['/path/to/file1.txt', '/path/to/file2.pdf'],
          count: 2,
        },
      };

      handleClipboardContent(data);

      const items = useClipboardStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe(ClipboardType.File);
      expect(items[0].metadata?.fileCount).toBe(2);
    });

    it('should move duplicate to top when found', () => {
      // 添加多个项目
      const items: ClipboardItem[] = [
        {
          id: 'item-1',
          type: ClipboardType.Text,
          content: 'First',
          timestamp: 3000,
          isStarred: false,
        },
        {
          id: 'item-2',
          type: ClipboardType.Text,
          content: 'Second',
          timestamp: 2000,
          isStarred: false,
        },
        {
          id: 'item-3',
          type: ClipboardType.Text,
          content: 'Third',
          timestamp: 1000,
          isStarred: false,
        },
      ];
      useClipboardStore.setState({ items });

      // 复制 "Third"（最后一个）
      const data = {
        text: { type: 'text' as const, value: 'Third', count: 1 },
      };

      handleClipboardContent(data);

      const result = useClipboardStore.getState().items;
      expect(result).toHaveLength(3);
      // "Third" 应该移动到顶部
      expect(result[0].content).toBe('Third');
      expect(result[1].content).toBe('First');
      expect(result[2].content).toBe('Second');
    });
  });
});
