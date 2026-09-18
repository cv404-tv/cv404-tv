# 邮箱账户部署与验证

## 交付内容

- `components/auth.jsx`：全局账户状态、邮箱登录弹窗、昵称、退出。关闭弹窗保留当前登录步骤，成功后留在原页面。
- `lib/auth-copy.js` / `src/auth.css`：中英文文案、双主题、移动布局。
- `worker/auth.js`：验证码与账户 API；`worker/index.js` 转交认证请求，并处理定时清理。
- `migrations/0001_auth.sql`：用户、验证码挑战、会话、严格限额。
- `migrations/0002_user_ids.sql`：为所有现有用户生成唯一的 8 位用户 ID，保留内部主键和会话。
- `tests/auth.test.mjs`：真实本机 Miniflare D1 集成测试；发信通过测试替身捕获，没有线上请求。

## 首次生产配置

以下命令应在管理 `cv404.tv` 的 Cloudflare 账户下运行。不要替换、删除现有 `TIER_SNAPSHOTS` 命名空间。

1. `npx wrangler login` 完成官方 OAuth 登录。
2. 本账户的 `cv404-accounts` 数据库已创建，ID 为 `43ecf057-06a2-4953-89b4-fdb8acf8c830`，`0001_auth.sql` 已在控制台初始化并登记。不要重复创建。迁移到其他账户时，执行 `npx wrangler d1 create cv404-accounts` 并更新 `AUTH_DB.database_id`，保留 `migrations_dir`。
3. `npx wrangler d1 migrations apply AUTH_DB --remote`，在新数据库创建账户表。
4. 在 Cloudflare 控制台的 Email Service → Email Sending 中开通 `cv404.tv` 发信域名，确认域名验证完成。此能力目前为 Beta，需 Workers Paid 计划；若账户要求升级付费或接受新条款，应先由所有者确认。
5. 生成不少于 32 字节的随机密钥，通过 `npx wrangler secret put AUTH_SECRET` 写入。不要放在 `wrangler.jsonc`、前端环境变量、命令行参数、日志或 Git 中。生产密钥与本地 `.dev.vars` 分开。
6. 发件人为 `login@cv404.tv`；邮件 binding 只允许此发件地址。若改地址，同时更新 `AUTH_EMAIL_FROM` 与 `allowed_sender_addresses`。
7. `npm test`、`npm run deploy:check` 后运行 `npm run deploy`。`npm run deploy` 会先检查数据库是否仍为占位，避免误发未配置版本。
8. 在 `https://cv404.tv` 用所有者指定的测试邮箱验收真实邮件、输入验证码登录、刷新保持登录、改昵称和退出。供应商接受发送不等于邮件一定到达收件箱；需人工收件确认，建议覆盖实际用户常用邮箱。

`AUTH_ORIGIN` 固定为 `https://cv404.tv`，生产认证 API 拒绝其他域名；`workers.dev` 仍可展示静态页面，但不是账户登录域名。以后添加其他生产域名时，应明确设计允许来源及 Cookie 作用域，不能简单信任请求 Origin。

## 用户 ID 更新

部署此版本前运行 `npx wrangler d1 migrations apply AUTH_DB --remote`，随后部署新版 Worker。迁移会为所有已有账户（包括禁用账户）填充 `users.public_id`；旧版 Worker 在迁移后不能创建新账户，因此应紧接着部署新版。

用户 ID 由 `a-z`、`0-9` 组成，固定 8 位，在「我的账户」中显示并可选中复制。它是永久标识，不是登录凭据；内部 UUID 和会话关联不变。新账户使用安全随机数生成，唯一索引防止重复；发生碰撞时重试整个登录事务，最多 5 次。昵称修改和重复登录都不会更改用户 ID。

迁移中的极低概率 ID 碰撞会使迁移事务失败并回滚；重新执行迁移即可重新生成。不要手工改写已经分配的 ID。API 的 `userId` 是展示用的短 ID，`id` 继续表示内部 UUID。

## 本地开发

```sh
npx wrangler d1 migrations apply AUTH_DB --local
# 在 .dev.vars 中设置 AUTH_SECRET（随机生成，不提交）
npm run build
npm run preview
```

访问 `http://127.0.0.1:8787`。`dev.host` 显式设置此地址，避免 Wrangler 从线上自定义域名推导上游，导致本地同源校验失败。若换端口，也要同步 `dev.host`。

