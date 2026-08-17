/**
 * lib/nav.ts —— 文档站导航的单一数据源（顶栏 docs-topnav 与侧栏 docs-sidenav__nav 同源渲染）。
 *
 * 每个 section 携带：
 * - key：chrome.nav 中的键，顶栏标签与侧栏分组标题共用同一份文案；
 * - to：该栏目入口路由（顶栏跳转目标；components 取 COMPONENT_ORDER 首项，避免写死 slug）；
 * - match：激活态匹配前缀；
 * - children：侧栏分组内的子条目；缺省时该栏目在侧栏渲染为独立链接（如 playground 单条目），
 *   components 由 COMPONENT_ORDER 动态展开，不在此列。
 * docKey 指向 docs 域页面标题，避免与侧栏散项文案重复。
 */

import { COMPONENT_ORDER } from "./components.js";

export type NavSectionKey = "docs" | "components" | "playground";

export interface NavChild {
  to: string;
  /** 存在时复用 docs.<docKey>.title，否则用栏目标签（如 playground 单条目）。 */
  docKey?: "introduction" | "installation";
}

export interface NavSection {
  key: NavSectionKey;
  to: string;
  match: string;
  children?: NavChild[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    key: "docs",
    to: "/docs/introduction",
    match: "/docs",
    children: [
      { to: "/docs/introduction", docKey: "introduction" },
      { to: "/docs/installation", docKey: "installation" },
    ],
  },
  {
    key: "components",
    to: `/components/${COMPONENT_ORDER[0] ?? "thread"}`,
    match: "/components",
  },
  {
    key: "playground",
    to: "/playground",
    match: "/playground",
    /* 单条目栏目：无 children，侧栏渲染为独立链接（不重复渲染分组标题 + 同名子项）。 */
  },
];
