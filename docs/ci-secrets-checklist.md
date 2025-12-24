# CI Secrets 配置清单

本文档列出 MacPaste CI/CD 流水线可能需要的密钥和环境变量配置。

## 当前配置状态

**MacPaste 目前的 CI 配置不需要任何密钥。** 所有测试在公开环境中运行。

## 可选配置

以下是未来可能需要的配置项：

### 1. Slack 通知 (可选)

如果需要在 CI 失败时发送 Slack 通知：

| 密钥名称 | 描述 | 如何获取 |
|---------|------|---------|
| `SLACK_WEBHOOK` | Slack Incoming Webhook URL | Slack App 设置 → Incoming Webhooks |

**配置位置**: GitHub → Settings → Secrets and variables → Actions

**工作流配置**:
```yaml
- name: Notify on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 2. 代码签名 (macOS 发布)

发布 Tauri 应用时需要：

| 密钥名称 | 描述 | 如何获取 |
|---------|------|---------|
| `APPLE_CERTIFICATE` | Base64 编码的 .p12 证书 | Apple Developer Portal |
| `APPLE_CERTIFICATE_PASSWORD` | 证书密码 | 创建证书时设置 |
| `APPLE_ID` | Apple 开发者账号 | developer.apple.com |
| `APPLE_PASSWORD` | App-specific 密码 | appleid.apple.com |
| `APPLE_TEAM_ID` | 团队 ID | Apple Developer Portal |

### 3. GitHub Token (PR 评论)

自动在 PR 上评论测试结果：

| 密钥名称 | 描述 | 如何获取 |
|---------|------|---------|
| `GITHUB_TOKEN` | GitHub 自动提供 | 无需手动配置 |

**注意**: `GITHUB_TOKEN` 由 GitHub Actions 自动注入，无需手动配置。

## 安全最佳实践

### ✅ 应该做的

1. **使用 Secrets，不要硬编码**
   ```yaml
   # 正确
   api_key: ${{ secrets.API_KEY }}

   # 错误
   api_key: "sk-1234567890"
   ```

2. **限制 Secret 范围**
   - 使用 Environment Secrets 限制到特定环境
   - 使用 Repository Secrets 限制到特定仓库

3. **定期轮换**
   - 每 90 天轮换敏感密钥
   - API Key 泄露后立即轮换

4. **最小权限原则**
   - 只授予必要的权限
   - 使用 fine-grained PAT 而非 classic token

### ❌ 不应该做的

1. **不要在日志中打印 Secrets**
   ```yaml
   # 危险！
   run: echo ${{ secrets.API_KEY }}
   ```

2. **不要在 PR 中暴露 Secrets**
   - Fork 的 PR 无法访问 Secrets（这是安全特性）

3. **不要提交包含密钥的文件**
   - `.env` 文件应加入 `.gitignore`
   - 使用 `git-secrets` 防止意外提交

## 环境变量 vs Secrets

| 类型 | 用途 | 示例 |
|------|------|------|
| **环境变量** | 非敏感配置 | `NODE_ENV=production` |
| **Secrets** | 敏感凭证 | API 密钥、证书、密码 |

## 配置步骤

### 添加 Repository Secret

1. 进入 GitHub 仓库
2. Settings → Secrets and variables → Actions
3. 点击 "New repository secret"
4. 输入名称和值
5. 点击 "Add secret"

### 添加 Environment Secret

1. Settings → Environments
2. 创建或选择环境 (如 `production`)
3. 添加 Environment secrets
4. 在工作流中指定环境：
   ```yaml
   jobs:
     deploy:
       environment: production
   ```

## 验证配置

运行以下命令验证 Secrets 是否正确配置：

```bash
# 查看工作流运行日志
gh run list --workflow=test.yml

# 查看特定运行的详情
gh run view <run-id>
```

## 相关链接

- [GitHub Actions Secrets 文档](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Tauri 代码签名指南](https://tauri.app/v1/guides/distribution/sign-macos)

---

_最后更新: 2025-12-25_
