/**
 * 自定义 render 函数
 *
 * 包装 React Testing Library 的 render，提供：
 * - 全局 Provider 注入
 * - 常用查询方法
 * - userEvent 实例
 */

import { ReactElement } from 'react'
import { render as rtlRender, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * 自定义 render 选项
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // 未来可添加自定义选项，如：
  // initialState?: Partial<AppState>
  // route?: string
}

/**
 * 自定义 render 返回类型
 */
type CustomRenderResult = ReturnType<typeof rtlRender> & {
  user: ReturnType<typeof userEvent.setup>
}

/**
 * 带有 Provider 包装的自定义 render 函数
 *
 * @example
 * ```tsx
 * const { user, getByRole } = render(<MyComponent />)
 * await user.click(getByRole('button'))
 * ```
 */
function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
): CustomRenderResult {
  // 设置 userEvent 实例
  const user = userEvent.setup()

  // 包装器 Provider (未来可添加 StoreProvider, ThemeProvider 等)
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>
  }

  return {
    user,
    ...rtlRender(ui, { wrapper: Wrapper, ...options }),
  }
}

// 重新导出所有 Testing Library 方法
export * from '@testing-library/react'

// 导出自定义 render
export { customRender as render }
