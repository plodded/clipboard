/**
 * ClipboardService - 剪贴板监听服务
 *
 * 提供剪贴板监听的启动、停止和事件处理功能。
 * 使用 tauri-plugin-clipboard-x 插件实现跨平台剪贴板访问。
 *
 * @module services/clipboard
 */

import {
  startListening as pluginStartListening,
  stopListening as pluginStopListening,
  onClipboardChange,
  type ReadClipboard,
} from 'tauri-plugin-clipboard-x-api';
import { info, error as logError, debug } from '@tauri-apps/plugin-log';
import { handleClipboardContent } from './clipboardHandler';

// ============================================================
// 类型定义
// ============================================================

/**
 * 剪贴板变化回调函数类型
 */
export type ClipboardChangeHandler = (data: ReadClipboard) => void;

/**
 * 解除监听函数类型
 */
export type UnlistenFn = () => void;

// ============================================================
// 常量
// ============================================================

/** 最大重试次数 */
const MAX_RETRIES = 5;

/** 初始重试延迟（毫秒） */
const INITIAL_RETRY_DELAY = 1000;

// ============================================================
// 模块状态
// ============================================================

/** 当前是否正在监听 */
let listening = false;

/** 当前的 unlisten 函数 */
let currentUnlisten: UnlistenFn | null = null;

/** 注册的回调处理函数列表 */
const handlers: Set<ClipboardChangeHandler> = new Set();

/** 当前重试次数 */
let retryCount = 0;

/** 重试定时器 ID */
let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

// ============================================================
// 公共 API
// ============================================================

/**
 * 检查是否正在监听剪贴板
 */
export function isListening(): boolean {
  return listening;
}

/**
 * 错误回调函数类型
 */
export type ErrorCallback = (message: string) => void;

/** 错误回调 */
let errorCallback: ErrorCallback | null = null;

/**
 * 设置错误回调（用于显示 Toast）
 */
export function setErrorCallback(callback: ErrorCallback | null): void {
  errorCallback = callback;
}

/**
 * 启动剪贴板监听
 *
 * @returns 返回 unlisten 函数用于停止监听
 * @throws 如果启动失败则抛出错误
 *
 * @example
 * ```ts
 * const unlisten = await startClipboardListening();
 * // 稍后停止监听
 * unlisten();
 * ```
 */
export async function startClipboardListening(): Promise<UnlistenFn> {
  if (listening) {
    debug('Clipboard listening already started, skipping');
    return currentUnlisten!;
  }

  // 清除之前的重试状态
  retryCount = 0;
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }

  return startListeningInternal();
}

/**
 * 内部启动函数（支持重试）
 * 使用纯 Promise 链而非 async/await，确保 rejection 立即被处理，
 * 避免 Vitest fake timers 下的 unhandled rejection 问题。
 */
function startListeningInternal(): Promise<UnlistenFn> {
  return pluginStartListening()
    .then(() => {
      info('Clipboard listening started');
      return onClipboardChange(
        handleClipboardChangeInternal,
        { beforeRead: () => debug('Reading clipboard content...') }
      );
    })
    .then((unlisten) => {
      currentUnlisten = unlisten;
      listening = true;
      retryCount = 0; // 重置重试计数
      return currentUnlisten;
    })
    .catch((err): Promise<UnlistenFn> => {
      logError(`Failed to start clipboard listening: ${err}`);
      listening = false;

      // 尝试重试
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        retryCount++;
        info(`Retrying clipboard listening in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);

        return new Promise<UnlistenFn>((resolve, reject) => {
          retryTimeoutId = setTimeout(() => {
            startListeningInternal().then(resolve).catch(reject);
          }, delay);
        });
      }

      // 超过最大重试次数
      const errorMsg = '剪贴板监听启动失败，请重启应用';
      logError(`Max retries (${MAX_RETRIES}) exceeded for clipboard listening`);
      if (errorCallback) {
        errorCallback(errorMsg);
      }
      throw err;
    });
}

/**
 * 停止剪贴板监听
 */
export async function stopClipboardListening(): Promise<void> {
  if (!listening) {
    debug('Clipboard listening not started, skipping stop');
    return;
  }

  try {
    // 调用 unlisten 函数
    if (currentUnlisten) {
      currentUnlisten();
      currentUnlisten = null;
    }

    // 停止插件监听
    await pluginStopListening();
    listening = false;
    info('Clipboard listening stopped');
  } catch (err) {
    logError(`Failed to stop clipboard listening: ${err}`);
    throw err;
  }
}

/**
 * 注册剪贴板变化处理函数
 *
 * @param handler 处理函数
 * @returns 返回取消注册的函数
 */
export function registerHandler(handler: ClipboardChangeHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/**
 * 清除所有处理函数
 */
export function clearHandlers(): void {
  handlers.clear();
}

/**
 * 重置服务状态（仅用于测试）
 * @internal
 */
export function _resetForTesting(): void {
  listening = false;
  currentUnlisten = null;
  handlers.clear();
  retryCount = 0;
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
  errorCallback = null;
}

// ============================================================
// 内部函数
// ============================================================

/**
 * 处理剪贴板变化事件
 *
 * @param data 剪贴板内容数据
 */
async function handleClipboardChangeInternal(data: ReadClipboard): Promise<void> {
  debug(`Clipboard changed: ${JSON.stringify(Object.keys(data))}`);

  // 首先调用内置处理器（内容处理和存储）
  try {
    handleClipboardContent(data);
  } catch (err) {
    logError(`Content handler error: ${err}`);
  }

  // 然后调用所有注册的外部处理函数
  handlers.forEach((handler) => {
    try {
      handler(data);
    } catch (err) {
      logError(`Handler error: ${err}`);
    }
  });
}
