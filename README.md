# 云谷404 TV

云谷404 的液态玻璃电视官网。四个频道承载品牌、作品征集、第一期活动档案和社区介绍。

配色沿用最终 Logo：米白 `#F2EBDD`、墨黑 `#22272A`、品牌红 `#C83832`。深色背景与暖灰玻璃外壳承托米白屏幕，红色用于按钮、频道选中态和信号灯。品牌色定义在 `src/style.css` 的 `--brand-*` 变量中。

## 本地运行

```sh
npm ci
npm run dev
```

支持频道按钮、旋钮、方向键切换、浏览器前进后退、电源开关、手动启用的合成氛围声，以及原生参与说明对话框。移动端使用底部频道栏；减少动态效果的系统偏好会关闭动画。

## Cloudflare Workers 部署

使用 [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)，静态文件由 Worker 托管，无需数据库或服务端密钥。

```sh
npm run deploy:check
npx wrangler login
npm run deploy
```

首次部署会创建 `cv404-tv` Worker。Wrangler 登录必须由账户持有人完成。也可以在 Cloudflare Workers Builds 中连接仓库，构建命令 `npm run build`，部署命令 `npx wrangler deploy`。

正式域名为 `cv404.tv`，`wrangler.jsonc` 已配置该自定义域名，页面 canonical 与 sitemap 同步使用此地址。部署时登录的 Cloudflare 账户需要管理 `cv404.tv` 所在 zone；正式发布前确认目标账户及现有域名绑定。上线后验证首页、`/#events`、`/guide.html`、不存在路径的 404 和响应头。

```sh
npm run dev:worker
```

上述命令可在本地 Workers runtime 中检查真实资产路由和 `_headers`。

## 内容维护

- `index.html`：四个频道正文和参与说明。
- `src/main.js`：频道交互；顶部 `contact` 可接入经确认的长期 HTTPS 参与入口。
- `guide.html`：第一期创作指南摘要。
- `public/assets/first-event-guide.md`：原始完整指南，标注为历史活动资料。
- `public/assets/event-poster.png`：用户现有第一期正式海报。
- `public/assets/brand.svg`：用户确认的最终 Logo，使用 `logo-v9-shapes/layouts/01b-deep-staircase-50.svg` 原始矢量稿；`public/favicon.svg` 使用相同图形。

当前没有已核实的作品链接，因此作品频道显示征集说明；没有将示例作品包装为已发布项目。下一期时间、参与入口、合作关系需确认后更新。

`dist/` 是可部署产物，`output/` 是本地验收截图，不提交构建产物、凭据或个人资料。
