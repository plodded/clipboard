/**
 * Story 2.1: 剪贴板监听与内容捕获 - 边界条件和增强测试
 *
 * 这些测试覆盖以下场景：
 * - 性能边界测试：大量剪贴板条目的处理
 * - 并发场景测试：快速连续复制多项内容
 * - 边界条件测试：特殊字符、空内容、超长内容等
 *
 * Priority Guide:
 * - [P2] Medium priority, run nightly
 * - [P3] Low priority, run weekly
 *
 * Test IDs: 2.1-INT-EXT-{SEQ}
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClipboardType } from '@/types';
import type { ClipboardItem } from '@/types';
import { useClipboardStore } from '@/stores/clipboardStore';
import { handleClipboardContent, detectContent } from '@/services/clipboardHandler';

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

describe('Story 2.1: Edge Cases and Performance Tests', () => {
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

  // ============================================================
  // 2.1-INT-EXT-001: 性能边界测试
  // ============================================================
  describe('[P2] Performance Boundary Tests', () => {
    it('2.1-INT-EXT-001: should handle 100 items without performance degradation', () => {
      // GIVEN: 一个空的 Store
      const startTime = performance.now();

      // WHEN: 添加 100 个不同的剪贴板条目
      for (let i = 0; i < 100; i++) {
        handleClipboardContent({
          text: { type: 'text' as const, value: `Content item ${i}`, count: 1 },
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // THEN: 所有条目都应该被添加
      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(100);

      // THEN: 处理时间应该在合理范围内（< 1000ms）
      expect(duration).toBeLessThan(1000);
    });

    it('2.1-INT-EXT-002: should maintain deduplication performance with 100 existing items', () => {
      // GIVEN: Store 中已有 100 个条目
      const existingItems: ClipboardItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        type: ClipboardType.Text,
        content: `Existing content ${i}`,
        timestamp: Date.now() - i * 1000,
        isStarred: false,
      }));
      useClipboardStore.setState({ items: existingItems });

      // WHEN: 添加一个重复内容（最后一个）
      const startTime = performance.now();

      handleClipboardContent({
        text: { type: 'text' as const, value: 'Existing content 99', count: 1 },
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // THEN: 仍然只有 100 个条目（去重生效）
      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(100);

      // THEN: 去重检查应该很快（< 50ms）
      expect(duration).toBeLessThan(50);

      // THEN: 重复项应该移到顶部
      expect(items[0].content).toBe('Existing content 99');
    });

    it('2.1-INT-EXT-003: should handle rapid-fire clipboard events (10 events in 100ms)', async () => {
      // GIVEN: 一个空的 Store
      // WHEN: 快速连续触发 10 个剪贴板事件
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              handleClipboardContent({
                text: { type: 'text' as const, value: `Rapid content ${i}`, count: 1 },
              });
              resolve();
            }, i * 10); // 每 10ms 一个事件
          })
        );
      }

      await Promise.all(promises);

      // THEN: 所有 10 个条目都应该被添加
      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(10);

      // THEN: 最新的应该在顶部
      expect(items[0].content).toBe('Rapid content 9');
    });
  });

  // ============================================================
  // 2.1-INT-EXT-004: 边界条件测试
  // ============================================================
  describe('[P2] Boundary Condition Tests', () => {
    it('2.1-INT-EXT-004: should handle empty string content gracefully', () => {
      // GIVEN: 空字符串内容
      const data = {
        text: { type: 'text' as const, value: '', count: 0 },
      };

      // WHEN: 检测内容
      const result = detectContent(data);

      // THEN: 应该返回 null（不创建记录）
      expect(result).toBeNull();
    });

    it('2.1-INT-EXT-005: should handle whitespace-only content', () => {
      // GIVEN: 仅空白字符的内容
      const data = {
        text: { type: 'text' as const, value: '   \n\t\r  ', count: 1 },
      };

      // WHEN: 检测内容
      const result = detectContent(data);

      // THEN: 应该检测到文本内容
      expect(result).not.toBeNull();
      expect(result!.type).toBe(ClipboardType.Text);
      // 预览文本应该被 trim
      expect(result!.previewText).toBe('');
    });

    it('2.1-INT-EXT-006: should handle very long text (10000 characters)', () => {
      // GIVEN: 超长文本内容
      const longText = 'A'.repeat(10000);
      const data = {
        text: { type: 'text' as const, value: longText, count: 1 },
      };

      // WHEN: 检测内容
      const result = detectContent(data);

      // THEN: 应该正确检测
      expect(result).not.toBeNull();
      expect(result!.type).toBe(ClipboardType.Text);
      expect(result!.content).toBe(longText);
      // 预览应该被截断
      expect(result!.previewText.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(result!.previewText.endsWith('...')).toBe(true);
    });

    it('2.1-INT-EXT-007: should handle special Unicode characters', () => {
      // GIVEN: 包含特殊 Unicode 字符的文本
      const specialText = '🎉 你好世界 émoji 🚀 中文 日本語 한국어 العربية';
      const data = {
        text: { type: 'text' as const, value: specialText, count: 1 },
      };

      // WHEN: 处理内容
      handleClipboardContent(data);

      // THEN: 应该正确存储
      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].content).toBe(specialText);
    });

    it('2.1-INT-EXT-008: should handle newlines and tabs in text', () => {
      // GIVEN: 包含换行和制表符的文本
      const multilineText = 'Line 1\nLine 2\tTabbed\r\nLine 3';
      const data = {
        text: { type: 'text' as const, value: multilineText, count: 1 },
      };

      // WHEN: 处理内容
      handleClipboardContent(data);

      // THEN: 应该保留原始格式
      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].content).toBe(multilineText);
    });

    it('2.1-INT-EXT-009: should handle empty file paths array', () => {
      // GIVEN: 空的文件路径数组
      const data = {
        files: { type: 'files' as const, value: [], count: 0 },
      };

      // WHEN: 检测内容
      const result = detectContent(data);

      // THEN: 应该返回 null
      expect(result).toBeNull();
    });

    it('2.1-INT-EXT-010: should handle files with very long paths', () => {
      // GIVEN: 非常长的文件路径
      const longPath = '/Users/test/' + 'a'.repeat(200) + '/document.pdf';
      const data = {
        files: { type: 'files' as const, value: [longPath], count: 1 },
      };

      // WHEN: 检测内容
      const result = detectContent(data);

      // THEN: 应该正确检测
      expect(result).not.toBeNull();
      expect(result!.type).toBe(ClipboardType.File);
      expect(result!.previewText).toBe('document.pdf');
    });
  });

  // ============================================================
  // 2.1-INT-EXT-011: 并发和竞态条件测试
  // ============================================================
  describe('[P2] Concurrency Tests', () => {
    it('2.1-INT-EXT-011: should handle concurrent duplicate detection correctly', () => {
      // GIVEN: 已有一个条目
      const existingItem: ClipboardItem = {
        id: 'existing-1',
        type: ClipboardType.Text,
        content: 'Duplicate test',
        timestamp: 1000,
        isStarred: false,
      };
      useClipboardStore.setState({ items: [existingItem] });

      // WHEN: 同时添加相同内容两次
      handleClipboardContent({
        text: { type: 'text' as const, value: 'Duplicate test', count: 1 },
      });
      handleClipboardContent({
        text: { type: 'text' as const, value: 'Duplicate test', count: 1 },
      });

      // THEN: 仍然只有一个条目
      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('existing-1');
    });

    it('2.1-INT-EXT-012: should maintain correct order with mixed content types', () => {
      // GIVEN: 一个空的 Store
      // WHEN: 添加不同类型的内容
      handleClipboardContent({
        text: { type: 'text' as const, value: 'Text content', count: 1 },
      });

      handleClipboardContent({
        image: {
          type: 'image' as const,
          value: '/tmp/image.png',
          count: 1,
          width: 100,
          height: 100,
        },
      });

      handleClipboardContent({
        files: {
          type: 'files' as const,
          value: ['/path/to/file.txt'],
          count: 1,
        },
      });

      // THEN: 所有类型都应该被添加，最新的在前
      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(3);
      expect(items[0].type).toBe(ClipboardType.File);
      expect(items[1].type).toBe(ClipboardType.Image);
      expect(items[2].type).toBe(ClipboardType.Text);
    });
  });

  // ============================================================
  // 2.1-INT-EXT-013: 去重边界条件测试
  // ============================================================
  describe('[P3] Deduplication Edge Cases', () => {
    it('2.1-INT-EXT-013: should not consider different whitespace as duplicates', () => {
      // GIVEN: 两个仅空白不同的内容
      handleClipboardContent({
        text: { type: 'text' as const, value: 'Hello World', count: 1 },
      });

      handleClipboardContent({
        text: { type: 'text' as const, value: 'Hello  World', count: 1 }, // 两个空格
      });

      // THEN: 应该创建两个不同的记录
      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(2);
    });

    it('2.1-INT-EXT-014: should treat same content with different types as unique', () => {
      // GIVEN: 相同内容但不同类型
      const content = 'Same content';

      // 先添加纯文本
      handleClipboardContent({
        text: { type: 'text' as const, value: content, count: 1 },
      });

      // 再添加 RTF（内容相同但类型不同）
      handleClipboardContent({
        rtf: { type: 'rtf' as const, value: content, count: 1 },
        text: { type: 'text' as const, value: content, count: 1 },
      });

      // THEN: 应该创建两个记录（不同类型）
      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(2);
      expect(items[0].type).toBe(ClipboardType.RTF);
      expect(items[1].type).toBe(ClipboardType.Text);
    });

    it('2.1-INT-EXT-015: should handle case-sensitive deduplication correctly', () => {
      // GIVEN: 大小写不同的相同内容
      handleClipboardContent({
        text: { type: 'text' as const, value: 'Hello World', count: 1 },
      });

      handleClipboardContent({
        text: { type: 'text' as const, value: 'hello world', count: 1 },
      });

      // THEN: 应该创建两个不同的记录（大小写敏感）
      const { items } = useClipboardStore.getState();
      expect(items).toHaveLength(2);
    });
  });

  // ============================================================
  // 2.1-INT-EXT-016: 元数据测试
  // ============================================================
  describe('[P3] Metadata Tests', () => {
    it('2.1-INT-EXT-016: should generate correct preview for multi-file selection', () => {
      // GIVEN: 多文件选择
      const data = {
        files: {
          type: 'files' as const,
          value: ['/path/to/file1.txt', '/path/to/file2.pdf', '/path/to/file3.doc'],
          count: 3,
        },
      };

      // WHEN: 检测内容
      const result = detectContent(data);

      // THEN: 预览应该显示文件数量
      expect(result).not.toBeNull();
      expect(result!.previewText).toBe('3 个文件');
      expect(result!.metadata?.fileCount).toBe(3);
    });

    it('2.1-INT-EXT-017: should include dimensions in image metadata', () => {
      // GIVEN: 图片内容
      const data = {
        image: {
          type: 'image' as const,
          value: '/tmp/screenshot.png',
          count: 1,
          width: 2560,
          height: 1440,
        },
      };

      // WHEN: 检测内容
      const result = detectContent(data);

      // THEN: 元数据应该包含尺寸信息
      expect(result).not.toBeNull();
      expect(result!.metadata?.width).toBe(2560);
      expect(result!.metadata?.height).toBe(1440);
      expect(result!.metadata?.dimensions).toBe('2560x1440');
      expect(result!.previewText).toBe('图片 (2560x1440)');
    });
  });
});
