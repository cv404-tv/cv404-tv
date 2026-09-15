import TierList from "../../components/tier-list";
import { Suspense } from "react";

export const metadata = {
  title: "锐评小工具 · 云谷404",
  description: "你的标准，你来排。用文字和 Logo 做贴纸，拖到从夯到拉的白板，免登录分享你的排名。",
  alternates: { canonical: "/tier-list" },
  openGraph: { title: "锐评小工具 · 云谷404", description: "从夯到拉，做贴纸、排个名，分享你的锐评。", url: "https://cv404.tv/tier-list" },
};

export default function TierListPage() {
  return <Suspense fallback={<main className="tier-loading" role="status">正在打开白板… / Loading…</main>}><TierList /></Suspense>;
}
