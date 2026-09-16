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
  const [locale, updateLocale] = useState("zh");
  const [theme, updateTheme] = useState("dark");
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    updateLocale(read("cv404-language") === "en" ? "en" : "zh");
    const media = matchMedia("(prefers-color-scheme: dark)");
    const stored = read("cv404-theme");
    updateTheme(
      ["dark", "light"].includes(stored)
        ? stored
        : media.matches
          ? "dark"
          : "light",
    );
    setReady(true);
    const follow = () => {
      if (!read("cv404-theme")) updateTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
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
    document.title = pathname.startsWith("/tier")
      ? locale === "zh" ? "锐评小工具 · 云谷404" : "Hot Take Tool · Cloud Valley 404"
      : pathname.startsWith("/guide")
        ? copy[locale].guideTitle
        : copy[locale].title;
  }, [locale, pathname]);
  const setLocale = (value) => {
    save("cv404-language", value);
    updateLocale(value);
  };
  const setTheme = (value) => {
    save("cv404-theme", value);
    updateTheme(value);
  };
  return (
    <Preferences.Provider
      value={{ locale, theme, setLocale, setTheme, t: copy[locale] }}
    >
      {children}
    </Preferences.Provider>
  );
}
export function usePreferences() {
  return useContext(Preferences);
}

export function PreferenceControls() {
  const { locale, theme, setLocale, setTheme, t } = usePreferences();
  return (
    <div
      className="preference-controls glass"
      role="group"
      aria-label={t.preferences}
    >
      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={theme === "dark" ? t.light : t.dark}
        title={theme === "dark" ? t.light : t.dark}
      >
        {theme === "dark" ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M20 14A8 8 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="language-button"
        onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
        aria-label={locale === "zh" ? "Switch to English" : "切换到中文"}
        lang={locale === "zh" ? "en" : "zh-CN"}
      >
        {locale === "zh" ? "EN" : "中"}
      </button>
    </div>
  );
}
