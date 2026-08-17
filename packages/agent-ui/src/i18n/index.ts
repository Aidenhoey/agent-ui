/**
 * i18n 字典组合层。
 *
 * 分域结构：dict/<domain>.ts 各自导出 `XxxDict` 接口 + enUS / zhCN 两份值。
 * 本文件只做整体聚合（不逐字段引用），因此后续移植 agent 增补任何域的字段
 * 都不需要改动这里 —— 改对应的域文件即可。
 */

import * as appCommon from "./dict/appCommon.js";
import * as blocks from "./dict/blocks.js";
import * as cards from "./dict/cards.js";
import * as common from "./dict/common.js";
import * as components from "./dict/components.js";
import * as composer from "./dict/composer.js";
import * as conversation from "./dict/conversation.js";
import * as history from "./dict/history.js";
import * as home from "./dict/home.js";
import * as playground from "./dict/playground.js";
import * as showcase from "./dict/showcase.js";
import * as sidebar from "./dict/sidebar.js";
import * as site from "./dict/site.js";
import * as thread from "./dict/thread.js";

export type { AppCommonDict } from "./dict/appCommon.js";
export type { BlocksDict } from "./dict/blocks.js";
export type { CardsDict } from "./dict/cards.js";
export type { CommonDict } from "./dict/common.js";
export type { ComponentEntryCopy, ComponentsDict, ComponentSlug } from "./dict/components.js";
export { COMPONENT_SLUGS } from "./dict/components.js";
export type { ComposerDict } from "./dict/composer.js";
export type { ConversationDict } from "./dict/conversation.js";
export type { HistoryDict } from "./dict/history.js";
export type { HomeDict } from "./dict/home.js";
export type { PlaygroundDict } from "./dict/playground.js";
export type { ShowcaseDict, ShowcaseSectionCopy } from "./dict/showcase.js";
export type { SidebarDict } from "./dict/sidebar.js";
export type { SiteDict } from "./dict/site.js";
export type { ThreadDict } from "./dict/thread.js";

export type LocaleCode = "en-US" | "zh-CN";

export interface LocaleDict {
  common: common.CommonDict;
  blocks: blocks.BlocksDict;
  cards: cards.CardsDict;
  thread: thread.ThreadDict;
  composer: composer.ComposerDict;
  sidebar: sidebar.SidebarDict;
  conversation: conversation.ConversationDict;
  history: history.HistoryDict;
  home: home.HomeDict;
  showcase: showcase.ShowcaseDict;
  appCommon: appCommon.AppCommonDict;
  site: site.SiteDict;
  components: components.ComponentsDict;
  playground: playground.PlaygroundDict;
}

export const dictionaries: Record<LocaleCode, LocaleDict> = {
  "en-US": {
    common: common.enUS,
    blocks: blocks.enUS,
    cards: cards.enUS,
    thread: thread.enUS,
    composer: composer.enUS,
    sidebar: sidebar.enUS,
    conversation: conversation.enUS,
    history: history.enUS,
    home: home.enUS,
    showcase: showcase.enUS,
    appCommon: appCommon.enUS,
    site: site.enUS,
    components: components.enUS,
    playground: playground.enUS,
  },
  "zh-CN": {
    common: common.zhCN,
    blocks: blocks.zhCN,
    cards: cards.zhCN,
    thread: thread.zhCN,
    composer: composer.zhCN,
    sidebar: sidebar.zhCN,
    conversation: conversation.zhCN,
    history: history.zhCN,
    home: home.zhCN,
    showcase: showcase.zhCN,
    appCommon: appCommon.zhCN,
    site: site.zhCN,
    components: components.zhCN,
    playground: playground.zhCN,
  },
};
