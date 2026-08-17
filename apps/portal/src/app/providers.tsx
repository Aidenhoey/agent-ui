/**
 * app/providers.tsx —— 文档站壳 Provider 组合（中性组件文档站版）。
 *
 * 只保留站点级全局态：theme（light/dark/system → :root[data-theme] 驱动
 * tokens.css 的 light-dark()，.dark 类供 tailwind dark: 变体）与 locale
 * （en-US/zh-CN），均持久化 localStorage。portal 业务态（会话 / sessions /
 * runtime registry / currentUser 等）已随展示站壳层重构全部移除。
 *
 * Provider 嵌套（固定）：LocaleProvider（库，最外层，保证所有消费者拿到 dict）→
 * AppStateContext → TooltipProvider（库）。
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { LocaleProvider, TooltipProvider, type LocaleCode } from "@diribo/agent-ui";

export type ThemePreference = "light" | "dark" | "system";

export interface AppStateValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

const THEME_STORAGE_KEY = "agent-ui-theme";
const LOCALE_STORAGE_KEY = "agent-ui-locale";

function readTheme(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function readLocale(): LocaleCode {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored === "en-US" || stored === "zh-CN" ? stored : "zh-CN";
}

export function AppProviders({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<ThemePreference>(readTheme);
  const [locale, setLocale] = useState<LocaleCode>(readLocale);

  // 主题：:root[data-theme] 驱动 tokens.css 的 light-dark()；.dark 类供 tailwind dark: 变体。
  useEffect(() => {
    const systemTheme = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
    const applyResolvedTheme = () => {
      const isDark = theme === "dark" || (theme === "system" && systemTheme?.matches === true);
      document.documentElement.classList.toggle("dark", isDark);
    };

    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.dataset.theme = theme;
    }
    applyResolvedTheme();
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    if (theme !== "system" || !systemTheme) return;
    systemTheme.addEventListener("change", applyResolvedTheme);
    return () => systemTheme.removeEventListener("change", applyResolvedTheme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<AppStateValue>(
    () => ({ theme, setTheme, locale, setLocale }),
    [theme, locale],
  );

  return (
    <LocaleProvider locale={locale}>
      <AppStateContext.Provider value={value}>
        <TooltipProvider delayDuration={450}>{children}</TooltipProvider>
      </AppStateContext.Provider>
    </LocaleProvider>
  );
}

export function useAppState(): AppStateValue {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used inside AppProviders");
  return context;
}
