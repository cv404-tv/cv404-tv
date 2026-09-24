import Hackathon from '../../../components/hackathon';
export const metadata = {
  title: 'Jev 黑客松 · 第二期 · 云谷404',
  description: '云谷404第二期 Jev 黑客松，9 月 27 日 10:00–20:00 于云谷中心 B2-3F 举行。免费报名、限 30 名。',
  alternates: { canonical: '/events/jev' },
  openGraph: { title: '让 AI 做出下一步决定 · 云谷404第二期黑客松', description: '9 月 27 日在云谷中心 B2-3F，免费报名、限 30 名。', url: 'https://cv404.tv/events/jev', images: ['/assets/jev-poster.png'] },
};
export default function Page() { return <Hackathon />; }
