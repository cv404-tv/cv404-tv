import TokenRequests from '../../components/token-requests';
export const metadata = {
  title: '免费 Token 申请 · 云谷404',
  description: '为你的 AI 项目申请免费 Token，查看审批进度并领取 API Key。',
  alternates: { canonical: '/tokens' },
};
export default function TokensPage() { return <TokenRequests />; }
