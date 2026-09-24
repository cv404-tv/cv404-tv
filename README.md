# 云谷404 TV

基于 **Next.js App Router + React + Three.js** 的云谷404官网。首页为「404 信号搜寻」游戏，活动页保留木纹 CRT 电视：厚机箱、金属面板、内凹屏幕边框、曲面玻璃反射、机械旋钮、扬声器格栅和脚座。活动页默认开机展示黑客松活动频道，支持频道切换、随机雪花、亮线开关机动画、鼠标视差和立体 404。

## 开发与构建

```sh
npm ci
npm run dev
# 默认 http://127.0.0.1:3000；端口被占用时：
npm run dev -- --port 3004
npm run build
npm run preview
```

`npm run build` 使用 Next.js 静态导出，生成 `out/`；`npm run preview` 在本地 Workers runtime 的 8787 端口预览生产产物。此前的 Vite 入口已移除。

## Cloudflare Workers

```sh
npm run deploy:check
npx wrangler login
npm run deploy
```

Worker 名称 `cv404-tv`，自定义域名 `cv404.tv`，资产目录 `out/`。正式发布使用管理该域名的 Cloudflare 账户。Workers Builds 可配置构建命令 `npm run build`，部署命令 `npx wrangler deploy`。

页面继续使用 Next.js 官方静态导出。`worker/index.js` 单独处理 `/api/*`，用 Cloudflare SQLite Durable Objects 保存匿名白板快照，用 D1 保存邮箱账户和登录会话，其余请求走静态资产。Cookie 会话由独立 Worker 管理，不需要 Next.js 服务端适配；未来使用 Next.js Server Actions、运行时服务端渲染或动态 Route Handlers 时，才需要服务端适配方案。

## App 隐私政策

`/privacy` 是可公开访问的中英双语软件隐私政策，适用于明确链接本页、仅在设备本地处理数据的应用。页面包含权限、系统备份与主动分享、保存与删除、支持邮件、未成年人保护和联系方式；正文静态导出，关闭 JavaScript 仍可阅读，采用单栏正文，支持手机及打印布局。网站页脚提供入口。

政策文案与联系邮箱在 `lib/privacy-policy.js`，页面与样式在 `app/privacy/`。页面联系信息仅保留邮箱 `kinggreenhall@gmail.com`。若应用新增登录、上传、统计、广告 SDK 或内购，须先按实际处理方式修订本政策，或提供独立政策，不能继续直接套用当前声明。本政策不覆盖网站自身的账户和在线服务。

