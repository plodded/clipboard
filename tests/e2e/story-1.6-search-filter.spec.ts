/**
 * Story 1.6: 搜索过滤与收藏功能验证
 *
 * 验证搜索、过滤和收藏功能在新架构下正常工作。
 *
 * FRs covered: FR11, FR12, FR13, FR14, FR15, FR29, FR30, FR31, FR32, FR33
 */

import { test, expect } from '@playwright/test'

test.describe('Story 1.6: Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('should display search input with placeholder', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await expect(searchInput).toBeVisible()
  })

  test('should filter list when typing in search box', async ({ page }) => {
    // 获取初始卡片数量
    const initialCards = page.locator('[class*="w-[220px]"]')
    const initialCount = await initialCards.count()

    // 输入搜索关键词
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await searchInput.fill('git')

    // 等待过滤
    await page.waitForTimeout(200)

    // 验证结果数量减少
    const filteredCards = page.locator('[class*="w-[220px]"]')
    const filteredCount = await filteredCards.count()

    expect(filteredCount).toBeLessThan(initialCount)
  })

  test('should show empty state when no results match', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await searchInput.fill('这是一个不存在的搜索词xyz123')

    await page.waitForTimeout(200)

    // 验证显示空状态提示（实际文本是"没有匹配结果"）
    const emptyState = page.locator('text=没有匹配结果')
    await expect(emptyState).toBeVisible()
  })

  test('should clear search and show all items', async ({ page }) => {
    // 先搜索
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await searchInput.fill('git')
    await page.waitForTimeout(200)

    // 清除搜索
    await searchInput.clear()
    await page.waitForTimeout(200)

    // 验证显示所有项目（初始 8 项）
    const cards = page.locator('[class*="w-[220px]"]')
    const count = await cards.count()
    expect(count).toBe(8)
  })
})

test.describe('Story 1.6: Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('should display all filter buttons', async ({ page }) => {
    // 过滤栏在一个特定的容器中，使用更精确的选择器
    const filterBar = page.locator('.bg-black\\/40.backdrop-blur-md')
    await expect(filterBar.getByRole('button', { name: '全部' })).toBeVisible()
    await expect(filterBar.getByRole('button', { name: '文本' })).toBeVisible()
    await expect(filterBar.getByRole('button', { name: '图片' })).toBeVisible()
    await expect(filterBar.getByRole('button', { name: '文件' })).toBeVisible()
    await expect(filterBar.getByRole('button', { name: '收藏' })).toBeVisible()
  })

  test('should filter by Image type', async ({ page }) => {
    // 点击图片过滤
    await page.getByRole('button', { name: '图片' }).click()
    await page.waitForTimeout(200)

    // 验证结果计数（初始数据有 2 个图片）
    const resultCount = page.locator('text=/\\d+ 项/')
    await expect(resultCount).toContainText('2 项')
  })

  test('should filter by File type', async ({ page }) => {
    // 点击文件过滤
    await page.getByRole('button', { name: '文件' }).click()
    await page.waitForTimeout(200)

    // 验证结果计数（初始数据有 1 个文件）
    const resultCount = page.locator('text=/\\d+ 项/')
    await expect(resultCount).toContainText('1 项')
  })

  test('should filter by Text type (includes RTF)', async ({ page }) => {
    // 点击文本过滤
    await page.getByRole('button', { name: '文本' }).click()
    await page.waitForTimeout(200)

    // 验证结果计数（初始数据有 5 个文本/RTF）
    const resultCount = page.locator('text=/\\d+ 项/')
    await expect(resultCount).toContainText('5 项')
  })

  test('should show all items when All filter selected', async ({ page }) => {
    // 先选择其他过滤
    await page.getByRole('button', { name: '图片' }).click()
    await page.waitForTimeout(100)

    // 再选择全部
    await page.getByRole('button', { name: '全部' }).click()
    await page.waitForTimeout(200)

    // 验证显示全部 8 项
    const resultCount = page.locator('text=/\\d+ 项/')
    await expect(resultCount).toContainText('8 项')
  })

  test('should highlight active filter button', async ({ page }) => {
    // 点击图片过滤
    const imageButton = page.getByRole('button', { name: '图片' })
    await imageButton.click()
    await page.waitForTimeout(100)

    // 验证按钮有活跃样式（白色背景）
    await expect(imageButton).toHaveClass(/bg-white/)
  })
})

