import Account from '../../components/account';
export const metadata = {
  title: '个人中心 · 云谷404',
  robots: { index: false, follow: false },
  alternates: { canonical: '/account' },
};
export default function AccountPage() { return <Account />; }
