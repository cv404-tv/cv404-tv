import Television from "../../components/television";

export const metadata = {
  title: "黑客松活动 · 云谷404",
  description: "云谷404迷你黑客松：一个下午，从想法到现场演示。回顾第一期活动，查看创作指南，一起把好想法做出来。",
  alternates: { canonical: "/events" },
  openGraph: {
    title: "黑客松活动 · 云谷404",
    description: "一个下午，让想法开始运行。云谷404迷你黑客松活动与创作指南。",
    url: "https://cv404.tv/events",
  },
};

export default function EventsPage() {
  return <Television />;
}