test.describe('Story 1.6: Star/Favorite Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('should toggle star status on click', async ({ page }) => {
    // 找到第一个未收藏项的星号按钮
    const unstarredButton = page.locator('button[title="收藏"]').first()
    await unstarredButton.click()

    // 验证状态变化（title 变为"取消收藏"）
    const starredButton = page.locator('button[title="取消收藏"]').first()
    await expect(starredButton).toBeVisible()
  })

  test('should show starred items with yellow star', async ({ page }) => {
    // 验证已收藏项有黄色星号（使用 text-yellow-400 类名）
    const yellowStarButtons = page.locator('button.text-yellow-400')
    const count = await yellowStarButtons.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should filter starred items only', async ({ page }) => {
    // 使用过滤栏容器中的收藏按钮
    const filterBar = page.locator('.bg-black\\/40.backdrop-blur-md')
    await filterBar.getByRole('button', { name: '收藏' }).click()
    await page.waitForTimeout(200)

    // 验证结果计数（初始数据有 2 个收藏）
    const resultCount = page.locator('text=/\\d+ 项/')
    await expect(resultCount).toContainText('2 项')

    // 验证所有显示的卡片都有黄色星号
    const cards = page.locator('[class*="w-[220px]"]')
    const cardCount = await cards.count()
    const yellowStarButtons = page.locator('button.text-yellow-400')
    const starCount = await yellowStarButtons.count()

    expect(starCount).toBe(cardCount)
  })
})

test.describe('Story 1.6: Content Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('should display type icons for each card', async ({ page }) => {
    // 验证卡片包含类型图标（lucide-react 图标）
    const icons = page.locator('svg.w-3.h-3')
    const iconCount = await icons.count()
    expect(iconCount).toBeGreaterThan(0)
  })

  test('should display relative timestamps', async ({ page }) => {
    // 验证有相对时间显示（如 "刚刚"、"分钟前" 等）
    const hasTimestamp = await page.locator('text=/刚刚|分钟前|小时前/').count()
    expect(hasTimestamp).toBeGreaterThan(0)
  })

  test('should display app name in card header', async ({ page }) => {
    // 验证显示应用名（如 VS Code、Notes 等）
    const hasAppName = await page.locator('text=/VS Code|Notes|Mail|Finder|Safari|Preview/').count()
    expect(hasAppName).toBeGreaterThan(0)
  })

  test('should display image thumbnail for image type', async ({ page }) => {
    // 点击图片过滤只看图片
    await page.getByRole('button', { name: '图片' }).click()
    await page.waitForTimeout(200)

    // 验证有 img 元素
    const images = page.locator('img[class*="object-cover"]')
    const imageCount = await images.count()
    expect(imageCount).toBeGreaterThan(0)
  })

  test('should display text content preview', async ({ page }) => {
    // 点击文本过滤
    await page.getByRole('button', { name: '文本' }).click()
    await page.waitForTimeout(200)

    // 验证有文本内容预览
    const textContent = page.locator('[class*="font-mono"]')
    const count = await textContent.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Story 1.6: Combined Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('should apply both search and filter together', async ({ page }) => {
    // 先选择文本过滤
    await page.getByRole('button', { name: '文本' }).click()
    await page.waitForTimeout(100)

    // 再输入搜索
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await searchInput.fill('git')
    await page.waitForTimeout(200)

    // 验证结果数量进一步减少
    const cards = page.locator('[class*="w-[220px]"]')
    const count = await cards.count()
    expect(count).toBeLessThanOrEqual(5) // 文本最多 5 个，搜索后更少
  })

  test('should show result count update in real-time', async ({ page }) => {
    const resultCount = page.locator('text=/\\d+ 项/')

    // 初始 8 项
    await expect(resultCount).toContainText('8 项')

    // 搜索后减少
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await searchInput.fill('git')
    await page.waitForTimeout(200)

    // 验证计数更新
    const newCount = await resultCount.textContent()
    expect(newCount).not.toContain('8 项')
  })
})
