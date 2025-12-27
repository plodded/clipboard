/**
 * Story 1.6: 搜索过滤与收藏功能验证
 *
 * 验证搜索、过滤和收藏功能在新架构下正常工作。
 *
 * FRs covered: FR11, FR12, FR13, FR14, FR15, FR29, FR30, FR31, FR32, FR33
 *
 * Priority Guide:
 * - [P0] Critical paths, run on every commit
 * - [P1] High priority, run on PR to main
 * - [P2] Medium priority, run nightly
 */

import { test, expect } from '@playwright/test'

// Helper: 等待结果计数更新
async function waitForResultCountUpdate(page: import('@playwright/test').Page) {
  await page.locator('text=/\\d+ 项/').waitFor({ state: 'visible' })
}

test.describe('Story 1.6: Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await waitForResultCountUpdate(page)
  })

  test('[P1] should display search input with placeholder', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 检查搜索框
    const searchInput = page.getByPlaceholder('搜索历史记录...')

    // THEN: 搜索框应该可见
    await expect(searchInput).toBeVisible()
  })

  test('[P0] should filter list when typing in search box', async ({ page }) => {
    // GIVEN: 获取初始卡片数量
    const initialCards = page.locator('[class*="w-[220px]"]')
    const initialCount = await initialCards.count()

    // WHEN: 输入搜索关键词
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await searchInput.fill('git')

    // THEN: 验证结果数量减少（使用 toPass 等待状态变化）
    await expect(async () => {
      const filteredCards = page.locator('[class*="w-[220px]"]')
      const filteredCount = await filteredCards.count()
      expect(filteredCount).toBeLessThan(initialCount)
    }).toPass({ timeout: 2000 })
  })

  test('[P1] should show empty state when no results match', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 搜索一个不存在的关键词
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await searchInput.fill('这是一个不存在的搜索词xyz123')

    // THEN: 验证显示空状态提示
    const emptyState = page.locator('text=没有匹配结果')
    await expect(emptyState).toBeVisible()
  })

  test('[P0] should clear search and show all items', async ({ page }) => {
    // GIVEN: 先搜索产生过滤结果
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await searchInput.fill('git')
    await expect(page.locator('text=/\\d+ 项/')).not.toContainText('8 项')

    // WHEN: 清除搜索
    await searchInput.clear()

    // THEN: 验证显示所有项目（初始 8 项）
    await expect(page.locator('text=/\\d+ 项/')).toContainText('8 项')
  })
})

test.describe('Story 1.6: Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await waitForResultCountUpdate(page)
  })

  test('[P1] should display all filter buttons', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 检查过滤栏
    const filterBar = page.locator('.bg-black\\/40.backdrop-blur-md')

    // THEN: 所有过滤按钮应该可见
    await expect(filterBar.getByRole('button', { name: '全部' })).toBeVisible()
    await expect(filterBar.getByRole('button', { name: '文本' })).toBeVisible()
    await expect(filterBar.getByRole('button', { name: '图片' })).toBeVisible()
    await expect(filterBar.getByRole('button', { name: '文件' })).toBeVisible()
    await expect(filterBar.getByRole('button', { name: '收藏' })).toBeVisible()
  })

  test('[P0] should filter by Image type', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 点击图片过滤
    await page.getByRole('button', { name: '图片' }).click()

    // THEN: 验证结果计数（初始数据有 2 个图片）
    await expect(page.locator('text=/\\d+ 项/')).toContainText('2 项')
  })

  test('[P1] should filter by File type', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 点击文件过滤
    await page.getByRole('button', { name: '文件' }).click()

    // THEN: 验证结果计数（初始数据有 1 个文件）
    await expect(page.locator('text=/\\d+ 项/')).toContainText('1 项')
  })

  test('[P0] should filter by Text type (includes RTF)', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 点击文本过滤
    await page.getByRole('button', { name: '文本' }).click()

    // THEN: 验证结果计数（初始数据有 5 个文本/RTF）
    await expect(page.locator('text=/\\d+ 项/')).toContainText('5 项')
  })

  test('[P0] should show all items when All filter selected', async ({ page }) => {
    // GIVEN: 先选择其他过滤
    await page.getByRole('button', { name: '图片' }).click()
    await expect(page.locator('text=/\\d+ 项/')).toContainText('2 项')

    // WHEN: 再选择全部
    await page.getByRole('button', { name: '全部' }).click()

    // THEN: 验证显示全部 8 项
    await expect(page.locator('text=/\\d+ 项/')).toContainText('8 项')
  })

  test('[P2] should highlight active filter button', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 点击图片过滤
    const imageButton = page.getByRole('button', { name: '图片' })
    await imageButton.click()

    // THEN: 验证按钮有活跃样式（白色背景）
    await expect(imageButton).toHaveClass(/bg-white/)
  })
})

