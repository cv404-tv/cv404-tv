// Add future activities here. The listing groups them by state while each
// activity keeps its own detail page for its full story and registration.
export const eventCatalog = [
  {
    id: "jev",
    href: "/events/jev",
    edition: "02",
    state: "upcoming",
    art: { type: "poster", src: "/assets/jev-poster.png" },
    zh: {
      status: "报名意向征集中",
      category: "JEV / 黑客松",
      title: "让 AI 做出下一步决定",
      description: "用 Jev 串起输入、判断与动作，做出能演示的作品。免费报名、限 30 名，比赛提供模型使用额度。",
      date: "2026.09.27 · 10:00–20:00",
      place: "云谷中心 B2-3F",
      cta: "了解活动并报名",
    },
    en: {
      status: "Expressions of interest open",
      category: "JEV / HACKATHON",
      title: "Give AI a next move",
      description: "Build a working input → judgment → action flow with Jev. Registration is free, limited to 30 people, with model usage credits provided for the event.",
      date: "Sep 27, 2026 · 10:00–20:00",
      place: "Yungu Center · B2-3F",
      cta: "Explore and apply",
    },
  },
  {
    id: "xhs-xgj",
    href: "/events/xhs-xgj",
    edition: "01",
    state: "past",
    art: { type: "poster", src: "/assets/event-poster.png" },
    zh: {
      status: "往期活动",
      category: "小红书小工具 / 迷你黑客松",
      title: "让你的作品被看见",
      description: "一个下午，现场开发、演示和投票。回看第一期活动与演示 PPT。",
      date: "2026.08.29",
      place: "云谷中心 3F",
      cta: "查看活动回顾",
    },
    en: {
      status: "Past event",
      category: "XIAOHONGSHU MINI-TOOL / HACKATHON",
      title: "Let your work be seen",
      description: "An afternoon of building, demos and voting. Revisit the first edition and its presentation.",
      date: "Aug 29, 2026",
      place: "Yungu Center · 3F",
      cta: "Revisit the event",
    },
  },
];

export const eventsCopy = {
  zh: {
    label: "云谷404 / 线下活动",
    title: "活动",
    intro: "把想法带到现场，和人一起做出来。正在筹备与往期活动，都从这里进入。",
    upcoming: "正在筹备",
    past: "往期活动",
    count: "场活动",
    empty: "新活动正在筹备中。",
  },
  en: {
    label: "CLOUD VALLEY 404 / IN PERSON",
    title: "Events",
    intro: "Bring an idea, meet people, and make something real. Explore upcoming activities and past editions here.",
    upcoming: "Coming up",
    past: "Past events",
    count: "events",
    empty: "The next event is taking shape.",
  },
};
