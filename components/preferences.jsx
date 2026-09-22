"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { copy } from "../lib/copy";

const Preferences = createContext(null);
function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function PreferencesProvider({ children }) {
  const [languagePreference, updateLanguagePreference] = useState("system");
  const [themePreference, updateThemePreference] = useState("system");
  const [systemLocale, updateSystemLocale] = useState("zh");
  const [systemTheme, updateSystemTheme] = useState("dark");
  const [ready, setReady] = useState(false);
  const locale = languagePreference === "system" ? systemLocale : languagePreference;
  const theme = themePreference === "system" ? systemTheme : themePreference;
  const pathname = usePathname();
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const followTheme = () => updateSystemTheme(media.matches ? "dark" : "light");
    const followLanguage = () => {
      const supported = (navigator.languages?.length ? navigator.languages : [navigator.language])
        .map(value => value.toLowerCase().split("-")[0]).find(value => value === "zh" || value === "en");
      updateSystemLocale(supported || "en");
    };
    const syncStored = () => {
      const language = read("cv404-language");
      const theme = read("cv404-theme");
      updateLanguagePreference(["zh", "en"].includes(language) ? language : "system");
      updateThemePreference(["light", "dark"].includes(theme) ? theme : "system");
    };
    const onStorage = event => {
      if (!event.key || ["cv404-language", "cv404-theme"].includes(event.key)) syncStored();
    };
    syncStored(); followTheme(); followLanguage(); setReady(true);
    media.addEventListener("change", followTheme);
    window.addEventListener("languagechange", followLanguage);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", followTheme);
      window.removeEventListener("languagechange", followLanguage);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#22272a" : "#f2ebdd");
  }, [theme, ready]);
  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.title = pathname === "/" || pathname.startsWith("/signal")
      ? locale === "zh" ? "404 信号搜寻 · 云谷404" : "404 Signal Search · Cloud Valley 404"
      : pathname.startsWith("/events/jev")
        ? (locale === "zh" ? "Jev 黑客松 · 第二期 · 云谷404" : "Jev Hackathon · Edition 02 · Cloud Valley 404")
      : pathname.startsWith("/events")
        ? locale === "zh" ? "黑客松活动 · 云谷404" : "Hackathon Events · Cloud Valley 404"
      : pathname.startsWith("/tokens")
        ? locale === "zh" ? "免费 Token 申请 · 云谷404" : "Free Tokens · Cloud Valley 404"
      : pathname.startsWith("/account")
        ? (locale === "zh" ? "个人中心 · 云谷404" : "Your account · Cloud Valley 404")
      : pathname.startsWith("/admin")
        ? locale === "zh" ? "管理后台 · 云谷404" : "Admin · Cloud Valley 404"
      : pathname.startsWith("/tier")
      ? locale === "zh" ? "锐评小工具 · 云谷404" : "Hot Take Tool · Cloud Valley 404"
      : pathname.startsWith("/privacy")
        ? "隐私政策 · Privacy Policy"
      : pathname.startsWith("/guide")
        ? copy[locale].guideTitle
        : copy[locale].title;
  }, [locale, pathname]);
  const setLocale = (value) => {
    if (!["system", "zh", "en"].includes(value)) return;
    save("cv404-language", value);
    updateLanguagePreference(value);
  };
  const setTheme = (value) => {
    if (!["system", "light", "dark"].includes(value)) return;
    save("cv404-theme", value);
    updateThemePreference(value);
  };
  return (
    <Preferences.Provider
      value={{ locale, theme, languagePreference, themePreference, ready, setLocale, setTheme, t: copy[locale] }}
    >
      {children}
    </Preferences.Provider>
  );
}
export function usePreferences() {
  return useContext(Preferences);
}

export function PreferenceSettings() {
  const { locale, languagePreference, themePreference, ready, setLocale, setTheme } = usePreferences();
  const t = locale === "zh" ? {
    title: "个人设置", hint: "默认跟随系统，修改后立即生效，并保存在当前浏览器。",
    language: "语言", languageHint: "跟随浏览器的语言偏好，支持中文和英文。",
    theme: "主题", themeHint: "跟随系统的日间或夜间外观。",
    system: "跟随系统", light: "日间模式", dark: "夜间模式",
  } : {
    title: "Personal settings", hint: "Follows your system by default. Changes apply immediately and are saved in this browser.",
    language: "Language", languageHint: "Uses your browser’s language preferences. Supports Chinese and English.",
    theme: "Theme", themeHint: "Matches your system’s light or dark appearance.",
    system: "Follow system", light: "Light", dark: "Dark",
  };
  return <section className="token-panel account-settings" id="settings" aria-labelledby="settings-title">
    <h2 id="settings-title">{t.title}</h2><p className="token-hint">{t.hint}</p>
    <div className="account-setting-row">
      <div><label htmlFor="account-language">{t.language}</label><p id="account-language-hint" className="token-hint">{t.languageHint}</p></div>
      <select id="account-language" aria-describedby="account-language-hint" disabled={!ready} value={languagePreference} onChange={event => setLocale(event.target.value)}>
        <option value="system">{t.system}</option><option value="zh" lang="zh-CN">中文</option><option value="en" lang="en">English</option>
      </select>
    </div>
    <div className="account-setting-row">
      <div><label htmlFor="account-theme">{t.theme}</label><p id="account-theme-hint" className="token-hint">{t.themeHint}</p></div>
      <select id="account-theme" aria-describedby="account-theme-hint" disabled={!ready} value={themePreference} onChange={event => setTheme(event.target.value)}>
        <option value="system">{t.system}</option><option value="light">{t.light}</option><option value="dark">{t.dark}</option>
      </select>
    </div>
  </section>;
}
