/**
 * 工具函数单元测试
 *
 * 展示 Vitest 单元测试的最佳实践：
 * - 纯函数测试
 * - 边界条件
 * - 类型安全
 */

import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn (className merger)', () => {
  it('should merge multiple class names', () => {
    const result = cn('foo', 'bar', 'baz')
    expect(result).toBe('foo bar baz')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const isDisabled = false

    const result = cn('base', isActive && 'active', isDisabled && 'disabled')
    expect(result).toBe('base active')
  })

  it('should merge Tailwind classes correctly', () => {
    // tailwind-merge 应该正确处理冲突的类
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4') // px-4 覆盖 px-2
  })

  it('should handle object syntax', () => {
    const result = cn({
      'text-red-500': true,
      'text-blue-500': false,
      'font-bold': true,
    })
    expect(result).toBe('text-red-500 font-bold')
  })

  it('should handle array syntax', () => {
    const result = cn(['foo', 'bar'], ['baz'])
    expect(result).toBe('foo bar baz')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
    expect(cn(null, undefined, false)).toBe('')
  })

  it('should preserve non-Tailwind duplicate classes', () => {
    // clsx + tailwind-merge 不会去重非 Tailwind 类
    // 这是预期行为，只有 Tailwind 冲突类会被合并
    const result = cn('foo', 'bar', 'foo')
    expect(result).toBe('foo bar foo')
  })
})
