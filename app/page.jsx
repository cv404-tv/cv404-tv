import SignalGame from "../components/signal-game";

export const metadata = {
  title: "404 信号搜寻 · 云谷404",
  description: "40.4 秒，三个失联频道。转动旋钮，从噪声里找到一个好故事。来玩云谷404的调频小游戏，生成你的信号捕获卡。",
  alternates: { canonical: "/" },
  openGraph: { title: "404 信号搜寻 · 云谷404", description: "从噪声里，找到一个好故事。40.4 秒，等你来挑战。", url: "https://cv404.tv/" },
};

export default function HomePage() {
  return <SignalGame />;
}
