export const jevSlidesCopy = {
  zh: {
    back: '返回活动页', previous: '上一页', next: '下一页', fullscreen: '全屏放映', exitFullscreen: '退出全屏',
    navigationHint: '方向键 / 空格翻页', page: '页', posterDetails: '海报信息', draft: '建议流程，具体安排以主办方通知为准',
    slides: [
      {
        kind: 'cover', eyebrow: '云谷404 / 第二期 / JEV SYSTEM ONE', title: 'JEV\n黑客松',
        lead: '让 AI 做出下一步决定。', detail: '09.27  ·  10:00–20:00', secondary: '云谷中心 B2-3F 活动区',
      },
      {
        kind: 'partners', eyebrow: '01 / 活动伙伴', title: '主办与拟邀伙伴',
        organizerLabel: '主办方', organizer: '云谷404', coorganizerLabel: '拟邀协办 · 待确认',
        coorganizers: ['杭州AI工坊', '杭州黑客与画家', 'YOUR SPACE', '魔搭社区'],
        foot: '合作关系以主办方最终公告为准。',
      },
      {
        kind: 'mission', eyebrow: '02 / 今天做什么', title: '把一个判断，\n做成能运行的产品。',
        lead: '选一个真实场景。让 Jev 做关键判断，再让程序采取行动。',
        stages: [['输入', '真实的问题与上下文'], ['判断', '一个明确的 Jev 问题'], ['动作', '产品执行下一步']],
        foot: '信息不足、判断不确定或 API 失败时，也要有回退方式。',
      },
      {
        kind: 'model', eyebrow: '03 / 认识 Jev', title: '给软件一个判断力。',
        lead: 'Jev 接收上下文和明确的问题，返回程序可直接使用的结构化判断。',
        primitives: [['Choice', '从给定选项中选一条路'], ['Score', '按标准衡量一个维度'], ['Noul', '判断命题为真的概率']],
        foot: 'confidence 不是正确率；阈值要按具体场景测试。',
      },
      {
        kind: 'example', eyebrow: '04 / 一个最小案例', title: '从工单，到下一步。',
        quote: '“这笔订单扣了两次钱，能帮我查一下吗？”',
        flow: [['INPUT', '用户提交工单'], ['JEV / CHOICE', '选出 billing'], ['ACTION', '转交账单支持']],
        foot: '如果信息不足或判断不确定，先交给人工确认。示例为预设教学数据，未调用 Jev。',
      },
      {
        kind: 'tracks', eyebrow: '05 / 选一个切口', title: '从小问题开始。',
        tracks: [['01', '聪明的分流器', '让消息、工单或任务去到正确的人或模型。'], ['02', 'Agent 的下一步', '决定继续、补充信息，还是交给人。'], ['03', '会判断的工作流', '筛选内容、整理反馈、排列优先级。']],
        foot: '也欢迎符合主题的自由命题。',
      },
      {
        kind: 'deliver', eyebrow: '06 / 建议交付', title: '演示一个\n完整的判断链路。',
        items: [['01', '可操作 Demo'], ['02', '至少一次真实 Jev 调用'], ['03', '约 10 条自建测试样例'], ['04', '不确定或失败时的回退']],
        foot: '可以使用已有项目和 AI 编程工具；演示时说明活动期间完成的部分。',
      },
      {
        kind: 'timeline', eyebrow: '07 / 当天节奏', title: '一天，做出来。',
        timeline: [['10:00', '签到与开场'], ['10:30', '最小示例 / 组队选题'], ['11:00', '开发开始'], ['17:00', '提交作品'], ['17:30', '现场演示'], ['19:35', '反馈与交流']],
        foot: '午餐与休息穿插进行。',
      },
      {
        kind: 'showcase', eyebrow: '08 / 演示与评审建议', title: '让别人看见\n你的判断。',
        lead: '每队建议 5 分钟展示 + 2 分钟提问。',
        scores: [['30', '问题与产品完整度'], ['25', 'Jev 使用是否恰当'], ['25', '测试与回退'], ['20', '演示表达']],
        foot: '评审维度与展示时长为提案建议，现场安排以主办方通知为准。',
      },
      {
        kind: 'closing', eyebrow: 'JEV HACKATHON / 002', title: '现在，开始构建。',
        lead: '带上一个真实问题，做出能体验的作品。',
        detail: '09.27  ·  10:00–20:00', secondary: '云谷中心 B2-3F 活动区  ·  名额与费用待公布',
        action: '查看活动与报名', foot: '具体到场安排以主办方通知为准。',
      },
    ],
  },
  en: {
    back: 'Back to event', previous: 'Previous slide', next: 'Next slide', fullscreen: 'Present fullscreen', exitFullscreen: 'Exit fullscreen',
    navigationHint: 'Arrow keys / Space to advance', page: 'Slide', posterDetails: 'Poster details', draft: 'Proposed schedule. Follow organizer updates for final details.',
    slides: [
      {
        kind: 'cover', eyebrow: 'CLOUD VALLEY 404 / EDITION 02 / JEV SYSTEM ONE', title: 'JEV\nHACKATHON',
        lead: 'Give AI a next move.', detail: 'SEP 27  ·  10:00–20:00', secondary: 'Cloud Valley Center · B2-3F event area',
      },
      {
        kind: 'partners', eyebrow: '01 / EVENT PARTNERS', title: 'Organizer and proposed partners',
        organizerLabel: 'ORGANIZER', organizer: 'CLOUD VALLEY 404', coorganizerLabel: 'PROPOSED PARTNERS · UNCONFIRMED',
        coorganizers: ['AI Builder Lab', 'Hackers and Painters', 'YOUR SPACE', 'ModelScope'],
        foot: 'Partnerships are subject to the organizer’s final announcement.',
      },
      {
        kind: 'mission', eyebrow: '02 / TODAY’S MISSION', title: 'Turn one judgment\ninto a working product.',
        lead: 'Pick a real situation. Let Jev make a focused judgment, then let your code act on it.',
        stages: [['INPUT', 'A real problem and context'], ['JUDGMENT', 'One focused Jev question'], ['ACTION', 'Your product takes the next step']],
        foot: 'Plan a fallback for missing information, uncertainty, or API failure.',
      },
      {
        kind: 'model', eyebrow: '03 / MEET JEV', title: 'Give software judgment.',
        lead: 'Jev takes context and focused questions, then returns structured decisions your code can use.',
        primitives: [['Choice', 'Pick from defined options'], ['Score', 'Measure one dimension'], ['Noul', 'Estimate whether a statement is true']],
        foot: 'Confidence is not accuracy. Test thresholds for the risks in your use case.',
      },
      {
        kind: 'example', eyebrow: '04 / A SMALL EXAMPLE', title: 'From ticket to action.',
        quote: '“I was charged twice for this order. Can you check?”',
        flow: [['INPUT', 'Customer submits a ticket'], ['JEV / CHOICE', 'Selects billing'], ['ACTION', 'Route to billing support']],
        foot: 'If the information is thin or the decision uncertain, ask a person to confirm. Preset illustration; no Jev call.',
      },
      {
        kind: 'tracks', eyebrow: '05 / CHOOSE A DIRECTION', title: 'Start with a small problem.',
        tracks: [['01', 'Smarter routing', 'Send messages, tickets, or tasks to the right person or model.'], ['02', 'An agent’s next move', 'Decide whether to continue, ask for context, or involve a person.'], ['03', 'Judgment in a workflow', 'Filter content, organize feedback, and rank priorities.']],
        foot: 'Bring your own idea if it fits the theme.',
      },
      {
        kind: 'deliver', eyebrow: '06 / SUGGESTED DELIVERABLE', title: 'Show the full\ndecision path.',
        items: [['01', 'A working demo'], ['02', 'At least one real Jev call'], ['03', 'About 10 test examples of your own'], ['04', 'A fallback for uncertainty or failure']],
        foot: 'Existing projects and AI coding tools are welcome. Explain what you built during the event.',
      },
      {
        kind: 'timeline', eyebrow: '07 / THE DAY', title: 'One day to build.',
        timeline: [['10:00', 'Check-in and opening'], ['10:30', 'Minimal example / form teams'], ['11:00', 'Build starts'], ['17:00', 'Submit projects'], ['17:30', 'Live demos'], ['19:35', 'Feedback and conversation']],
        foot: 'Lunch and breaks fit around the build sessions.',
      },
      {
        kind: 'showcase', eyebrow: '08 / PROPOSED SHOWCASE & SCORING', title: 'Make your judgment\nvisible.',
        lead: 'Suggested format: 5 minutes to demo + 2 minutes for questions per team.',
        scores: [['30', 'Problem and product completeness'], ['25', 'Appropriate use of Jev'], ['25', 'Testing and fallback'], ['20', 'Demo and explanation']],
        foot: 'Timing and criteria are proposals. Follow organizer updates for the final format.',
      },
      {
        kind: 'closing', eyebrow: 'JEV HACKATHON / 002', title: 'Now, start building.',
        lead: 'Bring a real problem. Make something people can try.',
        detail: 'SEP 27  ·  10:00–20:00', secondary: 'Yungu Center · B2-3F event area · capacity and fee to be announced',
        action: 'View event and apply', foot: 'Follow organizer updates for final attendance details.',
      },
    ],
  },
};
