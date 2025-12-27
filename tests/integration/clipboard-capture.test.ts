/**
 * 剪贴板捕获集成测试
 *
 * 测试剪贴板服务与 Store 的集成
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClipboardType } from '@/types';
import { useClipboardStore } from '@/stores/clipboardStore';
import { handleClipboardContent } from '@/services/clipboardHandler';

// Mock @tauri-apps/plugin-log
vi.mock('@tauri-apps/plugin-log', () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));

// Mock database service (Story 2.2)
vi.mock('@/services/database', () => ({
  getClipboardItems: vi.fn().mockResolvedValue([]),
  saveClipboardItem: vi.fn().mockResolvedValue(undefined),
  deleteClipboardItem: vi.fn().mockResolvedValue(undefined),
  updateItemTimestamp: vi.fn().mockResolvedValue(undefined),
}));

describe('Clipboard Capture Integration', () => {
  beforeEach(() => {
    // 重置 Store 状态
    useClipboardStore.setState({
      items: [],
      searchQuery: '',
      filterCategory: undefined,
      selectedIndex: 0,
      toastMessage: null,
      isDbLoaded: true, // Skip database loading in tests
      isLoading: false,
    });
  });

  afterEach(() => {
    useClipboardStore.setState({ items: [] });
  });

  describe('Content Type Detection and Storage', () => {
    it('should capture and store text content correctly', () => {
      const clipboardData = {
        text: { type: 'text' as const, value: 'Hello World', count: 1 },
      };

      handleClipboardContent(clipboardData);

      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        type: ClipboardType.Text,
        content: 'Hello World',
        previewText: 'Hello World',
        isStarred: false,
      });
      expect(items[0].id).toBeDefined();
      expect(items[0].timestamp).toBeGreaterThan(0);
    });

    it('should capture and store image content with dimensions', () => {
      const clipboardData = {
        image: {
          type: 'image' as const,
          value: '/tmp/clipboard/image123.png',
          count: 1,
          width: 1920,
          height: 1080,
        },
      };

      handleClipboardContent(clipboardData);

      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        type: ClipboardType.Image,
        content: '/tmp/clipboard/image123.png',
        previewText: '图片 (1920x1080)',
        metadata: {
          width: 1920,
          height: 1080,
        },
      });
    });

    it('should capture and store file list content', () => {
      const clipboardData = {
        files: {
          type: 'files' as const,
          value: ['/Users/test/doc.pdf', '/Users/test/image.png'],
          count: 2,
        },
      };

      handleClipboardContent(clipboardData);

      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        type: ClipboardType.File,
        previewText: '2 个文件',
        metadata: { fileCount: 2 },
      });
    });

    it('should capture and store RTF content with text preview', () => {
      const clipboardData = {
        rtf: { type: 'rtf' as const, value: '{\\rtf1 Hello RTF}', count: 1 },
        text: { type: 'text' as const, value: 'Hello RTF', count: 1 },
      };

      handleClipboardContent(clipboardData);

      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        type: ClipboardType.RTF,
        content: '{\\rtf1 Hello RTF}',
        previewText: 'Hello RTF',
      });
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate text content and update timestamp', () => {
      // 第一次复制
      handleClipboardContent({
        text: { type: 'text' as const, value: 'Duplicate me', count: 1 },
      });

      const firstItems = useClipboardStore.getState().items;
      const firstTimestamp = firstItems[0].timestamp;
      const firstId = firstItems[0].id;

      // 第二次复制相同内容
      handleClipboardContent({
        text: { type: 'text' as const, value: 'Duplicate me', count: 1 },
      });

      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(firstId);
      // 时间戳应该被更新（相同或更大）
      expect(items[0].timestamp).toBeGreaterThanOrEqual(firstTimestamp);
    });

    it('should not deduplicate different text content', () => {
      handleClipboardContent({
        text: { type: 'text' as const, value: 'First text', count: 1 },
      });

      handleClipboardContent({
        text: { type: 'text' as const, value: 'Second text', count: 1 },
      });

      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(2);
      // 最新的在前面
      expect(items[0].content).toBe('Second text');
      expect(items[1].content).toBe('First text');
    });

    // 图片使用路径比较去重
    // 同一次截屏触发两次事件 → 路径相同 → 去重
    it('should deduplicate images by path (same screenshot triggers twice)', () => {
      // 第一次事件
      handleClipboardContent({
        image: {
          type: 'image' as const,
          value: '/tmp/screenshot-same.png',
          count: 1,
          width: 1920,
          height: 1080,
        },
      });

      const firstId = useClipboardStore.getState().items[0].id;

      // 第二次事件（同一张图片，路径相同）
      handleClipboardContent({
        image: {
          type: 'image' as const,
          value: '/tmp/screenshot-same.png', // 相同路径
          count: 1,
          width: 1920,
          height: 1080,
        },
      });

      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(1); // 只保留一条记录
      expect(items[0].id).toBe(firstId); // 更新时间戳，保持同一记录
    });

    // 多次截屏不同图片 → 路径不同 → 不去重
    it('should not deduplicate images with different paths (multiple screenshots)', () => {
      // 第一次截屏
      handleClipboardContent({
        image: {
          type: 'image' as const,
          value: '/tmp/screenshot-1.png',
          count: 1,
          width: 1920,
          height: 1080,
        },
      });

      // 第二次截屏（不同图片，不同路径）
      handleClipboardContent({
        image: {
          type: 'image' as const,
          value: '/tmp/screenshot-2.png', // 不同路径
          count: 1,
          width: 1920,
          height: 1080, // 尺寸相同但路径不同
        },
      });

      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(2); // 两张图片都应该保留
      expect(items[0].content).toBe('/tmp/screenshot-2.png');
      expect(items[1].content).toBe('/tmp/screenshot-1.png');
    });
  });

  describe('Priority Order', () => {
    it('should prioritize image over text when both present', () => {
      handleClipboardContent({
        image: {
          type: 'image' as const,
          value: '/path/image.png',
          count: 1,
          width: 100,
          height: 100,
        },
        text: { type: 'text' as const, value: 'Some text', count: 1 },
      });

      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe(ClipboardType.Image);
    });

    it('should prioritize files over text when both present', () => {
      handleClipboardContent({
        files: {
          type: 'files' as const,
          value: ['/path/file.txt'],
          count: 1,
        },
        text: { type: 'text' as const, value: 'file.txt', count: 1 },
      });

      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe(ClipboardType.File);
    });
  });

  describe('Store Integration', () => {
    it('should add multiple items and maintain order (newest first)', () => {
      handleClipboardContent({
        text: { type: 'text' as const, value: 'First', count: 1 },
      });
      handleClipboardContent({
        text: { type: 'text' as const, value: 'Second', count: 1 },
      });
      handleClipboardContent({
        text: { type: 'text' as const, value: 'Third', count: 1 },
      });

      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(3);
      expect(items[0].content).toBe('Third');
      expect(items[1].content).toBe('Second');
      expect(items[2].content).toBe('First');
    });

    it('should move duplicated item to top', () => {
      handleClipboardContent({
        text: { type: 'text' as const, value: 'First', count: 1 },
      });
      handleClipboardContent({
        text: { type: 'text' as const, value: 'Second', count: 1 },
      });
      handleClipboardContent({
        text: { type: 'text' as const, value: 'Third', count: 1 },
      });

      // 再次复制 "First"
      handleClipboardContent({
        text: { type: 'text' as const, value: 'First', count: 1 },
      });

      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(3);
      // "First" 应该移到顶部
      expect(items[0].content).toBe('First');
      expect(items[1].content).toBe('Third');
      expect(items[2].content).toBe('Second');
    });
  });
});
