/**
 * app/router.tsx —— 路由表（createBrowserRouter）。
 *
 * 中性组件文档站：DocsShell 为壳，landing / docs 两页 / 数据驱动组件页 /
 * playground / 404 兜底（文案走字典 site.notFound 域）。
 * 旧 portal 路由（/history、/conversations/*、portal 首页、/showcase）已移除。
 */

import { createBrowserRouter, Link, type RouteObject } from "react-router-dom";

import { useDemoLocale } from "@aidenhoey/agent-ui/mock";

import { ComponentPage } from "../pages/components/ComponentPage.js";
import { InstallationPage } from "../pages/docs/InstallationPage.js";
import { IntroductionPage } from "../pages/docs/IntroductionPage.js";
import { LandingPage } from "../pages/landing/LandingPage.js";
import { PlaygroundPage } from "../pages/playground/PlaygroundPage.js";
import { DocsShell } from "./DocsShell.js";

function NotFoundPage() {
  const { dict } = useDemoLocale();
  const copy = dict.site.notFound;

  return (
    <section className="docs-page" aria-labelledby="not-found-title">
      <span className="empty-state__code">{copy.code}</span>
      <h1 id="not-found-title">{copy.title}</h1>
      <p className="docs-page__desc">{copy.description}</p>
      <p className="docs-page__desc">
        <Link to="/">{copy.backHome}</Link>
      </p>
    </section>
  );
}

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <DocsShell />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "docs/introduction", element: <IntroductionPage /> },
      { path: "docs/installation", element: <InstallationPage /> },
      { path: "components/:slug", element: <ComponentPage /> },
      { path: "playground", element: <PlaygroundPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(appRoutes);
