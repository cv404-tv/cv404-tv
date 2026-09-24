import FirstHackathon from "../../../components/first-hackathon";

export const metadata = {
  title: "第一期迷你黑客松 · 云谷404",
  description: "回看云谷404第一期迷你黑客松：现场开发小红书小工具、演示作品、投票交流。",
  alternates: { canonical: "/events/xhs-xgj" },
  openGraph: {
    title: "第一期迷你黑客松 · 云谷404",
    description: "把网页做出来、讲清楚、发出去。",
    url: "https://cv404.tv/events/xhs-xgj",
    images: ["/assets/event-poster.png"],
  },
};

export default function FirstHackathonPage() {
  return <FirstHackathon />;
}
