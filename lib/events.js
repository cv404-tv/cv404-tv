// Add future activities here. The listing groups them by state while each
// activity keeps its own detail page for its full story and registration.
export const eventCatalog = [
  {
    id: "jev",
    href: "/events/jev",
    edition: "02",
    state: "upcoming",
    art: { type: "wordmark", text: "Jev." },
    zh: {
      status: "报名意向征集中",
      category: "JEV / 黑客松",
      title: "让 AI 做出下一步决定",
      description: "带着一个真实场景里的问题来，把判断做成可以运行的产品。活动安排待公布，报名意向已开放。",
      date: "日期待公布",
      place: "地点待公布",
      cta: "了解活动并报名",
    },
    en: {
      status: "Expressions of interest open",
      category: "JEV / HACKATHON",
      title: "Give AI a next move",
      description: "Bring a real-world problem and build a product that can make a useful judgment. Details are forthcoming; applications are open.",
      date: "Date to be announced",
      place: "Venue to be announced",
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
