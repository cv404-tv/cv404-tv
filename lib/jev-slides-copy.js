export const jevSlidesCopy = {
  zh: {
    back: '返回活动页', previous: '上一页', next: '下一页', fullscreen: '全屏放映', exitFullscreen: '退出全屏',
    navigationHint: '方向键 / 空格翻页', page: '页',
    slides: [
      {
        kind: 'cover', eyebrow: '云谷404 / 第二期 / JEV SYSTEM ONE', title: 'JEV\n黑客松',
        lead: '让 AI 做出下一步决定。', detail: '09.27  ·  10:00–20:00', secondary: '云谷中心 B2-3F 活动区',
      },
      {
        kind: 'host', eyebrow: '01 / 关于主理人', title: '你好，我是艾林。', role: '云谷404 主理人', avatarAlt: '艾林的头像',
        experience: [['5 年', '算法经验'], ['3 年', '全栈经验'], ['1 年', 'AI 创业经验']],
        achievements: [['20+', 'AI 创业以来做过的产品'], ['5 篇', '10w+ 阅读文章'], ['6K', '小红书粉丝']],
        followTitle: '扫码关注我的小红书', followHint: '点击二维码也可打开主页',
        followLabel: '打开艾林的小红书主页并关注', qrAlt: '艾林的小红书主页二维码',
      },
      {
        kind: 'partners', eyebrow: '02 / 活动伙伴', title: '主办与活动伙伴',
        organizerLabel: '主办方', organizers: ['云谷404', '杭州AI工坊'], coorganizerLabel: '活动伙伴',
        coorganizers: ['杭州黑客与画家', 'YOUR SPACE'],
      },
      {
        kind: 'origin', eyebrow: '03 / 名字的由来', title: '为什么叫 Jev？',
        namesake: 'William Stanley Jevons',
        context: '名字来自经济学家威廉·斯坦利·杰文斯，以及“杰文斯悖论”。',
        observation: '蒸汽机更省煤，煤的总使用量却可能增加。',
        idea: '当一次智能判断变得更快、更便宜，软件就能在更多地方使用它。',
        source: '来源：TypeSafe 创始人的发布文章',
        sourceUrl: 'https://typesafe.ai/blog/introducing-system-one-models-and-jev',
      },
      {
        kind: 'mission', eyebrow: '04 / 今天做什么', title: '把一个判断，\n做成能运行的产品。',
        lead: '选一个真实场景。让 Jev 做关键判断，再让程序采取行动。',
        stages: [['输入', '真实的问题与上下文'], ['判断', '一个明确的 Jev 问题'], ['动作', '产品执行下一步']],
        foot: '信息不足、判断不确定或 API 失败时，也要有回退方式。',
      },
      {
        kind: 'model', eyebrow: '05 / 认识 Jev', title: '给软件一个判断力。',
        lead: 'Jev 接收上下文和明确的问题，返回程序可直接使用的结构化判断。',
        primitives: [['Choice', '从给定选项中选一条路'], ['Score', '按标准衡量一个维度'], ['Noul', '判断命题为真的概率']],
        foot: 'confidence 不是正确率；阈值要按具体场景测试。',
      },
      {
        kind: 'example', eyebrow: '06 / 一个最小案例', title: '从工单，到下一步。',
        quote: '“这笔订单扣了两次钱，能帮我查一下吗？”',
        flow: [['INPUT', '用户提交工单'], ['JEV / CHOICE', '选出 billing'], ['ACTION', '转交账单支持']],
        foot: '如果信息不足或判断不确定，先交给人工确认。',
      },
      {
        kind: 'tracks', eyebrow: '07 / 选一个切口', title: '从小问题开始。',
        tracks: [['01', '聪明的分流器', '让消息、工单或任务去到正确的人或模型。'], ['02', 'Agent 的下一步', '决定继续、补充信息，还是交给人。'], ['03', '会判断的工作流', '筛选内容、整理反馈、排列优先级。']],
        foot: '也欢迎符合主题的自由命题。',
      },
      {
        kind: 'deliver', eyebrow: '08 / 建议交付', title: '演示一个\n完整的判断链路。',
        items: [['01', '可操作 Demo'], ['02', '至少一次真实 Jev 调用'], ['03', '约 10 条自建测试样例'], ['04', '不确定或失败时的回退']],
        foot: '可以使用已有项目和 AI 编程工具；演示时说明活动期间完成的部分。',
      },
      {
        kind: 'timeline', eyebrow: '09 / 活动流程', title: '一天，做出来。',
        timeline: [['10:00–10:30', '签到开场：Jev 模型能力速览与开发资源介绍'], ['10:30–11:00', '自由组队与选题确认'], ['11:00–18:00', '集中开发，巡场答疑'], ['18:00–19:30', '项目 Demo 路演与评审'], ['19:30–20:00', '结果公布、颁奖与自由交流']],
      },
      {
        kind: 'showcase', eyebrow: '10 / 演示与评审建议', title: '让别人看见\n你的判断。',
        lead: '每队建议 5 分钟展示 + 2 分钟提问。',
        scores: [['30', '问题与产品完整度'], ['25', 'Jev 使用是否恰当'], ['25', '测试与回退'], ['20', '演示表达']],
        foot: '评审维度与展示时长为建议。',
      },
      {
        kind: 'closing', eyebrow: 'JEV HACKATHON / 002', title: '现在，开始构建。',
        lead: '带上一个真实问题，做出能体验的作品。',
        detail: '09.27  ·  10:00–20:00', secondary: '云谷中心 B2-3F 活动区  ·  免费报名 / 限 30 名',
        action: '查看活动与报名',
      },
    ],
  },
  en: {
    back: 'Back to event', previous: 'Previous slide', next: 'Next slide', fullscreen: 'Present fullscreen', exitFullscreen: 'Exit fullscreen',
    navigationHint: 'Arrow keys / Space to advance', page: 'Slide',
    slides: [
      {
        kind: 'cover', eyebrow: 'CLOUD VALLEY 404 / EDITION 02 / JEV SYSTEM ONE', title: 'JEV\nHACKATHON',
        lead: 'Give AI a next move.', detail: 'SEP 27  ·  10:00–20:00', secondary: 'Cloud Valley Center · B2-3F event area',
      },
      {
        kind: 'host', eyebrow: '01 / ABOUT THE HOST', title: 'Hi, I’m Ailin.', role: 'CLOUD VALLEY 404 HOST', avatarAlt: 'Portrait of Ailin',
        experience: [['5 yrs', 'in algorithms'], ['3 yrs', 'in full-stack development'], ['1 yr', 'building an AI startup']],
        achievements: [['20+', 'products built since starting up'], ['5', 'articles with 100k+ reads'], ['6K', 'Xiaohongshu followers']],
        followTitle: 'Scan to follow me on Xiaohongshu', followHint: 'Tap the QR code to open my profile',
        followLabel: 'Open Ailin’s Xiaohongshu profile and follow', qrAlt: 'QR code for Ailin’s Xiaohongshu profile',
      },
      {
        kind: 'partners', eyebrow: '02 / EVENT PARTNERS', title: 'Organizer and event partners',
        organizerLabel: 'ORGANIZERS', organizers: ['CLOUD VALLEY 404', 'AI Builder Lab'], coorganizerLabel: 'EVENT PARTNERS',
        coorganizers: ['Hangzhou Hackers and Painters', 'YOUR SPACE'],
      },
      {
        kind: 'origin', eyebrow: '03 / THE NAME', title: 'Why Jev?',
        namesake: 'William Stanley Jevons',
        context: 'Jev is named after economist William Stanley Jevons and Jevons paradox.',
        observation: 'More efficient steam engines could lead to more coal being used overall.',
        idea: 'As each AI judgment gets faster and cheaper, software can use it in more places.',
        source: 'Source: TypeSafe founder’s launch post',
        sourceUrl: 'https://typesafe.ai/blog/introducing-system-one-models-and-jev',
      },
      {
        kind: 'mission', eyebrow: '04 / TODAY’S MISSION', title: 'Turn one judgment\ninto a working product.',
        lead: 'Pick a real situation. Let Jev make a focused judgment, then let your code act on it.',
        stages: [['INPUT', 'A real problem and context'], ['JUDGMENT', 'One focused Jev question'], ['ACTION', 'Your product takes the next step']],
        foot: 'Plan a fallback for missing information, uncertainty, or API failure.',
      },
      {
        kind: 'model', eyebrow: '05 / MEET JEV', title: 'Give software judgment.',
        lead: 'Jev takes context and focused questions, then returns structured decisions your code can use.',
        primitives: [['Choice', 'Pick from defined options'], ['Score', 'Measure one dimension'], ['Noul', 'Estimate whether a statement is true']],
        foot: 'Confidence is not accuracy. Test thresholds for the risks in your use case.',
      },
      {
        kind: 'example', eyebrow: '06 / A SMALL EXAMPLE', title: 'From ticket to action.',
        quote: '“I was charged twice for this order. Can you check?”',
        flow: [['INPUT', 'Customer submits a ticket'], ['JEV / CHOICE', 'Selects billing'], ['ACTION', 'Route to billing support']],
        foot: 'If the information is thin or the decision uncertain, ask a person to confirm.',
      },
      {
        kind: 'tracks', eyebrow: '07 / CHOOSE A DIRECTION', title: 'Start with a small problem.',
        tracks: [['01', 'Smarter routing', 'Send messages, tickets, or tasks to the right person or model.'], ['02', 'An agent’s next move', 'Decide whether to continue, ask for context, or involve a person.'], ['03', 'Judgment in a workflow', 'Filter content, organize feedback, and rank priorities.']],
        foot: 'Bring your own idea if it fits the theme.',
      },
      {
        kind: 'deliver', eyebrow: '08 / SUGGESTED DELIVERABLE', title: 'Show the full\ndecision path.',
        items: [['01', 'A working demo'], ['02', 'At least one real Jev call'], ['03', 'About 10 test examples of your own'], ['04', 'A fallback for uncertainty or failure']],
        foot: 'Existing projects and AI coding tools are welcome. Explain what you built during the event.',
      },
      {
        kind: 'timeline', eyebrow: '09 / EVENT SCHEDULE', title: 'One day to build.',
        timeline: [['10:00–10:30', 'Check-in and opening: Jev capabilities overview and development resources'], ['10:30–11:00', 'Open team formation and topic confirmation'], ['11:00–18:00', 'Focused development and on-site Q&A'], ['18:00–19:30', 'Project demos and judging'], ['19:30–20:00', 'Results, awards, and open conversation']],
      },
      {
        kind: 'showcase', eyebrow: '10 / PROPOSED SHOWCASE & SCORING', title: 'Make your judgment\nvisible.',
        lead: 'Suggested format: 5 minutes to demo + 2 minutes for questions per team.',
        scores: [['30', 'Problem and product completeness'], ['25', 'Appropriate use of Jev'], ['25', 'Testing and fallback'], ['20', 'Demo and explanation']],
        foot: 'Timing and criteria are suggestions.',
      },
      {
        kind: 'closing', eyebrow: 'JEV HACKATHON / 002', title: 'Now, start building.',
        lead: 'Bring a real problem. Make something people can try.',
        detail: 'SEP 27  ·  10:00–20:00', secondary: 'Yungu Center · B2-3F event area · free registration / 30 places',
        action: 'View event and apply',
      },
    ],
  },
};
