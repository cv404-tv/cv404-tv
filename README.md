# 云谷404 TV

基于 **Next.js App Router + React + Three.js** 的云谷404官网。保留液态玻璃电视、默认关机、频道切换、随机雪花、开关机动画、鼠标视差和立体 404。

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

页面继续使用 Next.js 官方静态导出。`worker/index.js` 单独处理 `/api/*`，用 Cloudflare SQLite Durable Objects 保存匿名白板快照，其余请求走静态资产。没有用户登录或投稿接收接口。未来使用 Next.js Server Actions、运行时服务端渲染、Cookie 会话或 API Route 时，仍需配置 Next.js 服务端适配方案。

路由：`/` 是电视首页，`/guide` 是创作指南，`/tier-list` 是「锐评小工具」（从夯到拉排名玩法）；`/tier-list?share=<UUID>` 展示只读分享版本。`/guide.html` 保留为静态文件入口，便于旧链接继续访问；不存在的页面返回 404。Next.js 的 `_next/` 资源及路由载荷一同发布，支持 App Router 页面跳转。

## 锐评小工具

其他页面右上角「锐评一下」进入 `/tier-list`，锐评页面自身隐藏此入口；首页「一起做点东西」移至电视与频道切换区下方，继续打开参与说明弹框。

- 首个默认分类是「Logo 贴纸」，合并品牌预设和自定义上传：顶部的「自定义 Logo」入口打开上传弹框，支持选填名称、格式与大小校验、成功后自动关闭；第二个分类是「文字贴纸」。预设第一项是云谷404（复用 `public/assets/brand-header.svg`），随后是 14 个模型品牌：DeepSeek、千问、豆包、智谱、Claude、ChatGPT、Gemini、Grok、Kimi、MiniMax、文心一言、腾讯混元、讯飞星火、Mistral。每项使用 SVG Logo＋名称，AI 品牌素材来自 Lobe Icons，已固定版本保存在 `public/assets/ai-logos/`，附来源和授权文件。LLaMA、Gemma 已从选择列表移除；兼容已有草稿与分享。用户只能选用；系统目录位于 `lib/ai-stickers.js` 的 `LOGO_STICKERS`，不提供公开增删改接口。预设沿用 `type: "ai"` 存储格式，兼容已有草稿与分享。服务端通过 `presetId` 还原名称与样式，忽略客户端的外观覆盖。修改已有贴纸时使用新的版本 ID，并保留旧定义，确保已分享快照不变。
- 五档白板，文字贴纸支持六种底色；Logo 支持 PNG / JPEG / WebP（单文件最多 500 KB，每块白板最多 6 个自定义 Logo），在浏览器中缩小到最长边 256 px 后保存，不上传原图。不调用 AI 图片生成服务。前端先限制原文件大小和数量，分享 API 再校验自定义 Logo 数量。
- Logo 贴纸库和文字预设可直接拖入白板档位，落点生效时才创建贴纸，拖到板外或按 Esc 取消；官方 Logo 上榜后从预设库隐藏，放回后按原顺序重新出现；点击预设只选中，随后点击档位上榜。拖到页面上下边缘可自动滚动；添加并归档只需一步撤销。也保留点击添加。
- 拖动已上榜贴纸时，白板右上角“撤销／清空”临时替换为“放回”区域，保留垃圾桶图标，移入后提示“松手放回”。松手按来源放回：官方 Logo 回上方预设库，自定义 Logo 和文字贴纸回下方“自定义贴纸”区；保留 ID、名称、颜色和图片，总数不变；“撤销放回”可恢复原档位和顺序。选中板上卡片后的操作也为“放回”；自定义区仍可显式删除卡片。新贴纸和未上榜贴纸拖动时不显示放回区。旧草稿中未上榜的官方 Logo 也归回预设库。
- 支持鼠标／触控指针拖拽、点选贴纸后点档位、下拉选择档位、同档前后移动、删除、撤销和清空；一块白板最多 40 张贴纸，总数据最多 1 MB。
- 草稿保存于当前设备的 `cv404-tier-draft-v1`。浏览器不允许存储或空间不足时显示提示；草稿不跨设备同步。
- `POST /api/tier-boards` 将已上榜的贴纸保存为独立快照，返回随机 UUID 分享链接。待上榜贴纸不分享。`GET /api/tier-boards/<UUID>` 匿名读取；无修改、删除或列表接口。任何持有链接的人都能查看，分享后编辑草稿不会改变快照。
- Worker 校验类型、大小、图片格式、同源请求；Cloudflare Rate Limiting binding 限制同一 IP 每个位置每分钟约 30 次创建请求（平台限流不是全局精确配额）。图片仅接受内嵌栅格数据，不接受外部 URL / SVG。
- SQLite Durable Object 命名空间随首次部署的 `tier-snapshots-v1` migration 创建；无需额外密钥或手动填写数据库 ID。需部署到支持该绑定的 Cloudflare 账户后，外部访客才能使用分享。上线部署与本地验收是独立步骤。
- `npm run dev` 只运行静态前端；验证分享使用 `npm run dev:worker`（或先 build，再 preview），打开 `http://127.0.0.1:8787/tier-list`。本地快照在 `.wrangler/`，不会上传到线上；本地分享 URL 只在本机可访问。

