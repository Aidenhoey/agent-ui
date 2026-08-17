/**
 * app/DocsShell.tsx —— 中性组件文档站外壳（agent-elements.21st.dev / shadcn docs 范式）。
 *
 * 结构：sticky 顶栏（文字标 + 主题 / 语言切换）＋ 桌面常驻左侧分组导航
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
  type LocaleCode,
} from "@aidenhoey/agent-ui";
import { useDemoLocale } from "@aidenhoey/agent-ui/mock";

import { COMPONENT_ORDER } from "../lib/components.js";
import { NAV_SECTIONS } from "../lib/nav.js";
import { Menu, Moon, Sun, X } from "../lib/icons.js";
import { useAppState, type ThemePreference } from "./providers.js";

/** 顶栏右侧：三档主题切换（light / dark / system）。 */
function ThemeToggle() {
  const { theme, setTheme } = useAppState();
  const t = useDemoLocale().dict.site.chrome;
  const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
    { value: "light", label: t.themeLight, icon: Sun },
    { value: "dark", label: t.themeDark, icon: Moon },
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
  const t = useDemoLocale().dict.site.chrome;
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
  const { dict } = useDemoLocale();
  const t = dict.site;
  const location = useLocation();
  const [sidenavOpen, setSidenavOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  // 路由切换后收起移动端侧导航，并把内容滚动窗口复位到顶部。
  useEffect(() => {
    setSidenavOpen(false);
    contentRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

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
          <div className="docs-topbar__controls">
            <ThemeToggle />
            <span className="docs-topbar__ctrl-sep" aria-hidden="true" />
            <LocaleToggle />
          </div>
        </div>
      </header>

      <div className="docs-body">
        <aside className={sidenavOpen ? "docs-sidenav docs-sidenav--open" : "docs-sidenav"}>
          <nav className="docs-sidenav__nav" aria-label={t.chrome.sidenavAria}>
            {NAV_SECTIONS.map((section) => (
              <div className="docs-sidenav__group" key={section.key}>
                {section.key === "components" ? (
                  <>
                    <p className="docs-sidenav__group-title">{t.chrome.nav[section.key]}</p>
                    {COMPONENT_ORDER.map((slug) => (
                      <NavLink key={slug} to={`/components/${slug}`} className="docs-sidenav__link">
                        {dict.components.components[slug].title}
                      </NavLink>
                    ))}
                  </>
                ) : section.children ? (
                  <>
                    <p className="docs-sidenav__group-title">{t.chrome.nav[section.key]}</p>
                    {section.children.map((child) => (
                      <NavLink key={child.to} to={child.to} className="docs-sidenav__link">
                        {child.docKey ? dict.site.docs[child.docKey].title : t.chrome.nav[section.key]}
                      </NavLink>
                    ))}
                  </>
                ) : (
                  /* 单条目栏目（playground）：独立链接，不再重复渲染同名分组标题。 */
                  <NavLink to={section.to} className="docs-sidenav__grouplink">
                    {t.chrome.nav[section.key]}
                  </NavLink>
                )}
              </div>
            ))}
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
