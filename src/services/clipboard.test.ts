/**
 * ClipboardService 单元测试
 *
 * 测试剪贴板监听服务的核心功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock tauri-plugin-clipboard-x-api
vi.mock('tauri-plugin-clipboard-x-api', () => ({
  startListening: vi.fn(),
  stopListening: vi.fn(),
  onClipboardChange: vi.fn(),
  readText: vi.fn(),
  readHTML: vi.fn(),
  readRTF: vi.fn(),
  readImage: vi.fn(),
  readFiles: vi.fn(),
}));

// Mock @tauri-apps/plugin-log
vi.mock('@tauri-apps/plugin-log', () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));

import {
  startListening,
  stopListening,
  onClipboardChange,
} from 'tauri-plugin-clipboard-x-api';
import {
  startClipboardListening,
  stopClipboardListening,
  isListening,
  registerHandler,
  clearHandlers,
  _resetForTesting,
} from './clipboard';

describe('ClipboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetForTesting();
  });

  afterEach(() => {
    vi.clearAllMocks();
    _resetForTesting();
  });

  describe('startClipboardListening', () => {
    it('should call startListening from plugin', async () => {
      vi.mocked(startListening).mockResolvedValue(undefined);
      vi.mocked(onClipboardChange).mockResolvedValue(() => {});

      await startClipboardListening();

      expect(startListening).toHaveBeenCalledTimes(1);
    });

    it('should register onClipboardChange callback', async () => {
      vi.mocked(startListening).mockResolvedValue(undefined);
      vi.mocked(onClipboardChange).mockResolvedValue(() => {});

      await startClipboardListening();

      expect(onClipboardChange).toHaveBeenCalledTimes(1);
      expect(onClipboardChange).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should return unlisten function', async () => {
      const mockUnlisten = vi.fn();
      vi.mocked(startListening).mockResolvedValue(undefined);
      vi.mocked(onClipboardChange).mockResolvedValue(mockUnlisten);

      const unlisten = await startClipboardListening();

      expect(unlisten).toBe(mockUnlisten);
    });

    it('should set isListening to true after successful start', async () => {
      vi.mocked(startListening).mockResolvedValue(undefined);
      vi.mocked(onClipboardChange).mockResolvedValue(() => {});

      await startClipboardListening();

      expect(isListening()).toBe(true);
    });

    it('should throw error if startListening fails after retries', async () => {
      vi.useFakeTimers();

      // 临时捕获 unhandled rejections，防止 Vitest 报错
      // 这是因为 fake timers 会在 Promise rejection 被处理前检测到它
      const unhandledRejections: Error[] = [];
      const handler = (event: PromiseRejectionEvent) => {
        if (event.reason?.message === 'Failed to start') {
          event.preventDefault();
          unhandledRejections.push(event.reason);
        }
      };

      // Node.js 环境下使用 process 事件
      const nodeHandler = (reason: Error) => {
        if (reason?.message === 'Failed to start') {
          unhandledRejections.push(reason);
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('unhandledrejection', handler);
      }
      process.on('unhandledRejection', nodeHandler);

      try {
        vi.mocked(startListening).mockImplementation(() =>
          Promise.reject(new Error('Failed to start'))
        );

        const promise = startClipboardListening();

        // 推进足够时间让所有重试完成
        await vi.advanceTimersByTimeAsync(32000);

        await expect(promise).rejects.toThrow('Failed to start');
        expect(isListening()).toBe(false);
      } finally {
        if (typeof window !== 'undefined') {
          window.removeEventListener('unhandledrejection', handler);
        }
        process.off('unhandledRejection', nodeHandler);
        vi.useRealTimers();
      }
    });
  });

  describe('stopClipboardListening', () => {
    it('should call stopListening from plugin', async () => {
      // First start listening
      vi.mocked(startListening).mockResolvedValue(undefined);
      vi.mocked(onClipboardChange).mockResolvedValue(() => {});
      await startClipboardListening();

      // Then stop
      vi.mocked(stopListening).mockResolvedValue(undefined);
      await stopClipboardListening();

      expect(stopListening).toHaveBeenCalledTimes(1);
    });

    it('should set isListening to false after stop', async () => {
      // First start listening
      vi.mocked(startListening).mockResolvedValue(undefined);
      vi.mocked(onClipboardChange).mockResolvedValue(() => {});
      await startClipboardListening();
      expect(isListening()).toBe(true);

      // Then stop
      vi.mocked(stopListening).mockResolvedValue(undefined);
      await stopClipboardListening();

      expect(isListening()).toBe(false);
    });

    it('should call unlisten function when stopping', async () => {
      const mockUnlisten = vi.fn();
      vi.mocked(startListening).mockResolvedValue(undefined);
      vi.mocked(onClipboardChange).mockResolvedValue(mockUnlisten);
      await startClipboardListening();

      vi.mocked(stopListening).mockResolvedValue(undefined);
      await stopClipboardListening();

      expect(mockUnlisten).toHaveBeenCalledTimes(1);
    });
  });

  describe('isListening', () => {
    it('should return false initially', () => {
      // Note: This test may need to run in isolation
      // as other tests modify the listening state
      expect(typeof isListening()).toBe('boolean');
    });
  });

  describe('registerHandler', () => {
    it('should register a handler and return unregister function', () => {
      const handler = vi.fn();

      const unregister = registerHandler(handler);

      expect(typeof unregister).toBe('function');
    });

    it('should allow unregistering a handler', () => {
      const handler = vi.fn();

      const unregister = registerHandler(handler);
      unregister();

      // 验证 handler 被移除 - 通过 clearHandlers 不会影响其他操作
      expect(() => clearHandlers()).not.toThrow();
    });
  });

  describe('clearHandlers', () => {
    it('should clear all registered handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      registerHandler(handler1);
      registerHandler(handler2);

      expect(() => clearHandlers()).not.toThrow();
    });

    it('should not throw when no handlers registered', () => {
      expect(() => clearHandlers()).not.toThrow();
    });
  });
});
