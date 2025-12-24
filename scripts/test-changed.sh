#!/bin/bash
# ============================================
# test-changed.sh - 选择性测试脚本
# ============================================
# 基于变更文件智能选择运行哪些测试
#
# 用法: ./scripts/test-changed.sh [base-branch]
#
# 策略:
#   - 配置文件变更 → 运行全部测试
#   - 测试文件变更 → 仅运行变更的测试
#   - 源码变更     → 运行相关测试 + smoke 测试
#   - 文档变更     → 跳过测试

set -e

BASE_BRANCH=${1:-main}

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎯 选择性测试运行器"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo "  基准分支: $BASE_BRANCH"
echo ""

# 检测变更文件
echo -e "${YELLOW}📋 检测变更文件...${NC}"

if git rev-parse --verify "origin/$BASE_BRANCH" >/dev/null 2>&1; then
  CHANGED_FILES=$(git diff --name-only "origin/$BASE_BRANCH"...HEAD 2>/dev/null || echo "")
elif git rev-parse --verify "$BASE_BRANCH" >/dev/null 2>&1; then
  CHANGED_FILES=$(git diff --name-only "$BASE_BRANCH"...HEAD 2>/dev/null || echo "")
else
  echo -e "${YELLOW}⚠️  未找到基准分支，运行完整测试${NC}"
  npm run test:e2e
  exit $?
fi

if [ -z "$CHANGED_FILES" ]; then
  echo -e "${GREEN}✓ 无文件变更，跳过测试${NC}"
  exit 0
fi

echo "变更文件列表:"
echo "$CHANGED_FILES" | sed 's/^/  - /'
echo ""

# ============================================
# 策略 1: 关键配置文件变更 → 全部测试
# ============================================
CRITICAL_PATTERNS="package\.json|package-lock\.json|playwright\.config|vitest\.config|tsconfig\.json|\.github/workflows"

if echo "$CHANGED_FILES" | grep -qE "$CRITICAL_PATTERNS"; then
  echo -e "${RED}⚠️  检测到关键配置文件变更${NC}"
  echo -e "${BLUE}运行完整测试套件...${NC}"
  npm run test
  exit $?
fi

# ============================================
# 策略 2: 测试文件变更 → 仅运行变更的测试
# ============================================
CHANGED_SPECS=$(echo "$CHANGED_FILES" | grep -E '\.(spec|test)\.(ts|tsx)$' || echo "")

if [ -n "$CHANGED_SPECS" ]; then
  echo -e "${BLUE}📝 检测到测试文件变更${NC}"
  SPEC_COUNT=$(echo "$CHANGED_SPECS" | wc -l | xargs)
  echo "  运行 $SPEC_COUNT 个变更的测试文件"

  # 转换为空格分隔的参数
  SPECS_ARGS=$(echo "$CHANGED_SPECS" | tr '\n' ' ')
  npm run test:e2e -- $SPECS_ARGS
  exit $?
fi

# ============================================
# 策略 3: 源码变更 → 相关测试
# ============================================
CHANGED_SRC=$(echo "$CHANGED_FILES" | grep -E '^src/.*\.(ts|tsx)$' || echo "")

if [ -n "$CHANGED_SRC" ]; then
  echo -e "${BLUE}🔧 检测到源码变更${NC}"

  # 提取变更的组件/模块名
  MODULES=$(echo "$CHANGED_SRC" | xargs -I {} basename {} | sed 's/\.[^.]*$//' | sort -u)
  echo "  变更的模块: $MODULES"

  # 查找相关测试
  RELATED_TESTS=""
  for module in $MODULES; do
    FOUND=$(find tests -name "*${module}*" -type f 2>/dev/null || echo "")
    if [ -n "$FOUND" ]; then
      RELATED_TESTS="$RELATED_TESTS $FOUND"
    fi
  done

  if [ -n "$RELATED_TESTS" ]; then
    echo -e "${BLUE}  找到相关测试:${NC}"
    echo "$RELATED_TESTS" | tr ' ' '\n' | sed 's/^/    - /'
    npm run test:e2e -- $RELATED_TESTS
  else
    echo -e "${YELLOW}  未找到精确匹配的测试，运行 E2E 测试${NC}"
    npm run test:e2e
  fi
  exit $?
fi

# ============================================
# 策略 4: 仅文档/配置变更 → 跳过
# ============================================
DOC_ONLY=$(echo "$CHANGED_FILES" | grep -vE '\.(ts|tsx|js|jsx|rs)$' | wc -l | xargs)
TOTAL_FILES=$(echo "$CHANGED_FILES" | wc -l | xargs)

if [ "$DOC_ONLY" -eq "$TOTAL_FILES" ]; then
  echo -e "${GREEN}✓ 仅文档/配置变更，跳过测试${NC}"
  exit 0
fi

# ============================================
# 默认: 运行 E2E 测试
# ============================================
echo -e "${BLUE}运行 E2E 测试...${NC}"
npm run test:e2e
