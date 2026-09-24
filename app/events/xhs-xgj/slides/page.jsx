import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import styles from "./page.module.css";

const assetPath = "/assets/xhs-xgj-slides/";

export const metadata = {
  title: "第一期比赛演示文稿 · 云谷404",
  description: "云谷404第一期迷你黑客松的现场演示文稿。",
  alternates: { canonical: "/events/xhs-xgj/slides" },
};

export default async function SlidesPage() {
  const deck = await readFile(
    join(process.cwd(), "public", "assets", "xhs-xgj-slides", "index.html"),
    "utf8",
  );
  // srcDoc keeps the presentation on this route and works with the site's
  // X-Frame-Options: DENY header. Asset URLs in the deck are site-absolute.

  return (
    <main className={styles.page}>
      <header className={styles.toolbar}>
        <Link href="/events/xhs-xgj" className={styles.back}>← 活动介绍</Link>
        <h1>第一期比赛 · 演示文稿</h1>
        <a
          href={`${assetPath}yungu404-first-hackathon.pptx`}
          download="云谷404迷你黑客松-第一期活动流程完整版.pptx"
          className={styles.download}
        >
          下载 PPTX ↗
        </a>
      </header>
      <iframe
        className={styles.presentation}
        title="云谷404第一期迷你黑客松演示文稿"
        srcDoc={deck}
        allowFullScreen
      />
    </main>
  );
}
