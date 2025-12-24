#!/bin/bash
# ============================================
# burn-in.sh - Burn-in 测试脚本
# ============================================
# 多次运行测试以检测不稳定 (flaky) 测试
#
# 用法: ./scripts/burn-in.sh [iterations] [base-branch]
#
# 参数:
#   iterations   运行次数 (默认: 10)
#   base-branch  比较分支 (默认: main)
#
# 示例:
#   ./scripts/burn-in.sh           # 10 次迭代，比较 main
#   ./scripts/burn-in.sh 5         # 5 次迭代
#   ./scripts/burn-in.sh 20 develop # 20 次，比较 develop

set -e

# 配置
ITERATIONS=${1:-10}
BASE_BRANCH=${2:-main}
SPEC_PATTERN='\.(spec|test)\.(ts|tsx)$'

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔥 Burn-In 测试运行器"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo "  迭代次数: $ITERATIONS"
echo "  基准分支: $BASE_BRANCH"
echo ""

# 检测变更的测试文件
echo -e "${YELLOW}📋 检测变更的测试文件...${NC}"

# 获取当前分支与基准分支的差异
if git rev-parse --verify "origin/$BASE_BRANCH" >/dev/null 2>&1; then
  CHANGED_SPECS=$(git diff --name-only "origin/$BASE_BRANCH"...HEAD 2>/dev/null | grep -E "$SPEC_PATTERN" || echo "")
elif git rev-parse --verify "$BASE_BRANCH" >/dev/null 2>&1; then
  CHANGED_SPECS=$(git diff --name-only "$BASE_BRANCH"...HEAD 2>/dev/null | grep -E "$SPEC_PATTERN" || echo "")
else
  echo -e "${YELLOW}⚠️  未找到基准分支 $BASE_BRANCH，运行所有测试${NC}"
  CHANGED_SPECS=""
fi

if [ -z "$CHANGED_SPECS" ]; then
  echo -e "${BLUE}未检测到测试文件变更，运行完整测试套件${NC}"
  TEST_CMD="npm run test:e2e"
  SPEC_COUNT="全部"
else
  echo -e "${GREEN}检测到变更的测试文件:${NC}"
  echo "$CHANGED_SPECS" | sed 's/^/  - /'
  echo ""
  SPEC_COUNT=$(echo "$CHANGED_SPECS" | wc -l | xargs)
  # 将换行符替换为空格，作为 playwright 的参数
  SPECS_ARGS=$(echo "$CHANGED_SPECS" | tr '\n' ' ')
  TEST_CMD="npm run test:e2e -- $SPECS_ARGS"
fi

echo ""
echo -e "${CYAN}开始 Burn-in 测试 ($SPEC_COUNT 个测试文件, $ITERATIONS 次迭代)...${NC}"
echo ""

# Burn-in 循环
FAILURES=()
START_TIME=$(date +%s)

for i in $(seq 1 $ITERATIONS); do
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}🔄 迭代 $i/$ITERATIONS${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if eval "$TEST_CMD"; then
    echo -e "${GREEN}✓ 迭代 $i 通过${NC}"
  else
    echo -e "${RED}✗ 迭代 $i 失败${NC}"
    FAILURES+=($i)

    # 保存失败产物
    FAILURE_DIR="burn-in-failures/iteration-$i"
    mkdir -p "$FAILURE_DIR"
    cp -r test-results/ "$FAILURE_DIR/" 2>/dev/null || true
    cp -r playwright-report/ "$FAILURE_DIR/" 2>/dev/null || true

    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  🛑 BURN-IN 失败${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  失败发生在迭代 $i/$ITERATIONS${NC}"
    echo -e "${RED}  失败产物已保存至: $FAILURE_DIR/${NC}"
    echo ""
    echo -e "${YELLOW}  调试建议:${NC}"
    echo "  1. 检查 $FAILURE_DIR/test-results/ 中的 trace 文件"
    echo "  2. 运行 npx playwright show-trace <trace-file>"
    echo "  3. 查看截图和视频定位问题"
    echo ""
    exit 1
  fi

  echo ""
done

# 计算耗时
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# 成功汇总
echo -e "${GREEN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 BURN-IN 通过"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo "  结果: $ITERATIONS/$ITERATIONS 次迭代成功"
echo "  耗时: ${MINUTES}分 ${SECONDS}秒"
echo ""
echo -e "${GREEN}  测试稳定，可以安全合并！${NC}"
echo ""

# 清理日志
rm -f burn-in-log-*.txt 2>/dev/null || true

exit 0
