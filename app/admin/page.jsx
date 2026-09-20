import Admin from '../../components/admin';
export const metadata = {
  title: '管理后台 · 云谷404',
  robots: { index: false, follow: false },
  alternates: { canonical: '/admin' },
};
export default function AdminPage() { return <Admin />; }
