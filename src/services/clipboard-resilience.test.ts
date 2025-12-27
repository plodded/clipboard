/**
 * Story 2.1: 剪贴板监听与内容捕获 - 错误恢复测试
 *
 * 这些测试覆盖重试机制和错误恢复场景：
 * - 指数退避重试行为
 * - 错误回调触发
 * - 部分失败恢复
 *
 * Priority Guide:
 * - [P2] Medium priority, run nightly
 *
 * Test IDs: 2.1-UNIT-RES-{SEQ}
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock tauri-plugin-clipboard-x-api
vi.mock('tauri-plugin-clipboard-x-api', () => ({
  startListening: vi.fn(),
  stopListening: vi.fn(),
  onClipboardChange: vi.fn(),
}));

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock @tauri-apps/plugin-log
vi.mock('@tauri-apps/plugin-log', () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));

import { startListening, onClipboardChange } from 'tauri-plugin-clipboard-x-api';
import {
  startClipboardListening,
  isListening,
  setErrorCallback,
  _resetForTesting,
} from './clipboard';

describe('Story 2.1: Error Recovery and Resilience Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetForTesting();
  });

  afterEach(() => {
    vi.clearAllMocks();
    _resetForTesting();
  });

  // ============================================================
  // 2.1-UNIT-RES-001: 重试机制测试
  // ============================================================
  describe('[P2] Retry Mechanism Tests', () => {
    it('2.1-UNIT-RES-001: should retry with exponential backoff on failure', async () => {
      vi.useFakeTimers();

      // GIVEN: startListening 前两次失败，第三次成功
      let callCount = 0;
      vi.mocked(startListening).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Connection failed'));
        }
        return Promise.resolve();
      });
      vi.mocked(onClipboardChange).mockResolvedValue(() => {});

      // WHEN: 启动监听
      const startPromise = startClipboardListening();

      // 第一次失败后等待 1000ms
      await vi.advanceTimersByTimeAsync(1000);

      // 第二次失败后等待 2000ms
      await vi.advanceTimersByTimeAsync(2000);

      // 第三次应该成功
      await startPromise;

      // THEN: 应该调用了 3 次 startListening
      expect(startListening).toHaveBeenCalledTimes(3);
      expect(isListening()).toBe(true);

      vi.useRealTimers();
    });

    it('2.1-UNIT-RES-002: should respect maximum retry count (5 retries)', async () => {
      vi.useFakeTimers();

      // 捕获 unhandled rejection 防止测试报错
      const unhandledRejections: Error[] = [];
      const nodeHandler = (reason: Error) => {
        if (reason?.message === 'Persistent failure') {
          unhandledRejections.push(reason);
        }
      };
      process.on('unhandledRejection', nodeHandler);

      try {
        // GIVEN: startListening 始终失败
        vi.mocked(startListening).mockRejectedValue(new Error('Persistent failure'));

        // WHEN: 启动监听
        const startPromise = startClipboardListening();

        // 推进足够时间让所有重试完成
        // 1s + 2s + 4s + 8s + 16s = 31s
        await vi.advanceTimersByTimeAsync(32000);

        // THEN: 应该抛出错误
        await expect(startPromise).rejects.toThrow('Persistent failure');

        // 应该调用了 6 次（1 次初始 + 5 次重试）
        expect(startListening).toHaveBeenCalledTimes(6);
        expect(isListening()).toBe(false);
      } finally {
        process.off('unhandledRejection', nodeHandler);
        vi.useRealTimers();
      }
    });

    it('2.1-UNIT-RES-003: should call error callback after max retries', async () => {
      vi.useFakeTimers();

      // 捕获 unhandled rejection
      const nodeHandler = () => {};
      process.on('unhandledRejection', nodeHandler);

      try {
        // GIVEN: 设置错误回调
        const errorCallback = vi.fn();
        setErrorCallback(errorCallback);

        // GIVEN: startListening 始终失败
        vi.mocked(startListening).mockRejectedValue(new Error('Persistent failure'));

        // WHEN: 启动监听
        const startPromise = startClipboardListening();

        // 推进足够时间
        await vi.advanceTimersByTimeAsync(32000);

        // 捕获预期的错误
        await expect(startPromise).rejects.toThrow();

        // THEN: 错误回调应该被调用
        expect(errorCallback).toHaveBeenCalledWith('剪贴板监听启动失败，请重启应用');
      } finally {
        process.off('unhandledRejection', nodeHandler);
        vi.useRealTimers();
      }
    });
  });

  // ============================================================
  // 2.1-UNIT-RES-004: 恢复后状态测试
  // ============================================================
  describe('[P2] Recovery State Tests', () => {
    it('2.1-UNIT-RES-004: should reset retry count after successful recovery', async () => {
      vi.useFakeTimers();

      // GIVEN: 第一次失败，第二次成功
      let callCount = 0;
      vi.mocked(startListening).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First failure'));
        }
        return Promise.resolve();
      });
      vi.mocked(onClipboardChange).mockResolvedValue(() => {});

      // WHEN: 启动监听
      const startPromise = startClipboardListening();

      // 等待第一次重试
      await vi.advanceTimersByTimeAsync(1000);
      await startPromise;

      // THEN: 应该监听中
      expect(isListening()).toBe(true);

      // 重置并再次测试
      _resetForTesting();
      callCount = 0;

      // GIVEN: 再次失败一次然后成功
      const startPromise2 = startClipboardListening();
      await vi.advanceTimersByTimeAsync(1000);
      await startPromise2;

      // THEN: 仍然只调用了 2 次（说明重试计数已重置）
      expect(startListening).toHaveBeenCalledTimes(4); // 2 + 2
      expect(isListening()).toBe(true);

      vi.useRealTimers();
    });

    it('2.1-UNIT-RES-005: should handle immediate success without retry delay', async () => {
      // GIVEN: startListening 立即成功
      vi.mocked(startListening).mockResolvedValue(undefined);
      vi.mocked(onClipboardChange).mockResolvedValue(() => {});

      // WHEN: 启动监听
      const startTime = Date.now();
      await startClipboardListening();
      const duration = Date.now() - startTime;

      // THEN: 应该立即成功（无等待）
      expect(startListening).toHaveBeenCalledTimes(1);
      expect(isListening()).toBe(true);
      expect(duration).toBeLessThan(100); // 应该几乎立即完成
    });
  });

  // ============================================================
  // 2.1-UNIT-RES-006: 错误回调管理测试
  // ============================================================
  describe('[P2] Error Callback Management', () => {
    it('2.1-UNIT-RES-006: should allow clearing error callback', async () => {
      vi.useFakeTimers();

      const nodeHandler = () => {};
      process.on('unhandledRejection', nodeHandler);

      try {
        // GIVEN: 设置然后清除错误回调
        const errorCallback = vi.fn();
        setErrorCallback(errorCallback);
        setErrorCallback(null); // 清除

        // GIVEN: startListening 始终失败
        vi.mocked(startListening).mockRejectedValue(new Error('Failure'));

        // WHEN: 启动监听
        const startPromise = startClipboardListening();
        await vi.advanceTimersByTimeAsync(32000);

        await expect(startPromise).rejects.toThrow();

        // THEN: 错误回调不应该被调用（已清除）
        expect(errorCallback).not.toHaveBeenCalled();
      } finally {
        process.off('unhandledRejection', nodeHandler);
        vi.useRealTimers();
      }
    });

    it('2.1-UNIT-RES-007: should not call error callback on recoverable failure', async () => {
      vi.useFakeTimers();

      // GIVEN: 设置错误回调
      const errorCallback = vi.fn();
      setErrorCallback(errorCallback);

      // GIVEN: 第一次失败，第二次成功
      let callCount = 0;
      vi.mocked(startListening).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve();
      });
      vi.mocked(onClipboardChange).mockResolvedValue(() => {});

      // WHEN: 启动监听
      const startPromise = startClipboardListening();
      await vi.advanceTimersByTimeAsync(1000);
      await startPromise;

      // THEN: 错误回调不应该被调用（因为最终成功了）
      expect(errorCallback).not.toHaveBeenCalled();
      expect(isListening()).toBe(true);

      vi.useRealTimers();
    });
  });

  // ============================================================
  // 2.1-UNIT-RES-008: 并发启动保护测试
  // ============================================================
  describe('[P2] Concurrent Start Protection', () => {
    it('2.1-UNIT-RES-008: should return existing unlisten if already listening', async () => {
      // GIVEN: 已经在监听
      const mockUnlisten = vi.fn();
      vi.mocked(startListening).mockResolvedValue(undefined);
      vi.mocked(onClipboardChange).mockResolvedValue(mockUnlisten);

      // 第一次启动
      const unlisten1 = await startClipboardListening();

      // WHEN: 再次尝试启动
      const unlisten2 = await startClipboardListening();

      // THEN: 应该返回相同的 unlisten 函数
      expect(unlisten2).toBe(unlisten1);

      // 应该只调用一次 startListening
      expect(startListening).toHaveBeenCalledTimes(1);
    });
  });
});
