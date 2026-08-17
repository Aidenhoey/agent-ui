import type { ReactNode } from "react";

import { ChartBlock } from "./ChartBlock.js";
import { MermaidBlock } from "./MermaidBlock.js";
import { RichBlock } from "./RichBlock.js";
import type { RichFenceLang } from "./rich-content.js";

/**
 * 富内容围栏分发器 —— renderBlock 的「markdown 内嵌版」。
 * 富内容随正文以 ```lang 围栏到达（不是独立协议事件），故在渲染层按语言标签路由；
 * `closed` 由 StreamingMarkdown 的围栏解析给出：未闭合 → 源码流入，闭合 → 尝试渲染。
 */
export function renderRichFence(
  lang: RichFenceLang,
  source: string,
  closed: boolean,
  key: string,
): ReactNode {
  switch (lang) {
    case "chart":
      return <ChartBlock key={key} source={source} closed={closed} />;
    case "mermaid":
      return <MermaidBlock key={key} source={source} closed={closed} />;
    case "svg":
      return <RichBlock key={key} kind="svg" source={source} closed={closed} />;
    case "html":
      return <RichBlock key={key} kind="html" source={source} closed={closed} />;
  }
}