本地邮件 binding 不连接线上；模拟邮件保存在 `.wrangler/tmp/email/` 下，终端输出具体路径。只用 `example.com` 测试地址，勿把模拟邮件内容当成线上送达证据。

生产 Cookie 使用 `__Host-cv404_session`；本机 HTTP 预览使用 `cv404_session`，仅本机主机名允许此差异。部署环境没有万能验证码或调试读取验证码接口。

## API

所有写请求要求严格同源 `Origin` 与 JSON Content-Type，正文上限 2 KB。所有身份响应 `Cache-Control: no-store`，不启用跨域凭据共享。

| 方法与路径 | 输入 | 输出 |
| --- | --- | --- |
| POST `/api/auth/send-code` | `{email, locale}` | `{challengeId, email, expiresIn, retryAfter}`；设置短期浏览器绑定 Cookie |
| POST `/api/auth/verify-code` | `{challengeId, code}` + 浏览器绑定 Cookie | `{user}`；设置会话 Cookie、清除绑定 Cookie |
| GET `/api/auth/me` | 会话 Cookie | `{user: {id,userId,email,nickname}}` 或 `{user:null}` |
| PATCH `/api/account` | `{nickname}` + 会话 | `{user}`；昵称可为空，最多 32 个 UTF-16 代码单元 |
| POST `/api/auth/logout` | `{}` | 撤销当前会话并清除 Cookie；幂等 |
| POST `/api/auth/logout-all` | `{}` + 会话 | 删除此用户全部会话并清除 Cookie |

没有修改邮箱、密码、管理员授权、草稿认领或云同步接口。`users.status = disabled` 会阻止登录和现有会话访问；没有提供公开修改状态的接口。

## 安全与运行规则

- 邮箱按去首尾空格、转小写作为账户键；不合并点号或 `+tag`。只支持标准 ASCII 邮箱地址。
- 使用安全随机数生成六位验证码，避免取模偏差。校验值为 HMAC-SHA256，绑定挑战 ID、邮箱和验证码；不保存明文验证码。
- 每个邮箱同一时刻仅保留一次挑战。重发立即替换旧挑战；供应商发送失败删除新挑战并允许冷却结束后重试。发送失败也占用预算，避免恶意重试消耗发信资源。
- 挑战最多 5 次验证，10 分钟到期。邮箱跨挑战每小时最多 20 次验证，重发不重置此限制。
- 发送限额：邮箱每 60 秒 1 次、每小时 5 次；IP 每 10 分钟 20 次；全站每小时 100 次、每日 500 次。均从各自窗口首次请求起计时。达到阈值返回 429 与 `Retry-After`，第一版采用直接限流，不依赖人机验证配置。
- 严格预算存于 D1，通过 CHECK 约束和事务批处理实现；不能用最终一致的 KV 或边缘限流作为验证码尝试数的唯一依据。限额键使用 HMAC，不在限额表存原始邮箱或 IP。
- 验证码消费、用户创建、会话建立在单个 D1 batch 内完成。唯一 claim token 门控每一步，只有成功消费的一次请求可创建会话；并发重放测试应始终只成功一次。
- 会话为 256 位随机令牌，数据库仅存摘要。30 天固定到期，不滚动续期。退出立即在主库撤销，后续请求重新检查会话和用户状态。
- 不在日志输出邮箱、验证码、会话令牌或邮件供应商错误正文。Worker 只记录不带个人信息的 `auth_request_failed`。
- 每小时第 17 分钟清理过期挑战、会话和限额；用户记录不会被此任务删除。
- 会话令牌不存 localStorage。标签页通过 BroadcastChannel 通知重新读取身份；窗口重新获得焦点也更新身份。
- 邮箱泄露或被接管意味着账户可能被接管；后续若加入资金、管理员等高权限功能，需要另行设计更强认证。

## 验收

`npm test` 包含验证码并发消费、并发猜码、重发、全局预算、邮件失败、会话过期、禁用用户、CSRF 来源、正文限制、昵称归属和清理测试。Miniflare 需要允许监听本机端口。

本地 preview 运行时执行 `npm run test:api` 回归已有匿名分享与静态路由。浏览器人工覆盖：中英文、双主题、390 px 手机宽度、发送模拟验证码、首次登录、昵称保存、刷新保留登录、退出所有设备。

参考：[D1 batch 事务](https://developers.cloudflare.com/d1/worker-api/d1-database/)、[Cloudflare Email Sending](https://developers.cloudflare.com/email-service/get-started/send-emails/)。
