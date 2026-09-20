# 免费 Token 申请和管理后台

用户访问 `/tokens`，使用现有邮箱验证码登录，填写项目名称、用途（10–2000 字符）及期望 Token 数量。审核通过后本人登录查看额度、说明，并点击「查看 API Key」领取。管理员访问 `/admin`，搜索所有账户（含未申请及停用账户），按状态分页审核申请。管理员的页头显示后台入口。

每个账户最多有一条待审核或已通过申请；拒绝后可重新提交，历史记录保留。额度是管理员的发放记录，不自动向供应商充值、不计量 API 消耗。管理员需要先在供应商创建可用的项目专属 API Key，再填入本系统。

## 配置

1. 应用迁移（包含 `0004_token_requests.sql`）：

   ```sh
   npx wrangler d1 migrations apply AUTH_DB --local
   # 生产发布前：
   npx wrangler d1 migrations apply AUTH_DB --remote
   ```

2. 在 `wrangler.jsonc` 的 `vars.ADMIN_EMAILS` 填入管理员邮箱，多个邮箱用英文逗号分隔。也可移除该 vars 项后使用同名 Worker secret，避免把邮箱提交到代码库（不要同时定义同名 variable 和 secret）。本地可在忽略提交的 `.dev.vars` 中设置。邮箱忽略大小写并去除首尾空格；空配置拒绝所有管理访问。管理员仍需完成正常的邮箱验证码登录，不使用默认密码，也不会自动把首位注册用户设为管理员。

3. 设置独立的 `TOKEN_ENCRYPTION_KEY`，值为 32 字节随机密钥的 64 位十六进制字符串。生成后保存在密码管理器，生产通过 `npx wrangler secret put TOKEN_ENCRYPTION_KEY` 输入；本地把独立的测试密钥写入 `.dev.vars`。可使用 `openssl rand -hex 32` 生成。不得把密钥提交到代码库。

   API Key 使用 AES-256-GCM 加密保存，随机 IV，并将申请 ID 作为附加认证数据。缺少配置时审批不会成功，也不会改变申请状态。不要直接替换或删除密钥；轮换前必须使用旧密钥解密已有记录，再用新密钥重新加密。丢失密钥会使已发放 API Key 无法恢复。认证用的 `AUTH_SECRET` 和本密钥相互独立。

4. `npm run build && npm run preview` 本地验收。生产配置与迁移完成后使用项目原有部署流程。`next dev` 仅运行静态前端，不提供这些 API。

## 使用流程

- 用户：页头「免费 Token」→ 邮箱登录 → 填写并提交申请 → 刷新查看进度 → 通过后查看/复制 API Key。
- 管理员：页头「管理后台」→「申请审批」→ 填写实际额度、现有 API Key、服务地址/支持模型/有效期等使用说明 →「通过并发放」。拒绝时必须填写原因。
- 「全部用户」显示用户 ID、邮箱、昵称、账户状态、注册时间和申请次数；支持邮箱、昵称、用户 ID 的子串搜索，每页 20 条。
- API Key 不进入列表响应、页面静态产物或浏览器本地存储，只在申请人主动领取时返回；后台不能查看其他用户已发放的明文密钥。使用说明是普通文本，请将密钥填入专门的 API Key 字段。
- 审批保存审核人、时间、额度与反馈；仅允许从待审核进入通过或拒绝，重复或并发审批返回 409，不能覆盖原结果。
- 当前不发送申请或审批通知邮件；申请人登录页面查询状态。

## API

所有接口使用现有 HttpOnly Cookie 会话，响应 `Cache-Control: no-store`。写入检查同源 `Origin`，按账户限流并限制请求体 16 KiB。停用、过期会话无法访问。`page` 从 1 开始，每页 20 条。

| 接口 | 作用 |
| --- | --- |
| `GET /api/token-requests?page=1` | 本人申请、总数、能否继续申请 |
| `POST /api/token-requests` | `{ projectName, purpose, requestedTokens }` |
| `GET /api/token-requests/:id/credential` | 仅申请人可读取已通过申请的 API Key |
| `GET /api/admin/users?page=1&q=...` | 管理员查看全部用户 |
| `GET /api/admin/token-requests?page=1&status=pending` | 管理员筛选申请，状态也支持 `all/approved/rejected` |
| `PATCH /api/admin/token-requests/:id` | 通过：`{ status: 'approved', grantedTokens, apiKey, reviewNote }`；拒绝：`{ status: 'rejected', reviewNote }` |

`requestedTokens` / `grantedTokens` 为 1–1,000,000,000 的整数；说明最长 2000 字符，API Key 最长 4096 字符。角色由服务端配置实时计算，客户端不能自行设为管理员。

`npm test` 使用真实本地 D1 runtime 验证申请→审核→领取、加密存储、账户隔离、管理员撤权、拒绝重申、并发、搜索分页、输入校验、CSRF、限流及失效账户。
