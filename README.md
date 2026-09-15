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

当前使用 Next.js 官方静态导出能力，适合现有展示和客户端交互。未来使用 Server Actions、运行时服务端渲染、Cookie 会话或 API Route 时，需要关闭静态导出并配置适配 Workers 的 Next.js 服务端部署方案。当前没有登录、数据库或投稿接收接口。

路由：`/` 是电视首页，`/guide` 是创作指南；`/guide.html` 保留为静态文件入口，便于旧链接继续访问；不存在的页面返回 404。Next.js 的 `_next/` 资源及路由载荷一同发布，支持 App Router 页面跳转。

## 语言与主题

- 页头支持中文／英文、日间／夜间切换。
- 中文为默认语言；主题首次跟随系统，手动选择后记住偏好。
- `cv404-language` 和 `cv404-theme` 保存在浏览器本地；存储不可用时仍可切换。
- 翻译覆盖四个频道、控制按钮、参与说明、指南及 404 页面。品牌名称保留“云谷404”；海报和原始指南是中文历史材料，英文页面已标注。
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
- `public/assets/event-poster.png`、`first-event-guide.md`：第一期活动原始素材。

品牌色为米白 `#F2EBDD`、墨黑 `#22272A`、红色 `#C83832`。三维渲染像素比上限 1.5，指针停下后停止连续渲染；后台、关机、其他频道或离开视口时不绘制三维场景。WebGL 不可用时保留 CSS 装饰。系统减少动态效果时关闭视差、开关机动画和雪花。

`node_modules/`、`.next/`、`out/`、`.wrangler/`、`output/` 和本地凭据不提交。官网当前未接入 shadcn/ui；迁移后的 React 结构可继续接入所需组件。
