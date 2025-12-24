import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 配置 - MacPaste
 *
 * 注意：由于 macOS 上 WKWebView 不支持 WebDriver，
 * 此配置用于浏览器层面的 E2E 测试（不启动 Tauri 应用）。
 *
 * 测试策略：
 * - 启动 Vite dev server
 * - 在浏览器中测试 Web 层 UI
 * - 使用 route mocking 模拟 Tauri IPC 响应
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,

  // CI 环境禁止 test.only
  forbidOnly: !!process.env.CI,

  // 重试配置
  retries: process.env.CI ? 2 : 0,

  // Worker 数量 (CI 串行，本地并行)
  workers: process.env.CI ? 1 : undefined,

  // 超时配置
  timeout: 60 * 1000, // 测试超时: 60s
  expect: {
    timeout: 15 * 1000, // 断言超时: 15s
  },

  // 报告器
  reporter: [
    ['html', { outputFolder: 'test-results/html', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  // 全局配置
  use: {
    // 基础 URL (Vite dev server - Tauri 默认端口 1420)
    baseURL: process.env.BASE_URL || 'http://localhost:1420',

    // 调试工件 (仅失败时保留)
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // 操作超时
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },

  // 浏览器项目配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Safari 使用 WebKit - 更接近 Tauri 的 WKWebView
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Firefox 可选
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],

  // 自动启动 Vite dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:1420',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000, // 1 分钟启动超时
  },

  // 输出目录
  outputDir: 'test-results/artifacts',
})
