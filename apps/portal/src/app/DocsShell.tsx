/**
 * app/DocsShell.tsx —— 中性组件文档站外壳（agent-elements.21st.dev / shadcn docs 范式）。
 *
 * 结构：sticky 顶栏（文字标 + 区段导航 + 主题 / 语言切换）＋ 桌面常驻左侧分组导航
 * （移动端经顶栏菜单按钮折叠开合，路由切换自动收起）＋ 限宽居中的内容区（Outlet）。
 * 外壳占满视口高度且不随文档滚动：侧导航与内容区（.docs-content）各自独立滚动，
 * 内容区滚动窗口在路由切换时复位到顶部。
 * 全部文案走库字典（site / components 域），样式为 index.css 末尾的 docs-* layer。
 */

import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import {
  ToggleGroup,
  ToggleGroupItem,
  useLocale,
  type LocaleCode,
} from "@diribo/agent-ui";

import { COMPONENT_ORDER } from "../lib/components.js";
import { Menu, Monitor, Moon, Sun, X } from "../lib/icons.js";
import { useAppState, type ThemePreference } from "./providers.js";

/** 顶栏右侧：三档主题切换（light / dark / system）。 */
function ThemeToggle() {
  const { theme, setTheme } = useAppState();
  const t = useLocale().dict.site.chrome;
  const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
    { value: "light", label: t.themeLight, icon: Sun },
    { value: "dark", label: t.themeDark, icon: Moon },
    { value: "system", label: t.themeSystem, icon: Monitor },
  ];
  return (
    <ToggleGroup
      type="single"
      value={theme}
      variant="outline"
      size="sm"
      className="docs-toggle"
      aria-label={t.themeSelectAria}
      onValueChange={(value) => value && setTheme(value as ThemePreference)}
    >
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>
            <Icon aria-hidden="true" />
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}

/** 顶栏右侧：语言切换（EN / 中）。 */
function LocaleToggle() {
  const { locale, setLocale } = useAppState();
  const t = useLocale().dict.site.chrome;
  const options: Array<{ value: LocaleCode; short: string; label: string }> = [
    { value: "en-US", short: "EN", label: t.localeEnglish },
    { value: "zh-CN", short: "中", label: t.localeChinese },
  ];
  return (
    <ToggleGroup
      type="single"
      value={locale}
      variant="outline"
      size="sm"
      className="docs-toggle"
      aria-label={t.localeSelectAria}
      onValueChange={(value) => value && setLocale(value as LocaleCode)}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>
          <span aria-hidden="true">{option.short}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function DocsShell() {
  const { dict } = useLocale();
  const t = dict.site;
  const location = useLocation();
  const [sidenavOpen, setSidenavOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  // 路由切换后收起移动端侧导航，并把内容滚动窗口复位到顶部。
  useEffect(() => {
    setSidenavOpen(false);
    contentRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  /** 顶栏区段高亮按路径前缀判定（NavLink 的 isActive 盖不住 /docs/* 整段）。 */
  const sections = [
    { to: "/docs/introduction", label: t.chrome.nav.docs, active: location.pathname.startsWith("/docs") },
    { to: "/components/thread", label: t.chrome.nav.components, active: location.pathname.startsWith("/components") },
    { to: "/playground", label: t.chrome.nav.playground, active: location.pathname.startsWith("/playground") },
  ];

  return (
    <div className="docs-shell">
      <a className="skip-link" href="#main-content">
        {dict.appCommon.skipLink}
      </a>
      <header className="docs-topbar">
        <div className="docs-topbar__inner">
          <button
            type="button"
            className="docs-menu-button"
            aria-label={t.chrome.menuToggleAria}
            aria-expanded={sidenavOpen}
            onClick={() => setSidenavOpen((open) => !open)}
          >
            {sidenavOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
          <Link className="docs-brand" to="/">
            <span className="docs-brand__mark" aria-hidden="true">◆</span>
            {t.chrome.siteName}
          </Link>
          <nav className="docs-topnav">
            {sections.map((section) => (
              <Link
                key={section.to}
                to={section.to}
                className={section.active ? "docs-topnav__link docs-topnav__link--active" : "docs-topnav__link"}
              >
                {section.label}
              </Link>
            ))}
          </nav>
          <div className="docs-topbar__controls">
            <ThemeToggle />
            <LocaleToggle />
          </div>
        </div>
      </header>

      <div className="docs-body">
        <aside className={sidenavOpen ? "docs-sidenav docs-sidenav--open" : "docs-sidenav"}>
          <nav className="docs-sidenav__nav" aria-label={t.chrome.sidenavAria}>
            <div className="docs-sidenav__group">
              <p className="docs-sidenav__group-title">{t.sidenav.groups.gettingStarted}</p>
              <NavLink to="/docs/introduction" className="docs-sidenav__link">
                {t.sidenav.items.introduction}
              </NavLink>
              <NavLink to="/docs/installation" className="docs-sidenav__link">
                {t.sidenav.items.installation}
              </NavLink>
            </div>
            <div className="docs-sidenav__group">
              <p className="docs-sidenav__group-title">{t.sidenav.groups.components}</p>
              {COMPONENT_ORDER.map((slug) => (
                <NavLink key={slug} to={`/components/${slug}`} className="docs-sidenav__link">
                  {dict.components.components[slug].title}
                </NavLink>
              ))}
            </div>
            <div className="docs-sidenav__group">
              <p className="docs-sidenav__group-title">{t.sidenav.groups.playground}</p>
              <NavLink to="/playground" className="docs-sidenav__link">
                {t.sidenav.items.playground}
              </NavLink>
            </div>
          </nav>
        </aside>
        <main className="docs-content" id="main-content" ref={contentRef}>
          <div className="docs-content__inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
