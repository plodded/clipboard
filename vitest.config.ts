import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // 使用 jsdom 模拟浏览器环境
    environment: 'jsdom',

    // 全局 API (describe, it, expect) 无需导入
    globals: true,

    // 测试设置文件
    setupFiles: ['./src/test-utils/setup.ts'],

    // 包含的测试文件模式
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],

    // 排除 E2E 测试 (由 Playwright 运行)
    exclude: [
      'node_modules',
      'tests/e2e/**',
      '**/*.e2e.{test,spec}.{ts,tsx}',
    ],

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test-utils/**',
        'src/main.tsx',
      ],
      // MVP 阶段暂不设置阈值，随着测试增加逐步提高
      // thresholds: {
      //   lines: 70,
      //   functions: 70,
      //   branches: 60,
      //   statements: 70,
      // },
    },

    // 测试超时配置
    testTimeout: 10000,
    hookTimeout: 10000,

    // 模拟清理
    clearMocks: true,
    restoreMocks: true,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
