#!/bin/bash
# ============================================
# ci-local.sh - 本地 CI 镜像脚本
# ============================================
# 在本地模拟 CI 流水线执行，用于调试 CI 失败
#
# 用法: ./scripts/ci-local.sh [--skip-burn-in]
#
# 选项:
#   --skip-burn-in  跳过 burn-in 测试（加快执行）

set -e  # 任何命令失败立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 参数解析
SKIP_BURN_IN=false
for arg in "$@"; do
  case $arg in
    --skip-burn-in)
      SKIP_BURN_IN=true
      shift
      ;;
  esac
done

echo -e "${BLUE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MacPaste - 本地 CI 流水线"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

# 计时开始
START_TIME=$(date +%s)

# ============================================
# Stage 1: TypeScript 类型检查
# ============================================
echo -e "${YELLOW}[1/4] TypeScript 类型检查...${NC}"
if npx tsc --noEmit; then
  echo -e "${GREEN}✓ TypeScript 检查通过${NC}"
else
  echo -e "${RED}✗ TypeScript 检查失败${NC}"
  exit 1
fi
echo ""

# ============================================
# Stage 2: 单元测试
# ============================================
echo -e "${YELLOW}[2/4] 运行单元测试...${NC}"
if npm run test:unit; then
  echo -e "${GREEN}✓ 单元测试通过${NC}"
else
  echo -e "${RED}✗ 单元测试失败${NC}"
  exit 1
fi
echo ""

# ============================================
# Stage 3: E2E 测试
# ============================================
echo -e "${YELLOW}[3/4] 运行 E2E 测试...${NC}"
if npm run test:e2e; then
  echo -e "${GREEN}✓ E2E 测试通过${NC}"
else
  echo -e "${RED}✗ E2E 测试失败${NC}"
  exit 1
fi
echo ""

# ============================================
# Stage 4: Burn-in 测试 (可选)
# ============================================
if [ "$SKIP_BURN_IN" = true ]; then
  echo -e "${YELLOW}[4/4] Burn-in 测试已跳过 (--skip-burn-in)${NC}"
else
  echo -e "${YELLOW}[4/4] 运行 Burn-in 测试 (3 次迭代)...${NC}"
  for i in {1..3}; do
    echo -e "${BLUE}  🔄 Burn-in 迭代 $i/3${NC}"
    if npm run test:e2e; then
      echo -e "${GREEN}  ✓ 迭代 $i 通过${NC}"
    else
      echo -e "${RED}  ✗ Burn-in 在迭代 $i 失败${NC}"
      echo -e "${RED}  检测到不稳定测试！${NC}"
      exit 1
    fi
  done
  echo -e "${GREEN}✓ Burn-in 测试通过 (3/3)${NC}"
fi
echo ""

# 计时结束
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# ============================================
# 结果汇总
# ============================================
echo -e "${GREEN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ 本地 CI 流水线通过"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo "  总耗时: ${MINUTES}分 ${SECONDS}秒"
echo ""
echo "  阶段结果:"
echo "  ├─ TypeScript: ✓"
echo "  ├─ 单元测试:   ✓"
echo "  ├─ E2E 测试:   ✓"
if [ "$SKIP_BURN_IN" = true ]; then
  echo "  └─ Burn-in:    跳过"
else
  echo "  └─ Burn-in:    ✓"
fi
echo ""
echo -e "${GREEN}代码已准备好推送到远程仓库！${NC}"
