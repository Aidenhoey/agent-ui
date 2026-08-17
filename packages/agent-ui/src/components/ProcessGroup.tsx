import { ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible.js";
import type { RunBlock } from "../state/view-types.js";
import { renderBlock } from "./renderBlock.js";
import { interpolate, useLocale } from "../i18n/locale-context.js";

/**
 * 本轮完成后，把中间过程（推理 + 工具调用 + 穿插的早期正文）统一收起成一行摘要，
 * 点击展开可查看全部步骤；每个步骤仍是各自可再展开的折叠行（渐进披露）。
 * 最终输出正文不在此列，由 RunTimeline 留在容器外正常展示；两者间以一道浅分隔线收束。
 */
export function ProcessGroup({
  blocks,
  durationMs,
}: {
  blocks: RunBlock[];
  durationMs?: number | undefined;
}) {
  const { dict } = useLocale();
  const t = dict.cards.processGroup;
  const seconds = durationMs ? Math.max(1, Math.round(durationMs / 1000)) : null;
  const summary = seconds ? interpolate(t.completedWithDuration, { seconds }) : t.completed;

  return (
    <div className="agent-process">
      <Collapsible className="agent-collapsible">
        <CollapsibleTrigger className="agent-line agent-line--trigger group">
          <span className="font-medium">{summary}</span>
          <ChevronRight className="agent-line__chevron size-3.5" aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent className="agent-collapsible__content agent-process__content">
          {blocks.map((block) => renderBlock(block))}
        </CollapsibleContent>
      </Collapsible>
      <div className="agent-process__divider" aria-hidden="true" />
    </div>
  );
}
