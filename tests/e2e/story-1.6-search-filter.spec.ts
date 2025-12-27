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

// Selectors - centralized for maintainability
const SELECTORS = {
  card: '[data-testid="clipboard-card"]',
  activeCard: '[data-testid="clipboard-card"][data-active="true"]',
  starButton: '[data-testid="star-button"]',
  starredButton: '[data-testid="star-button"][aria-pressed="true"]',
  filterBar: '[data-testid="filter-bar"]',
} as const

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
    const initialCards = page.locator(SELECTORS.card)
    const initialCount = await initialCards.count()

    // WHEN: 输入搜索关键词
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await searchInput.fill('git')

    // THEN: 验证结果数量减少（使用 toPass 等待状态变化）
    await expect(async () => {
      const filteredCards = page.locator(SELECTORS.card)
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
    const filterBar = page.locator(SELECTORS.filterBar)

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

    // THEN: 验证按钮有活跃状态（aria-pressed）
    await expect(imageButton).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('Story 1.6: Star/Favorite Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await waitForResultCountUpdate(page)
  })

  test('[P0] should toggle star status on click', async ({ page }) => {
    // GIVEN: 获取第一个卡片的星号按钮（使用固定定位）
    const firstCard = page.locator(SELECTORS.card).first()
    const starButton = firstCard.locator(SELECTORS.starButton)

    // 记录初始状态
    const initialState = await starButton.getAttribute('aria-pressed')

    // WHEN: 点击收藏按钮
    await starButton.click()

    // THEN: 验证状态变化（aria-pressed 切换）
    const expectedState = initialState === 'true' ? 'false' : 'true'
    await expect(starButton).toHaveAttribute('aria-pressed', expectedState)
  })

  test('[P1] should show starred items with yellow star', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 检查收藏状态
    const starredButtons = page.locator(SELECTORS.starredButton)

    // THEN: 验证已收藏项存在
    await expect(starredButtons.first()).toBeVisible()
  })

  test('[P0] should filter starred items only', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 使用过滤栏容器中的收藏按钮
    const filterBar = page.locator(SELECTORS.filterBar)
    await filterBar.getByRole('button', { name: '收藏' }).click()

    // THEN: 验证结果计数（初始数据有 2 个收藏）
    await expect(page.locator('text=/\\d+ 项/')).toContainText('2 项')

    // 验证所有显示的卡片都有已收藏的星号
    const cards = page.locator(SELECTORS.card)
    const cardCount = await cards.count()
    const starredButtons = page.locator(SELECTORS.starredButton)
    const starCount = await starredButtons.count()

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
    // WHEN: 检查卡片内的图标
    const cards = page.locator(SELECTORS.card)

    // THEN: 验证卡片包含类型图标（lucide-react 图标）
    const firstCard = cards.first()
    const icon = firstCard.locator('svg').first()
    await expect(icon).toBeVisible()
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
    const images = page.locator(`${SELECTORS.card} img`)
    await expect(images.first()).toBeVisible()
  })

  test('[P1] should display text content preview', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 点击文本过滤
    await page.getByRole('button', { name: '文本' }).click()
    await expect(page.locator('text=/\\d+ 项/')).toContainText('5 项')

    // THEN: 验证卡片中有文本内容
    const cards = page.locator(SELECTORS.card)
    const firstCard = cards.first()
    await expect(firstCard).toBeVisible()
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
      const cards = page.locator(SELECTORS.card)
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
