import "../src/style.css";
import "../src/guide.css";
import "../src/tv-effects.css";
import "../src/preferences.css";
import "../src/tier-list.css";
import "../src/television.css";
import { PreferencesProvider } from "../components/preferences";

export const metadata = {
  metadataBase: new URL("https://cv404.tv"),
  description: "云谷404，杭州云谷的 AI Builder 作品发布场。让好想法，不再404。",
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "云谷404 · 好想法，正在放映",
    description: "把作品做出来、讲清楚、发出去。",
    url: "https://cv404.tv",
    type: "website",
  },
};
export const viewport = { themeColor: "#22272a" };
const themeScript = `try{var p=localStorage.getItem('cv404-theme');var t=p==='light'||p==='dark'?p:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
