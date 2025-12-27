/**
 * ClipboardHandler - 剪贴板内容处理器
 *
 * 处理剪贴板变化事件，将内容转换为 ClipboardItem 并添加到 Store。
 * 包含内容类型检测、去重逻辑和预览文本生成。
 *
 * @module services/clipboardHandler
 */

import type { ReadClipboard } from 'tauri-plugin-clipboard-x-api';
import { ClipboardType } from '@/types';
import type { ClipboardItem } from '@/types';
import { useClipboardStore } from '@/stores/clipboardStore';
import { stripHtml, generateId } from '@/utils';
import { debug, info } from '@tauri-apps/plugin-log';
import { getLastFrontmostApp } from './clipboard';

// ============================================================
// 常量
// ============================================================

/** 预览文本最大长度 */
const MAX_PREVIEW_LENGTH = 100;

/** 默认来源应用名称（插件不支持获取来源应用） */
const DEFAULT_APP_NAME = 'Unknown App';

// ============================================================
// 类型定义
// ============================================================

/**
 * 检测到的内容类型和数据
 */
interface DetectedContent {
  type: ClipboardType;
  content: string;
  previewText: string;
  metadata?: {
    appName?: string;
    dimensions?: string;
    size?: string;
    width?: number;
    height?: number;
    fileCount?: number;
  };
}

// ============================================================
// 内容检测函数
// ============================================================

/**
 * 从 ReadClipboard 检测并提取主要内容
 *
 * 按优先级顺序检测：Files → Image → HTML → RTF → Text
 *
 * 注意：Files 必须优先于 Image，因为 macOS 复制文件时会同时包含：
 * - 文件路径（public.file-url）
 * - 文件图标（作为图像数据）
 * 如果先检测图片，文件复制会被错误识别为图标图像
 */
export function detectContent(data: ReadClipboard): DetectedContent | null {
  // 1. 检测文件（优先于图片，避免将文件图标误识别为图片）
  if (data.files && data.files.value.length > 0) {
    const paths = data.files.value;
    const fileCount = paths.length;
    const previewText = fileCount === 1
      ? paths[0].split('/').pop() || '文件'
      : `${fileCount} 个文件`;

    return {
      type: ClipboardType.File,
      content: JSON.stringify(paths), // 存储为 JSON 字符串
      previewText,
      metadata: {
        appName: DEFAULT_APP_NAME,
        size: `${fileCount} 个文件`,
        fileCount,
      },
    };
  }

  // 2. 检测图片
  if (data.image) {
    const { value, width, height } = data.image;
    return {
      type: ClipboardType.Image,
      content: value, // 图片文件路径
      previewText: `图片 (${width}x${height})`,
      metadata: {
        appName: DEFAULT_APP_NAME,
        dimensions: `${width}x${height}`,
        width,
        height,
      },
    };
  }

  // 3. 检测 HTML（优先于纯文本，保存原始格式）
  if (data.html && data.html.value) {
    const htmlContent = data.html.value;
    const plainText = stripHtml(htmlContent);
    const previewText = truncateText(plainText, MAX_PREVIEW_LENGTH);

    return {
      type: ClipboardType.Text, // HTML 存储为 Text 类型，元数据中标记为 HTML
      content: htmlContent,
      previewText,
      metadata: {
        appName: DEFAULT_APP_NAME,
      },
    };
  }

  // 4. 检测 RTF（包含格式化信息的富文本）
  if (data.rtf && data.rtf.value) {
    const rtfContent = data.rtf.value;
    // RTF 内容提取纯文本预览较复杂，使用纯文本作为预览
    const plainText = data.text?.value || '';
    const previewText = truncateText(plainText, MAX_PREVIEW_LENGTH);

    return {
      type: ClipboardType.RTF,
      content: rtfContent,
      previewText: previewText || 'RTF 内容',
      metadata: {
        appName: DEFAULT_APP_NAME,
      },
    };
  }

  // 5. 检测纯文本（最低优先级）
  if (data.text && data.text.value) {
    const textContent = data.text.value;
    const previewText = truncateText(textContent, MAX_PREVIEW_LENGTH);

    return {
      type: ClipboardType.Text,
      content: textContent,
      previewText,
      metadata: {
        appName: DEFAULT_APP_NAME,
      },
    };
  }

  // 无有效内容
  return null;
}

/**
 * 截取文本到指定长度
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength) + '...';
}

// ============================================================
// 去重逻辑
// ============================================================

/**
 * 查找重复内容
 *
 * @returns 返回重复项的 ID，如果没有重复则返回 null
 */
export function findDuplicateId(
  newContent: DetectedContent,
  existingItems: ClipboardItem[]
): string | null {
  for (const item of existingItems) {
    if (item.type !== newContent.type) continue;

    switch (newContent.type) {
      case ClipboardType.Text:
      case ClipboardType.RTF:
        // 比较内容字符串
        if (item.content === newContent.content) {
          return item.id;
        }
        break;

      case ClipboardType.Image:
        // 使用路径比较去重（不用尺寸，因为多次截屏尺寸相同但内容不同）
        // 路径比较可以正确处理：
        // - 同一次截屏触发两次事件 → 路径相同 → 去重 ✅
        // - 多次截屏不同图片 → 每次生成新路径 → 不去重 ✅
        if (item.content === newContent.content) {
          return item.id;
        }
        break;

      case ClipboardType.File:
        // 比较文件路径列表
        if (item.content === newContent.content) {
          return item.id;
        }
        break;
    }
  }

  return null;
}

// ============================================================
// 主处理函数
// ============================================================

/**
 * 处理剪贴板变化事件
 *
 * 这是注册到 clipboard service 的主处理函数。
 * 负责内容检测、去重和添加到 Store。
 */
export function handleClipboardContent(data: ReadClipboard): void {
  debug(`Processing clipboard content: ${JSON.stringify(Object.keys(data))}`);

  // 1. 检测内容类型
  const detected = detectContent(data);
  if (!detected) {
    debug('No valid content detected, skipping');
    return;
  }

  // 2. 获取来源应用名称（在 beforeRead 回调中已更新）
  const appName = getLastFrontmostApp();
  if (detected.metadata) {
    detected.metadata.appName = appName;
  }
  debug(`Source app: ${appName}`);

  // 3. 获取 Store
  const store = useClipboardStore.getState();
  const { items, addItem } = store;

  // 4. 检查去重
  const duplicateId = findDuplicateId(detected, items);
  if (duplicateId) {
    debug(`Duplicate content found: ${duplicateId}, updating timestamp`);
    // 更新时间戳并移到顶部
    updateItemTimestamp(duplicateId);
    return;
  }

  // 5. 创建新的 ClipboardItem
  const newItem: ClipboardItem = {
    id: generateId(),
    type: detected.type,
    content: detected.content,
    previewText: detected.previewText,
    timestamp: Date.now(),
    isStarred: false,
    metadata: detected.metadata,
  };

  // 6. 添加到 Store
  addItem(newItem);
  info(`Added new clipboard item: ${newItem.type} - ${newItem.id}`);
}

/**
 * 更新已存在项的时间戳并移到顶部
 */
function updateItemTimestamp(id: string): void {
  const store = useClipboardStore.getState();
  const { items, setItems } = store;

  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return;

  const updatedItem = {
    ...items[index],
    timestamp: Date.now(),
  };

  // 移除旧位置，添加到顶部
  const newItems = [
    updatedItem,
    ...items.slice(0, index),
    ...items.slice(index + 1),
  ];

  setItems(newItems);
  info(`Updated timestamp for item: ${id}`);
}
