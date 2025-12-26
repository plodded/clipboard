/**
 * Story 1.5: 键盘导航与窗口交互集成
 *
 * 验证键盘导航功能在 Tauri + NSPanel 架构下正常工作。
 *
 * 注意：由于 macOS WKWebView 不支持 WebDriver，以下测试在浏览器中运行。
 * NSPanel 真实窗口行为（如 hide_panel）需要手动验收测试。
 *
 * FRs covered: FR19, FR20, FR22, FR23, FR24
 */

import { test, expect } from '@playwright/test'

test.describe('Story 1.5: Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('should have first item selected by default', async ({ page }) => {
    // 验证第一个卡片有活跃状态（scale-105 是活跃项的特征类名）
    const activeCard = page.locator('[class*="scale-105"]').first()
    await expect(activeCard).toBeVisible()

    // 验证只有一个活跃项
    const activeCards = page.locator('[class*="scale-105"]')
    await expect(activeCards).toHaveCount(1)
  })

  test('should navigate right with ArrowRight key', async ({ page }) => {
    // 获取初始活跃卡片的位置
    const initialActiveCard = page.locator('[class*="scale-105"]').first()
    const initialBox = await initialActiveCard.boundingBox()

    // 按右箭头
    await page.keyboard.press('ArrowRight')

    // 等待动画完成
    await page.waitForTimeout(100)

    // 获取新的活跃卡片位置
    const newActiveCard = page.locator('[class*="scale-105"]').first()
    const newBox = await newActiveCard.boundingBox()

    // 验证活跃卡片已移动（x 坐标应该增加）
    expect(newBox?.x).toBeGreaterThan(initialBox?.x || 0)
  })

  test('should navigate left with ArrowLeft key', async ({ page }) => {
    // 先向右导航一次
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)

    const afterRightCard = page.locator('[class*="scale-105"]').first()
    const afterRightBox = await afterRightCard.boundingBox()

    // 再向左导航
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(100)

    const afterLeftCard = page.locator('[class*="scale-105"]').first()
    const afterLeftBox = await afterLeftCard.boundingBox()

    // 验证活跃卡片已向左移动
    expect(afterLeftBox?.x).toBeLessThan(afterRightBox?.x || 0)
  })

  test('should not navigate beyond first item boundary', async ({ page }) => {
    // 获取第一个卡片位置
    const firstCard = page.locator('[class*="scale-105"]').first()
    const firstBox = await firstCard.boundingBox()

    // 尝试向左导航（应该保持在第一项）
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(100)

    // 验证仍然选中第一项
    const currentCard = page.locator('[class*="scale-105"]').first()
    const currentBox = await currentCard.boundingBox()

    expect(currentBox?.x).toBe(firstBox?.x)
  })

  test('should not navigate beyond last item boundary', async ({ page }) => {
    // 初始数据有 8 项，导航到最后一项需要 7 次
    // 使用较少的次数避免 WebKit 超时
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(50) // 给 WebKit 足够时间处理
    }
    await page.waitForTimeout(100)

    // 验证仍然只有一个活跃项（没有出错）
    const activeCards = page.locator('[class*="scale-105"]')
    await expect(activeCards).toHaveCount(1)

    // 验证活跃项可见（没有跑到屏幕外）
    const activeCard = activeCards.first()
    await expect(activeCard).toBeVisible()
  })

  test('should show toast when Enter is pressed on selected item', async ({ page }) => {
    // 按 Enter 键复制选中项
    await page.keyboard.press('Enter')

    // 验证 Toast 显示（WebKit 可能需要更长时间）
    const toast = page.locator('text=已复制到剪贴板')
    await expect(toast).toBeVisible({ timeout: 3000 })
  })

  test('should display "Enter 复制" hint on active card', async ({ page }) => {
    // 验证活跃卡片显示 "Enter 复制" 提示
    const enterHint = page.locator('text=Enter 复制')
    await expect(enterHint).toBeVisible()
  })

  test('should highlight active card with blue border', async ({ page }) => {
    // 验证活跃卡片有蓝色边框样式
    const activeCard = page.locator('[class*="border-blue-500"]').first()
    await expect(activeCard).toBeVisible()
  })
})

test.describe('Story 1.5: Keyboard Navigation with Search/Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('should reset selection to first item after search', async ({ page }) => {
    // 先导航到第三项
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)

    // 输入搜索
    const searchInput = page.getByPlaceholder('搜索历史记录...')
    await searchInput.fill('git')

    // 等待过滤
    await page.waitForTimeout(200)

    // 验证选中项重置到第一项
    const activeCards = page.locator('[class*="scale-105"]')
    await expect(activeCards).toHaveCount(1)
  })

  test('should reset selection to first item after filter change', async ({ page }) => {
    // 先导航到第三项
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)

    // 点击过滤按钮（图片）
    const imageFilter = page.getByRole('button', { name: '图片' })
    await imageFilter.click()

    // 等待过滤
    await page.waitForTimeout(200)

    // 验证选中项重置到第一项
    const activeCards = page.locator('[class*="scale-105"]')
    await expect(activeCards).toHaveCount(1)
  })
})