部署后可在 App Store Connect 的隐私政策 URL 填写 `https://cv404.tv/privacy`，并在应用内提供可访问的链接；App Store 隐私标签应与实际数据处理一致。参考 [Apple 隐私要求](https://developer.apple.com/app-store/review/guidelines/#privacy)。

## 邮箱账户

页头「登录」通过 6 位邮箱验证码完成登录；首次验证自动注册。支持 30 天登录状态、昵称修改、退出当前设备和退出所有设备，中英文与日夜主题共用现有设置。游客仍可玩游戏、制作和分享锐评；登录不会自动同步本地草稿或认领历史匿名链接。

`worker/auth.js` 负责认证，`migrations/0001_auth.sql` 定义账户、挑战、会话和限额表。验证码 10 分钟有效、最多 5 次尝试、绑定发起浏览器；D1 事务保证并发校验不能重复使用。验证码存 HMAC，随机会话令牌仅存 SHA-256 摘要，生产 Cookie 为 `__Host-`、HttpOnly、Secure、SameSite=Lax。身份查询走 D1 主库，不缓存；每小时清理过期记录。

本地先执行 `npx wrangler d1 migrations apply AUTH_DB --local`，在忽略提交的 `.dev.vars` 中配置至少 32 字符的随机 `AUTH_SECRET`，再 build + preview。本地 `EMAIL` binding 捕获邮件而不实际发送；终端显示模拟邮件正文文件路径。`npm run dev` 只运行前端，登录验证需要 Workers preview。

生产数据库 `cv404-accounts` 已创建并填入配置；生产还需 `AUTH_SECRET` secret 和 Cloudflare Email Sending 域名开通。具体步骤和接口约定见 [账户部署说明](docs/email-auth.md)。

路由：`/` 是游戏首页，`/events` 是黑客松活动电视页，`/events/xhs-xgj` 是第一期迷你黑客松活动介绍，`/events/xhs-xgj/slides` 是该活动的网页演示（附原始 PPTX 下载），`/signal` 保留为游戏兼容入口（canonical 指向 `/`），`/guide` 是创作指南，`/tier` 是「锐评小工具」（从夯到拉排名玩法）；`/tier?share=<UUID>` 展示只读分享版本。旧的 `/tier-list`（包括分享参数）永久重定向到 `/tier`；`/guide.html` 保留为静态文件入口，便于旧链接继续访问；不存在的页面返回 404。Next.js 的 `_next/` 资源及路由载荷一同发布，支持 App Router 页面跳转。

## 个人中心、免费 Token 与管理后台

`/account` 提供独立个人中心、资料编辑、申请/额度/投票统计与登录会话管理；页头账户入口直达。`/admin` 新增统计概览、账户启停/强制下线和操作记录，支持用户状态与申请关键词筛选。后台还提供积压待办、7 天趋势、用户详情联查、日志组合筛选与申请时间排序；标签切换保留筛选和页码。新版本需应用 `0005_management.sql`，用户管理和审批均保留审计记录。

`/tokens` 提供登录后的免费 Token 申请、进度查询及 API Key 领取；`/admin` 提供全部用户搜索、申请筛选及通过／拒绝审批。API Key 加密保存，只有申请人可读取；审批保留审核人、时间与反馈。每个账户可领取一次免费额度，被拒绝后可重新申请。

启用需应用 `0004_token_requests.sql`，配置 `ADMIN_EMAILS` 管理员邮箱及 `TOKEN_ENCRYPTION_KEY` 加密密钥；只有配置中的邮箱通过登录验证后才有管理员权限。额度与 API Key 由管理员在供应商创建后手动发放。详细配置、操作和接口见 [Token 管理说明](docs/token-admin.md)。

## 404 信号搜寻

`/` 是沿用 CRT 电视外壳的调频小游戏，旧 `/signal` 仍可访问。活动页电视下方、页头及共享页脚提供首页入口，支持中英文与日夜主题。

- 40.4 秒内捕获三个频道：固定频率、缓慢漂移、漂移加周期性干扰。接近目标后累计锁定 1.5 秒；偏离时进度缓慢回退，干扰期间冻结进度。每次捕获后暂停计时，玩家读完再进入下一关。
- 旋钮支持指针拖动、方向键微调、Page Up/Down 快调和 Home/End；原生滑杆提供另一种调频方式。声音默认关闭，可手动打开轻量 Web Audio 提示音。
- 手动暂停、页面隐藏或游戏机离开视口时暂停；回到页面后由玩家恢复。减少动态效果偏好下去除雪花变化和动态波形。Canvas 不可用时仍可通过文字与信号条完成游戏。
- 通关生成 1080×1440 PNG 分享卡，支持预览、下载和长按保存；挑战链接与分享卡指向当前部署的 `/`。本机最高分保存在 `cv404-signal-best-001`，无登录、网络排行榜或新后端依赖。
- 本期频道对应已有的作品频道、第一期活动和创作指南，随时可以阅读。活动页收到有效频道 hash（如 `/events#works`）时显示对应内容，普通 `/events` 默认开机展示黑客松活动频道。
- `lib/signal-game.js` 管理纯游戏规则，`lib/signal-copy.js` 管理双语内容，`lib/signal-card.js` 生成分享卡，`components/signal-game.jsx` 管理交互与生命周期，`src/signal-game.css` 管理游戏布局。更换主题时同步更新三处频道内容及 `ISSUE`，避免旧最高分混入新一期。
- `npm test` 覆盖三关捕获、超时、干扰、锁定回退、关间暂停、重玩及输入边界。

## 锐评小工具

其他页面右上角「锐评一下」进入 `/tier`，锐评页面自身隐藏此入口；活动页「一起做点东西」位于电视与频道切换区下方，打开参与说明弹框。

- 首个默认分类是「Logo 贴纸」，合并品牌预设和自定义上传：顶部的「自定义 Logo」入口打开上传弹框，支持选填名称、格式与大小校验、成功后自动关闭；第二个分类是「文字贴纸」。预设第一项是云谷404（复用 `public/assets/brand-header.svg`），随后是 14 个模型品牌：DeepSeek、千问、豆包、智谱、Claude、ChatGPT、Gemini、Grok、Kimi、MiniMax、文心一言、腾讯混元、讯飞星火、Mistral。每项使用 SVG Logo＋名称，AI 品牌素材来自 Lobe Icons，已固定版本保存在 `public/assets/ai-logos/`，附来源和授权文件。LLaMA、Gemma 已从选择列表移除；兼容已有草稿与分享。用户只能选用；系统目录位于 `lib/ai-stickers.js` 的 `LOGO_STICKERS`，不提供公开增删改接口。预设沿用 `type: "ai"` 存储格式，兼容已有草稿与分享。服务端通过 `presetId` 还原名称与样式，忽略客户端的外观覆盖。修改已有贴纸时使用新的版本 ID，并保留旧定义，确保已分享快照不变。
- 五档白板，文字贴纸支持六种底色；Logo 支持 PNG / JPEG / WebP（单文件最多 500 KB，每块白板最多 6 个自定义 Logo），在浏览器中缩小到最长边 256 px 后保存，不上传原图。不调用 AI 图片生成服务。前端先限制原文件大小和数量，分享 API 再校验自定义 Logo 数量。
- Logo 贴纸库和文字预设可直接拖入白板档位，落点生效时才创建贴纸，拖到板外或按 Esc 取消；官方 Logo 上榜后从预设库隐藏，放回后按原顺序重新出现；点击预设只选中，随后点击档位上榜。拖到页面上下边缘可自动滚动；添加并归档只需一步撤销。也保留点击添加。
- 拖动已上榜贴纸时，白板右上角“撤销／清空”临时替换为“放回”区域，保留垃圾桶图标，移入后提示“松手放回”。松手按来源放回：官方 Logo 回上方预设库，自定义 Logo 和文字贴纸回下方“自定义贴纸”区；保留 ID、名称、颜色和图片，总数不变；“撤销放回”可恢复原档位和顺序。选中板上卡片后的操作也为“放回”；自定义区仍可显式删除卡片。新贴纸和未上榜贴纸拖动时不显示放回区。旧草稿中未上榜的官方 Logo 也归回预设库。
- 支持鼠标／触控指针拖拽、点选贴纸后点档位、下拉选择档位、同档前后移动、删除、撤销和清空；一块白板最多 40 张贴纸，总数据最多 1 MB。
- 草稿保存于当前设备的 `cv404-tier-draft-v1`。浏览器不允许存储或空间不足时显示提示；草稿不跨设备同步。
- 白板下方新增「大模型全民榜」：五档对应 +2、+1、0、−1、−2，汇聚所有活跃账户的投票，按平均分降序排名，同分并列；显示票数、各档分布和登录用户已发布的投票。未投票模型不参与排名，0 分是有效投票。云谷404 Logo、自定义文字和图片不计入模型榜。
- 登录后点击「发布我的投票」，将当前白板上的模型档位关联到账户与固定模型 ID。每个账户每个模型只有一票，再次发布原子替换该账户的全部投票，放回或移除的模型不再计票；也可撤回全部投票。匿名分享功能独立保留，不会自动计票。投票数据跨设备保存，白板草稿仍留在本机；公开榜单不泄露邮箱、会话或内部用户 ID。
- `GET /api/tier-rankings` 匿名读取榜单；`GET /api/tier-rankings/mine` 读取自己的投票；`PUT` 提交 `{ votes: [{ cardId, score }] }` 替换，`DELETE` 撤回。写入需要有效会话和同源 Origin，按账户限流，重复模型或非整数／范围外评分被拒绝。通过刷新榜单或重新聚焦页面更新结果。
- 投票使用现有 `AUTH_DB` 的 `0003_tier_votes.sql` migration；本地执行 `npx wrangler d1 migrations apply AUTH_DB --local`，上线前执行 `npx wrangler d1 migrations apply AUTH_DB --remote`。迁移未应用时榜单明确提示加载失败。
- `POST /api/tier-boards` 将已上榜的贴纸保存为独立快照，返回随机 UUID 分享链接。待上榜贴纸不分享。`GET /api/tier-boards/<UUID>` 匿名读取；无修改、删除或列表接口。任何持有链接的人都能查看，分享后编辑草稿不会改变快照。
- Worker 校验类型、大小、图片格式、同源请求；Cloudflare Rate Limiting binding 限制同一 IP 每个位置每分钟约 30 次创建请求（平台限流不是全局精确配额）。图片仅接受内嵌栅格数据，不接受外部 URL / SVG。
- SQLite Durable Object 命名空间随首次部署的 `tier-snapshots-v1` migration 创建；无需额外密钥或手动填写数据库 ID。需部署到支持该绑定的 Cloudflare 账户后，外部访客才能使用分享。上线部署与本地验收是独立步骤。
- `npm run dev` 只运行静态前端；验证分享使用 `npm run dev:worker`（或先 build，再 preview），打开 `http://127.0.0.1:8787/tier`。本地快照在 `.wrangler/`，不会上传到线上；本地分享 URL 只在本机可访问。

检查：`npm test` 覆盖数据校验与贴纸移动；本地 Workers preview 运行时用 `npm run test:api` 验证匿名创建、读取、快照不可变、唯一链接、输入限制和原有静态路由。测试脚本只允许 localhost，创建的是本地测试数据。

## 语言与主题

- 个人中心「个人设置」集中管理语言和主题，页头仅保留账户入口。
- 语言和主题默认跟随系统：语言匹配浏览器偏好中的中文或英文（均不支持时回退英文），主题跟随系统明暗模式变化。两项均可手动选择，也可随时恢复「跟随系统」。已有手动偏好继续保留。
- `cv404-language` 和 `cv404-theme` 保存在浏览器本地；存储不可用时仍可切换。
- 翻译覆盖四个频道、控制按钮、参与说明、指南及 404 页面。品牌名称随语言切换：中文为“云谷404”，英文为“Cloud Valley 404”；海报和原始指南是中文历史材料，英文页面已标注。
- 切换语言或主题不会重置当前电视频道与电源；活动页默认开机展示黑客松活动频道，频道深链接直接展示对应内容。

## 代码组织

- `app/`：Next.js 布局、游戏首页、活动页、指南和 404 路由。
- `components/television.jsx`：电视 React 状态、频道内容、开关机和音频生命周期。
- `components/preferences.jsx`：共享语言／主题状态及切换控件。
- `components/site-shell.jsx`、`components/guide.jsx`：共享页头页脚和指南。
- `lib/copy.js`：中英文内容；新增内容时同步更新两种语言。
- `lib/static-effect.js`：随机雪花绘制与取消。
- `src/style.css`、`src/preferences.css`：品牌样式、双主题和英文布局适配。
- `src/tv-effects.js`、`src/tv-effects.css`：机身视差与玻璃高光。
- `src/television.css`：CRT 材质、扫描线与响应式控制面板；日间和夜间主题保持相同物理材质。手机上长频道在屏幕内滚动。
- `public/assets/walnut-grain.svg`：本地程序生成木纹，无外部贴图请求。
- 频道旋钮按四档旋转并循环；实体声音旋钮与频道栏静音按钮同步。声音默认关闭，开启后播放低音量变压器嗡鸣和机械换台／电源声。
- `src/tv-scene.js`：按需加载的 Three.js 立体字；无外部模型、字体或贴图请求。
- `public/assets/brand-header.svg`：最终 Logo 页头版，收紧画布，米白区域透明镂空。
- `components/brand-mark.jsx`：页头交互 SVG，采用独立预览页确认的上下对称横向 ∞ 轨迹。鼠标悬停或键盘聚焦时从原 Logo 叠放姿态平滑展开，两个三角匀速走完整圈、交替穿心、近小远大，圆环同步自转并在穿心时正面全开。移开后约 1.2 秒归位，圆环连续展开恢复宽度；快速重入先归位再播放。每圈 8 秒，轨道不显示，通过收紧左右和上下活动范围适配固定页头尺寸。Logo 整体保持原始显示比例，圆环保持默认尺寸，三角仅在靠近圆心时缩小、远离时恢复大小。减少动态效果或页面隐藏时回到静止姿态。参数与生命周期分别位于 `lib/brand-motion.js`、`lib/brand-playback.js`。
- `public/assets/event-poster.png`、`first-event-guide.md`：第一期活动原始素材。

品牌色为米白 `#F2EBDD`、墨黑 `#22272A`、红色 `#C83832`。三维渲染像素比上限 1.5，指针停下后停止连续渲染；后台、关机、其他频道或离开视口时不绘制三维场景。WebGL 不可用时保留 CSS 装饰。系统减少动态效果时关闭视差、开关机动画和雪花。

`node_modules/`、`.next/`、`out/`、`.wrangler/`、`output/` 和本地凭据不提交。官网当前未接入 shadcn/ui；迁移后的 React 结构可继续接入所需组件。

## 第二期 Jev 黑客松

`/events/jev` 为第二期活动专题，提供 Jev 模型说明、预设决策演示、项目方向、拟定流程和邮箱登录后的报名意向提交。日期、地点、人数及费用未确定，页面明确显示待公布。每个账户每期仅保存一份申请，可返回本页查看回执与审核反馈；`/admin` 新增“黑客松报名”列表与审核功能。

需应用 `0006_hackathon.sql` 后部署。模型调研来源、API、资料使用边界和部署步骤见 [Jev 黑客松说明](docs/jev-hackathon.md)。页面示例不调用真实 Jev；报名审核不自动发送邮件。
