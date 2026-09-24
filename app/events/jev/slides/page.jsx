import JevSlides from '../../../../components/jev-slides';
import './slides.css';

export const metadata = {
  title: 'Jev 黑客松 · 现场演示 · 云谷404',
  description: '云谷404第二期 Jev 黑客松在线演示文稿。',
  alternates: { canonical: '/events/jev/slides' },
};

export default function Page() { return <JevSlides />; }
