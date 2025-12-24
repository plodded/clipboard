/**
 * 剪贴板数据工厂
 *
 * 用于生成测试用的剪贴板条目数据。
 * 使用 faker.js 生成随机但可控的测试数据。
 */

import { faker } from '@faker-js/faker'

/**
 * 剪贴板条目类型
 */
export type ClipboardContentType = 'text' | 'image' | 'file' | 'html'

/**
 * 剪贴板条目接口
 */
export interface ClipboardItem {
  id: number
  content_type: ClipboardContentType
  text_content: string | null
  html_content: string | null
  image_path: string | null
  file_paths: string[] | null
  source_app: string | null
  created_at: number
  is_pinned: boolean
  is_favorite: boolean
}

/**
 * 创建剪贴板条目的选项
 */
export interface CreateClipboardItemOptions {
  id?: number
  content_type?: ClipboardContentType
  text_content?: string | null
  html_content?: string | null
  image_path?: string | null
  file_paths?: string[] | null
  source_app?: string | null
  created_at?: number
  is_pinned?: boolean
  is_favorite?: boolean
}

/**
 * 生成一个剪贴板条目
 *
 * @example
 * ```ts
 * // 生成随机文本条目
 * const item = createClipboardItem()
 *
 * // 生成图片条目
 * const image = createClipboardItem({ content_type: 'image' })
 *
 * // 覆盖特定字段
 * const pinned = createClipboardItem({ is_pinned: true })
 * ```
 */
export function createClipboardItem(
  overrides: CreateClipboardItemOptions = {}
): ClipboardItem {
  const contentType = overrides.content_type ?? 'text'

  const base: ClipboardItem = {
    id: overrides.id ?? faker.number.int({ min: 1, max: 10000 }),
    content_type: contentType,
    text_content: null,
    html_content: null,
    image_path: null,
    file_paths: null,
    source_app: overrides.source_app ?? faker.helpers.arrayElement([
      'com.apple.Safari',
      'com.apple.dt.Xcode',
      'com.microsoft.VSCode',
      'com.google.Chrome',
      'com.apple.Terminal',
    ]),
    created_at: overrides.created_at ?? Date.now(),
    is_pinned: overrides.is_pinned ?? false,
    is_favorite: overrides.is_favorite ?? false,
  }

  // 根据内容类型填充数据
  switch (contentType) {
    case 'text':
      base.text_content =
        overrides.text_content ?? faker.lorem.paragraph()
      break
    case 'html':
      base.text_content =
        overrides.text_content ?? faker.lorem.paragraph()
      base.html_content =
        overrides.html_content ??
        `<p>${faker.lorem.paragraph()}</p>`
      break
    case 'image':
      base.image_path =
        overrides.image_path ??
        `images/${faker.string.uuid()}.png`
      break
    case 'file':
      base.file_paths =
        overrides.file_paths ?? [
          `/Users/test/Documents/${faker.system.fileName()}`,
          `/Users/test/Documents/${faker.system.fileName()}`,
        ]
      break
  }

  return base
}

/**
 * 生成多个剪贴板条目
 *
 * @example
 * ```ts
 * // 生成 10 个随机条目
 * const items = createClipboardItems(10)
 *
 * // 生成 5 个文本条目
 * const textItems = createClipboardItems(5, { content_type: 'text' })
 * ```
 */
export function createClipboardItems(
  count: number,
  overrides: CreateClipboardItemOptions = {}
): ClipboardItem[] {
  return Array.from({ length: count }, (_, index) =>
    createClipboardItem({
      ...overrides,
      id: overrides.id ?? index + 1,
      created_at: overrides.created_at ?? Date.now() - index * 60000, // 每条间隔 1 分钟
    })
  )
}

/**
 * 剪贴板历史工厂类
 *
 * 用于需要追踪创建的条目并进行清理的场景。
 */
export class ClipboardFactory {
  private createdItems: ClipboardItem[] = []

  /**
   * 创建并追踪一个条目
   */
  create(overrides: CreateClipboardItemOptions = {}): ClipboardItem {
    const item = createClipboardItem(overrides)
    this.createdItems.push(item)
    return item
  }

  /**
   * 创建并追踪多个条目
   */
  createMany(
    count: number,
    overrides: CreateClipboardItemOptions = {}
  ): ClipboardItem[] {
    const items = createClipboardItems(count, overrides)
    this.createdItems.push(...items)
    return items
  }

  /**
   * 获取所有已创建的条目
   */
  getCreated(): ClipboardItem[] {
    return [...this.createdItems]
  }

  /**
   * 清理所有创建的条目
   * (在 fixture 的 teardown 中调用)
   */
  cleanup(): void {
    this.createdItems = []
  }
}