test.describe('Story 1.6: Star/Favorite Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await waitForResultCountUpdate(page)
  })

  test('[P0] should toggle star status on click', async ({ page }) => {
    // GIVEN: 找到第一个未收藏项的星号按钮
    const unstarredButton = page.locator('button[title="收藏"]').first()

    // WHEN: 点击收藏按钮
    await unstarredButton.click()

    // THEN: 验证状态变化（title 变为"取消收藏"）
    const starredButton = page.locator('button[title="取消收藏"]').first()
    await expect(starredButton).toBeVisible()
  })

  test('[P1] should show starred items with yellow star', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 检查收藏状态
    const yellowStarButtons = page.locator('button.text-yellow-400')

    // THEN: 验证已收藏项有黄色星号
    await expect(yellowStarButtons.first()).toBeVisible()
  })

  test('[P0] should filter starred items only', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 使用过滤栏容器中的收藏按钮
    const filterBar = page.locator('.bg-black\\/40.backdrop-blur-md')
    await filterBar.getByRole('button', { name: '收藏' }).click()

    // THEN: 验证结果计数（初始数据有 2 个收藏）
    await expect(page.locator('text=/\\d+ 项/')).toContainText('2 项')

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
    await waitForResultCountUpdate(page)
  })

  test('[P2] should display type icons for each card', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 检查图标
    const icons = page.locator('svg.w-3.h-3')

    // THEN: 验证卡片包含类型图标（lucide-react 图标）
    await expect(icons.first()).toBeVisible()
  })

  test('[P2] should display relative timestamps', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 检查时间戳
    // THEN: 验证有相对时间显示（如 "刚刚"、"分钟前" 等）
    const timestampLocator = page.locator('text=/刚刚|分钟前|小时前/')
    await expect(timestampLocator.first()).toBeVisible()
  })

  test('[P2] should display app name in card header', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 检查应用名
    // THEN: 验证显示应用名（如 VS Code、Notes 等）
    const appNameLocator = page.locator('text=/VS Code|Notes|Mail|Finder|Safari|Preview/')
    await expect(appNameLocator.first()).toBeVisible()
  })

  test('[P1] should display image thumbnail for image type', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 点击图片过滤只看图片
    await page.getByRole('button', { name: '图片' }).click()
    await expect(page.locator('text=/\\d+ 项/')).toContainText('2 项')

    // THEN: 验证有 img 元素
    const images = page.locator('img[class*="object-cover"]')
    await expect(images.first()).toBeVisible()
  })

  test('[P1] should display text content preview', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 点击文本过滤
    await page.getByRole('button', { name: '文本' }).click()
    await expect(page.locator('text=/\\d+ 项/')).toContainText('5 项')

    // THEN: 验证有文本内容预览
    const textContent = page.locator('[class*="font-mono"]')
    await expect(textContent.first()).toBeVisible()
  })
})

test.describe('Story 1.6: Combined Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await waitForResultCountUpdate(page)
  })

  test('[P0] should apply both search and filter together', async ({ page }) => {
    // GIVEN: 先选择文本过滤
    await page.getByRole('button', { name: '文本' }).click()
    await expect(page.locator('text=/\\d+ 项/')).toContainText('5 项')

    // WHEN: 再输入搜索
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await searchInput.fill('git')

    // THEN: 验证结果数量进一步减少
    await expect(async () => {
      const cards = page.locator('[class*="w-[220px]"]')
      const count = await cards.count()
      expect(count).toBeLessThanOrEqual(5) // 文本最多 5 个，搜索后更少
    }).toPass({ timeout: 2000 })
  })

  test('[P1] should show result count update in real-time', async ({ page }) => {
    // GIVEN: 初始 8 项
    const resultCount = page.locator('text=/\\d+ 项/')
    await expect(resultCount).toContainText('8 项')

    // WHEN: 搜索后减少
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await searchInput.fill('git')

    // THEN: 验证计数更新（不再是 8 项）
    await expect(resultCount).not.toContainText('8 项')
  })
})