检查：`npm test` 覆盖数据校验与贴纸移动；本地 Workers preview 运行时用 `npm run test:api` 验证匿名创建、读取、快照不可变、唯一链接、输入限制和原有静态路由。测试脚本只允许 localhost，创建的是本地测试数据。

## 语言与主题

- 页头支持中文／英文、日间／夜间切换。
- 中文为默认语言；主题首次跟随系统，手动选择后记住偏好。
- `cv404-language` 和 `cv404-theme` 保存在浏览器本地；存储不可用时仍可切换。
- 翻译覆盖四个频道、控制按钮、参与说明、指南及 404 页面。品牌名称随语言切换：中文为“云谷404”，英文为“Cloud Valley 404”；海报和原始指南是中文历史材料，英文页面已标注。
- 切换语言或主题不会重置当前电视频道与电源；重新加载或重新进入首页时默认关机。

## 代码组织

- `app/`：Next.js 布局、首页、指南和 404 路由。
- `components/television.jsx`：电视 React 状态、频道内容、开关机和音频生命周期。
- `components/preferences.jsx`：共享语言／主题状态及切换控件。
- `components/site-shell.jsx`、`components/guide.jsx`：共享页头页脚和指南。
- `lib/copy.js`：中英文内容；新增内容时同步更新两种语言。
- `lib/static-effect.js`：随机雪花绘制与取消。
- `src/style.css`、`src/preferences.css`：品牌样式、双主题和英文布局适配。
- `src/tv-effects.js`、`src/tv-effects.css`：机身视差与玻璃高光。
- `src/tv-scene.js`：按需加载的 Three.js 立体字；无外部模型、字体或贴图请求。
- `public/assets/brand-header.svg`：最终 Logo 页头版，收紧画布，米白区域透明镂空。
- `components/brand-mark.jsx`：页头交互 SVG，采用独立预览页确认的上下对称横向 ∞ 轨迹。鼠标悬停或键盘聚焦时从原 Logo 叠放姿态平滑展开，两个三角匀速走完整圈、交替穿心、近小远大，圆环同步自转并在穿心时正面全开。移开后约 1.2 秒归位，圆环连续展开恢复宽度；快速重入先归位再播放。每圈 8 秒，轨道不显示，通过收紧左右和上下活动范围适配固定页头尺寸。Logo 整体保持原始显示比例，圆环保持默认尺寸，三角仅在靠近圆心时缩小、远离时恢复大小。减少动态效果或页面隐藏时回到静止姿态。参数与生命周期分别位于 `lib/brand-motion.js`、`lib/brand-playback.js`。
- `public/assets/event-poster.png`、`first-event-guide.md`：第一期活动原始素材。

品牌色为米白 `#F2EBDD`、墨黑 `#22272A`、红色 `#C83832`。三维渲染像素比上限 1.5，指针停下后停止连续渲染；后台、关机、其他频道或离开视口时不绘制三维场景。WebGL 不可用时保留 CSS 装饰。系统减少动态效果时关闭视差、开关机动画和雪花。

`node_modules/`、`.next/`、`out/`、`.wrangler/`、`output/` 和本地凭据不提交。官网当前未接入 shadcn/ui；迁移后的 React 结构可继续接入所需组件。
