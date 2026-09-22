# 第二期 Jev 黑客松

调研核验日期：2026-09-22。专题页 `/events/jev`，活动入口 `/events` 保留第一期电视页，主导航新增第二期报名。

## 模型调研

- [TypeSafe 官方介绍](https://docs.typesafe.ai/introduction)：Jev 为 System One 模型，接收 state 与 typed questions，输出供程序使用的结构化判断；适合拆分成单一维度的小问题。
- [官方 Primitives](https://docs.typesafe.ai/primitives)：Choice 返回选项、概率分布与 confidence；Score 按给定等级评分，返回分值、等级映射、概率与 confidence；Noul 返回命题为真的概率（0–1），无独立 confidence。多个问题共享 state，但相互独立；需要依赖前一个答案时，应用程序应再发起请求。
- [官方 Confidence](https://docs.typesafe.ai/confidence)：阈值应按实际场景和错误代价测试；概率不等于正确性保证。用人工复核或其他模型处理不确定状态。
- [TypeSafe 官网](https://typesafe.ai/)：厂商发布了速度和价格指标，未在本项目独立测量。页面不把营销倍数作为效果承诺。

活动定位建议：做一个以 Jev 判断为关键步骤的可运行产品；方向包括任务分流、Agent 工具调用判断、内容筛选与优先级排序。演示需展示输入、真实判断、应用动作，以及失败/不确定时的回退。建议至少准备 10 个自建样例，它们仅用于小规模演示，不能证明生产准确率。页面示例完全是预设教学数据，不调用 Jev、不产生 API 费用。

## 未确认安排

时间、地点、人数、费用、组队规则、奖项、API 额度与合作方尚未确定。当前页面为报名意向征集，流程与作品要求标为拟定/建议，不虚构活动安排或官方合作。正式安排确认后应同时更新 `lib/hackathon-copy.js` 的中英文内容。

## 报名与管理

- 复用站点邮箱登录。必填称呼、角色、方向、10–1000 字想法及资料使用同意；联系方式选填。邮箱来自已验证账户，拒绝客户端指定报名归属。
- `GET /api/hackathon/applications` 查询自己的报名；`POST` 提交。数据库唯一约束保证每个账户每期一份，重试返回原回执。报名资料不在公开接口中提供。
- `/admin` 的“黑客松报名”标签展示名单，可按状态筛选、翻页，并审核通过/不通过。`GET /api/admin/hackathon` 和 `PATCH /api/admin/hackathon/:id` 复用服务端管理员权限。
- 状态更新仅允许从 pending 转为 approved/rejected，附必填反馈，触发器保留审核人和时间的审计记录。并发审核只有一次成功。
- 页面可查看审核结果；审核不会自动发送邮件，具体联络由主办方安排。
- 暂不提供申请人自助修改/删除；需要时联系主办方。报名信息仅用于本期审核与联络。

## 部署

先执行 `npx wrangler d1 migrations apply AUTH_DB --local` 用于本地预览。上线前必须执行 `npx wrangler d1 migrations apply AUTH_DB --remote` 应用 `0006_hackathon.sql`，然后按已有流程 `npm run deploy`。不需要 Jev API Key，也不新增邮件服务配置。仅运行 Next 开发服务器不具备报名 API；完整预览需构建后运行 Wrangler。

验证：`node --test tests/hackathon.test.mjs` 覆盖实际本地 D1 的保存/回读、重试幂等、隔离、管理员审核及审计、并发冲突、输入校验、同源保护、账户停用与服务不可用。另需 `npm test` 与 `npm run build`。
