/**
 * Story 2.2: SQLite 数据持久化 - 数据库服务层
 *
 * 使用 tauri-plugin-sql 提供 SQLite 数据库操作
 * 实现剪贴板历史的 CRUD 操作
 */

import Database from '@tauri-apps/plugin-sql';
import { error as logError } from '@tauri-apps/plugin-log';
import { ClipboardType } from '@/types';
import type { ClipboardItem } from '@/types';

/**
 * 数据库记录类型（字段使用 snake_case）
 * 与 ClipboardItem 的映射关系：
 * - previewText → preview_text
 * - isStarred → is_starred
 * - metadata.appName → app_name
 * - metadata (object) → metadata (JSON string)
 */
export interface DbClipboardItem {
  id: string;
  type: string;
  content: string;
  preview_text: string | null;
  timestamp: number;
  is_starred: number; // 0 or 1
  app_name: string | null;
  metadata: string | null; // JSON serialized metadata (excluding appName)
}

// 数据库单例
let db: Database | null = null;

/**
 * 重置数据库连接（仅用于测试）
 */
export function resetDatabase(): void {
  db = null;
}

/**
 * 初始化数据库连接
 * @returns Database 实例
 */
export async function initDatabase(): Promise<Database> {
  if (db) return db;

  try {
    db = await Database.load('sqlite:macpaste.db');
    return db;
  } catch (err) {
    const message = `Failed to initialize database: ${err}`;
    await logError(message);
    throw new Error(message);
  }
}

/**
 * 获取剪贴板历史记录
 * @param limit 每页数量，默认 100
 * @param offset 偏移量，默认 0
 * @returns 剪贴板项目数组（按时间戳降序）
 */
export async function getClipboardItems(
  limit: number = 100,
  offset: number = 0
): Promise<ClipboardItem[]> {
  try {
    const database = await initDatabase();
    const dbItems = await database.select<DbClipboardItem[]>(
      'SELECT * FROM clipboard_items ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return dbItems.map(fromDbItem);
  } catch (err) {
    const message = `Failed to fetch clipboard items: ${err}`;
    await logError(message);
    throw new Error(message);
  }
}

/**
 * 保存剪贴板项目到数据库
 * @param item 剪贴板项目
 */
export async function saveClipboardItem(item: ClipboardItem): Promise<void> {
  try {
    const database = await initDatabase();
    const dbItem = toDbItem(item);
    await database.execute(
      `INSERT INTO clipboard_items
       (id, type, content, preview_text, timestamp, is_starred, app_name, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        dbItem.id,
        dbItem.type,
        dbItem.content,
        dbItem.preview_text,
        dbItem.timestamp,
        dbItem.is_starred,
        dbItem.app_name,
        dbItem.metadata,
      ]
    );
  } catch (err) {
    const message = `Failed to save clipboard item: ${err}`;
    await logError(message);
    throw new Error(message);
  }
}

/**
 * 从数据库删除剪贴板项目
 * @param id 项目 ID
 */
export async function deleteClipboardItem(id: string): Promise<void> {
  try {
    const database = await initDatabase();
    await database.execute('DELETE FROM clipboard_items WHERE id = $1', [id]);
  } catch (err) {
    const message = `Failed to delete clipboard item: ${err}`;
    await logError(message);
    throw new Error(message);
  }
}

/**
 * 更新项目时间戳（用于去重时更新已存在的记录）
 * @param id 项目 ID
 */
export async function updateItemTimestamp(id: string): Promise<void> {
  try {
    const database = await initDatabase();
    await database.execute(
      'UPDATE clipboard_items SET timestamp = $1 WHERE id = $2',
      [Date.now(), id]
    );
  } catch (err) {
    const message = `Failed to update item timestamp: ${err}`;
    await logError(message);
    throw new Error(message);
  }
}

/**
 * 将 ClipboardItem 转换为 DbClipboardItem
 * 处理 camelCase → snake_case 和 metadata 序列化
 */
export function toDbItem(item: ClipboardItem): DbClipboardItem {
  // 提取 appName 从 metadata，剩余字段序列化为 JSON
  const appName = item.metadata?.appName || null;

  // 创建不包含 appName 的 metadata 副本用于存储
  let metadataJson: string | null = null;
  if (item.metadata) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { appName: _, ...restMetadata } = item.metadata;
    if (Object.keys(restMetadata).length > 0) {
      metadataJson = JSON.stringify(restMetadata);
    }
  }

  return {
    id: item.id,
    type: item.type, // ClipboardType 枚举值直接存储
    content: item.content,
    preview_text: item.previewText || null,
    timestamp: item.timestamp,
    is_starred: item.isStarred ? 1 : 0,
    app_name: appName,
    metadata: metadataJson,
  };
}

/**
 * 将 DbClipboardItem 转换为 ClipboardItem
 * 处理 snake_case → camelCase 和 metadata 反序列化
 */
export function fromDbItem(dbItem: DbClipboardItem): ClipboardItem {
  // 重建 metadata 对象
  let metadata: ClipboardItem['metadata'] | undefined = undefined;

  // 解析 JSON metadata
  if (dbItem.metadata) {
    try {
      metadata = JSON.parse(dbItem.metadata);
    } catch {
      // 如果 JSON 解析失败，忽略 metadata
    }
  }

  // 添加 appName 到 metadata
  if (dbItem.app_name) {
    metadata = { ...metadata, appName: dbItem.app_name };
  }

  return {
    id: dbItem.id,
    type: dbItem.type as ClipboardType,
    content: dbItem.content,
    previewText: dbItem.preview_text || undefined,
    timestamp: dbItem.timestamp,
    isStarred: dbItem.is_starred === 1,
    metadata: metadata,
  };
}
