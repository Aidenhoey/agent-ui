import * as blocks from "./dict/blocks.js";
import * as cards from "./dict/cards.js";
import * as common from "./dict/common.js";
import * as composer from "./dict/composer.js";
import * as thread from "./dict/thread.js";

export type { BlocksDict } from "./dict/blocks.js";
export type { CardsDict } from "./dict/cards.js";
export type { CommonDict } from "./dict/common.js";
export type { ComposerDict } from "./dict/composer.js";
export type { ThreadDict } from "./dict/thread.js";

export type LocaleCode = "en-US" | "zh-CN";

/** Copy consumed by production components in the stable root entry. */
export interface LocaleDict {
  common: common.CommonDict;
  blocks: blocks.BlocksDict;
  cards: cards.CardsDict;
  thread: thread.ThreadDict;
  composer: composer.ComposerDict;
}

export const componentDictionaries: Record<LocaleCode, LocaleDict> = {
  "en-US": {
    common: common.enUS,
    blocks: blocks.enUS,
    cards: cards.enUS,
    thread: thread.enUS,
    composer: composer.enUS,
  },
  "zh-CN": {
    common: common.zhCN,
    blocks: blocks.zhCN,
    cards: cards.zhCN,
    thread: thread.zhCN,
    composer: composer.zhCN,
  },
};
