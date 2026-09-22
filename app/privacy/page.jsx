import { privacyPolicy as policy, privacySections } from "../../lib/privacy-policy";
import styles from "./privacy.module.css";

const description = "软件隐私政策：了解信息处理、设备权限、第三方服务、数据保存与删除，以及如何联系我们。";
export const metadata = {
  title: "隐私政策 · Privacy Policy",
  description,
  alternates: { canonical: "/privacy" },
  robots: { index: policy.confirmed, follow: true },
  openGraph: { title: "隐私政策 · Privacy Policy", description, url: "https://cv404.tv/privacy", type: "website" },
};

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#policy-zh">跳至正文 · Skip to policy</a>
      <main className={styles.main}>
        <header className={styles.hero} lang="zh-CN">
          <h1>隐私政策<span lang="en">Privacy Policy</span></h1>
        </header>
          <div className={styles.document}>
            {["zh", "en"].map(language => {
              const zh = language === "zh";
              return (
                <article id={`policy-${language}`} lang={zh ? "zh-CN" : "en"} key={language}>
                  <div className={styles.documentHeading}>
                    <h2>{zh ? "关于本政策" : "Privacy Policy"}</h2>
                    <span>{zh ? "简体中文" : "English"}</span>
                  </div>
                  {privacySections.map((section, index) => (
                    <section id={`${language}-${section.id}`} key={section.id} className={styles.section}>
                      <h3><span>{String(index + 1).padStart(2, "0")}</span>{zh ? section.zh : section.en}</h3>
                      {(zh ? section.chinese : section.english).map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                    </section>
                  ))}
                  <section id={`${language}-contact`} className={styles.section}>
                    <h3><span>09</span>{zh ? "联系我们" : "Contact us"}</h3>
                    <p>{zh ? "如对本政策有疑问，或希望行使个人信息相关权利，请通过下方邮箱联系我们，并注明应用名称及您的请求。" : "For questions about this policy or to exercise your privacy rights, contact us at the email below and include the App’s name and your request."}</p>
                    <dl className={styles.contact}>
                      <dt>{zh ? "联系邮箱" : "Email"}</dt><dd>{policy.email ? <a href={`mailto:${policy.email}`}>{policy.email}</a> : (zh ? "待提供" : "To be provided")}</dd>
                    </dl>
                  </section>
                </article>
              );
            })}
          </div>
      </main>
      <footer className={styles.footer}><span>APP PRIVACY · {policy.updated}</span><a href="#">回到顶部 ↑ / Back to top</a></footer>
    </div>
  );
}
