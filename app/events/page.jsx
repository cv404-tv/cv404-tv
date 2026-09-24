import EventsList from "../../components/events-list";

export const metadata = {
  title: "活动 · 云谷404",
  description: "查看云谷404正在筹备与往期的线下活动：第二期 Jev 黑客松报名、第一期迷你黑客松回顾。",
  alternates: { canonical: "/events" },
  openGraph: {
    title: "活动 · 云谷404",
    description: "在云谷404，和动手的人一起把想法做出来。",
    url: "https://cv404.tv/events",
  },
};

export default function EventsPage() {
  return <EventsList />;
}
