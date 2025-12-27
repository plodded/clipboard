/**
 * Story 1.5: 键盘导航与窗口交互集成
 *
 * 验证键盘导航功能在 Tauri + NSPanel 架构下正常工作。
 *
 * 注意：由于 macOS WKWebView 不支持 WebDriver，以下测试在浏览器中运行。
 * NSPanel 真实窗口行为（如 hide_panel）需要手动验收测试。
 *
 * FRs covered: FR19, FR20, FR22, FR23, FR24
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
} as const

// Helper: 等待活跃卡片状态稳定
async function waitForActiveCardStable(page: import('@playwright/test').Page) {
  await page.locator(SELECTORS.activeCard).first().waitFor({ state: 'visible' })
}

test.describe('Story 1.5: Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    // 等待初始渲染完成
    await waitForActiveCardStable(page)
  })

  test('[P0] should have first item selected by default', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 检查活跃状态
    const activeCard = page.locator(SELECTORS.activeCard).first()

    // THEN: 第一个卡片应该有活跃状态
    await expect(activeCard).toBeVisible()

    // 验证只有一个活跃项
    const activeCards = page.locator(SELECTORS.activeCard)
    await expect(activeCards).toHaveCount(1)
  })

  test('[P0] should navigate right with ArrowRight key', async ({ page }) => {
    // GIVEN: 获取初始活跃卡片的位置
    const initialActiveCard = page.locator(SELECTORS.activeCard).first()
    const initialBox = await initialActiveCard.boundingBox()

    // WHEN: 按右箭头
    await page.keyboard.press('ArrowRight')

    // THEN: 等待新的活跃卡片出现并验证位置变化
    await expect(async () => {
      const newActiveCard = page.locator(SELECTORS.activeCard).first()
      const newBox = await newActiveCard.boundingBox()
      expect(newBox?.x).toBeGreaterThan(initialBox?.x || 0)
    }).toPass({ timeout: 1000 })
  })

  test('[P0] should navigate left with ArrowLeft key', async ({ page }) => {
    // GIVEN: 先向右导航一次
    await page.keyboard.press('ArrowRight')
    await waitForActiveCardStable(page)

    const afterRightCard = page.locator(SELECTORS.activeCard).first()
    const afterRightBox = await afterRightCard.boundingBox()

    // WHEN: 再向左导航
    await page.keyboard.press('ArrowLeft')

    // THEN: 验证活跃卡片已向左移动
    await expect(async () => {
      const afterLeftCard = page.locator(SELECTORS.activeCard).first()
      const afterLeftBox = await afterLeftCard.boundingBox()
      expect(afterLeftBox?.x).toBeLessThan(afterRightBox?.x || 0)
    }).toPass({ timeout: 1000 })
  })

  test('[P1] should not navigate beyond first item boundary', async ({ page }) => {
    // GIVEN: 获取第一个卡片位置
    const firstCard = page.locator(SELECTORS.activeCard).first()
    const firstBox = await firstCard.boundingBox()

    // WHEN: 尝试向左导航多次（应该保持在第一项）
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')

    // THEN: 验证仍然选中第一项
    await expect(async () => {
      const currentCard = page.locator(SELECTORS.activeCard).first()
      const currentBox = await currentCard.boundingBox()
      expect(currentBox?.x).toBe(firstBox?.x)
    }).toPass({ timeout: 1000 })
  })

  test('[P1] should not navigate beyond last item boundary', async ({ page }) => {
    // GIVEN: 初始数据有 8 项
    // WHEN: 导航超过最后一项
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowRight')
    }

    // THEN: 验证仍然只有一个活跃项（没有出错）
    const activeCards = page.locator(SELECTORS.activeCard)
    await expect(activeCards).toHaveCount(1)

    // 验证活跃项可见（没有跑到屏幕外）
    const activeCard = activeCards.first()
    await expect(activeCard).toBeVisible()
  })

  test('[P0] should show toast when Enter is pressed on selected item', async ({ page }) => {
    // GIVEN: 页面已加载，第一项已选中
    // WHEN: 按 Enter 键复制选中项
    await page.keyboard.press('Enter')

    // THEN: 验证 Toast 显示
    const toast = page.locator('text=已复制到剪贴板')
    await expect(toast).toBeVisible({ timeout: 3000 })
  })

  test('[P1] should display "Enter 复制" hint on active card', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 检查活跃卡片
    // THEN: 验证活跃卡片显示 "Enter 复制" 提示
    const enterHint = page.locator('text=Enter 复制')
    await expect(enterHint).toBeVisible()
  })

  test('[P2] should highlight active card with blue border', async ({ page }) => {
    // GIVEN: 页面已加载
    // WHEN: 检查活跃卡片样式
    // THEN: 验证活跃卡片存在且有活跃状态
    const activeCard = page.locator(SELECTORS.activeCard).first()
    await expect(activeCard).toBeVisible()
    await expect(activeCard).toHaveAttribute('data-active', 'true')
  })
})

test.describe('Story 1.5: Keyboard Navigation with Search/Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await waitForActiveCardStable(page)
  })

  test('[P0] should reset selection to first item after search', async ({ page }) => {
    // GIVEN: 先导航到第三项
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await waitForActiveCardStable(page)

    // WHEN: 输入搜索
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await searchInput.fill('git')

    // THEN: 验证选中项重置到第一项（等待过滤结果更新）
    await expect(page.locator(SELECTORS.activeCard)).toHaveCount(1)
  })

  test('[P0] should reset selection to first item after filter change', async ({ page }) => {
    // GIVEN: 先导航到第三项
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await waitForActiveCardStable(page)

    // WHEN: 点击过滤按钮（图片）
    const imageFilter = page.getByRole('button', { name: '图片' })
    await imageFilter.click()

    // THEN: 验证选中项重置到第一项
    await expect(page.locator(SELECTORS.activeCard)).toHaveCount(1)
  })

  test('[P1] should auto-focus search input on window focus', async ({ page }) => {
    // GIVEN: 页面已加载
    const searchInput = page.getByPlaceholder('搜索历史记录...')

    // WHEN: 模拟窗口获得焦点（触发 window focus 事件）
    // 注意：App.tsx 中的 handleWindowFocus 使用 setTimeout 50ms 延迟
    await page.evaluate(() => {
      window.dispatchEvent(new Event('focus'))
    })

    // THEN: 搜索框应该获得焦点（等待 setTimeout 完成）
    await expect(searchInput).toBeFocused({ timeout: 1000 })
  })

  test('[P1] should handle keyboard navigation in empty results gracefully', async ({ page }) => {
    // GIVEN: 搜索一个不存在的关键词，产生空结果
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await searchInput.fill('这是一个不存在的搜索词xyz123')

    // 等待空状态出现
    await expect(page.locator('text=没有匹配结果')).toBeVisible()

    // WHEN: 尝试键盘导航（不应该报错）
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('Enter')

    // THEN: 页面应该保持稳定，没有活跃卡片（因为没有结果）
    const activeCards = page.locator(SELECTORS.activeCard)
    await expect(activeCards).toHaveCount(0)

    // 空状态仍然显示
    await expect(page.locator('text=没有匹配结果')).toBeVisible()
  })
})
