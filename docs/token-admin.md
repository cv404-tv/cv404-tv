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

## 个人中心与账户管理

新增 `/account`，已登录用户可从页头账户入口进入。支持修改昵称、查看注册时间、申请/额度/投票统计、分页查看有效登录会话、退出其他会话和退出当前登录，并提供 Token、锐评、指南和管理员后台快捷入口。会话只展示登录时间与到期时间，不采集设备指纹；会话数量不代表设备数量。额度统计不是供应商余额。

后台新增「数据概览」「操作记录」；用户列表可按状态筛选、查看该用户申请，申请列表可搜索项目、邮箱、昵称或用户 ID。管理员可填写原因后启用/停用普通用户、使其全部会话失效。不能操作自己或配置中的任何管理员。停用/强制下线会删除现有登录会话和未完成的验证码挑战；重新启用不会恢复旧会话。停用不会撤销已发放的供应商 API Key，供应商侧撤销需单独处理。

上线前执行 `npx wrangler d1 migrations apply AUTH_DB --remote`，包含新增的 `0005_management.sql`；本地验证使用 `--local`。该迁移创建操作记录表，并回填历史 Token 审批。用户管理操作和日志在同一事务中保存，审批日志由数据库触发器在审批事务中写入；记录包含操作人、目标用户、动作、原因（或申请编号）与时间，不包含 API Key。

| 接口 | 作用 |
| --- | --- |
| `GET /api/account/overview` | 本人账户信息、申请/额度/投票/会话统计 |
| `GET /api/account/sessions?page=1` | 本人有效会话（不返回会话凭据或摘要） |
| `DELETE /api/account/sessions` | JSON `{}`，退出本人其他会话，保留当前会话 |
| `GET /api/admin/overview` | 全站用户和申请统计 |
| `GET /api/admin/audit?page=1` | 分页操作记录 |
| `PATCH /api/admin/users/:userId` | `{ action: 'enable' / 'disable' / 'revoke_sessions', reason }`，原因 1–300 字 |

`GET /api/admin/users` 新增 `status=all/active/disabled`；`GET /api/admin/token-requests` 新增 `q` 搜索参数。所有新接口沿用同源、会话、管理员鉴权；写操作有限流，空状态和网络失败可重新刷新。

## 后台运营工作台

- 数据概览新增待审工作台：显示待审总数、等待超过 48 小时的数量、最早提交时间和停用账户的待审数量；点击「从最早申请开始」进入按时间正序排列的待审队列。
- 近 7 天趋势显示每日新用户、新申请、完成审核数量，提供可展开的每日数字表。按 UTC 自然日统计（含今天），无数据日期补零；「近 7 天新用户」使用相同统计范围。页面显示本次统计更新时间，手动刷新更新数据。
- 用户列表、申请卡片和操作记录中的用户名称可打开详情：账户信息、累计申请、待审数、发放额度、有效会话数，以及最近 5 条申请和最近 5 条操作。可跳转查看该用户的全部申请或操作记录；使用精确用户 ID 筛选，避免与项目名中的相同文字混淆。
- 操作记录可组合筛选关键词、操作类型、起止日期和目标用户。关键词匹配操作人邮箱、目标用户邮箱/ID、原因或申请编号；日期按 UTC 计算，包含结束日全天。
- 申请列表支持最早/最新提交排序。各标签的关键词、筛选项、排序和页码在当前后台页面内切换时保留；刷新整个页面后重置。审批成功后留在当前页，最后一页清空时自动回退。审批密钥不写入持久存储。
- 停用用户的待审申请保留，页面说明需先恢复账户后审批。用户详情接口不返回会话凭据、API Key 或加密密文。

| 接口 | 新增参数 / 内容 |
| --- | --- |
| `GET /api/admin/overview` | `overdue`、`oldestPendingAt`、`blockedPending`、`asOf`，以及连续 7 天的 `trend: [{ day, users, applications, reviews }]` |
| `GET /api/admin/users/:userId` | 精确用户资料、申请/额度/会话/投票汇总、最近 5 条申请及目标用户操作记录 |
| `GET /api/admin/token-requests` | `userId` 精确筛选，`sort=oldest/newest`；API 默认 `newest` 保持兼容，后台默认 `oldest` |
| `GET /api/admin/audit` | `q`、`action=all/enable/disable/revoke_sessions/token_approved/token_rejected`、`userId`、`from=YYYY-MM-DD`、`to=YYYY-MM-DD` |

本次扩展使用现有表，无新增迁移；环境仍须已应用 `0005_management.sql`。所有接口继续在服务端实时验证管理员身份，统计与详情响应不缓存。
