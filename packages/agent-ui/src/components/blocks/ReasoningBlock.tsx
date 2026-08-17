import { Brain, ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
import { interpolate, useLocale } from "../../i18n/locale-context.js";
import type { ReasoningBlock as ReasoningBlockData } from "../../state/view-types.js";

export function ReasoningBlock({ block }: { block: ReasoningBlockData }) {
  const { dict } = useLocale();
  const t = dict.blocks.reasoning;

  if (block.status === "thinking") {
    return (
      <div className="agent-line agent-reasoning agent-reasoning--active" role="status">
        <Brain className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="agent-shimmer font-medium">{t.thinking}</span>
      </div>
    );
  }

  const seconds =
    typeof block.durationMs === "number" ? Math.max(1, Math.round(block.durationMs / 1000)) : null;
  const label = block.status === "failed"
    ? t.unfinished
    : seconds ? interpolate(t.doneWithDuration, { seconds }) : t.done;
  const hasText = Boolean(block.text);

  if (!hasText) {
    return (
      <div className="agent-line agent-reasoning" role="status">
        <Brain className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="font-medium">{label}</span>
      </div>
    );
  }

  return (
    <Collapsible className="agent-collapsible">
      <CollapsibleTrigger className="agent-line agent-line--trigger group">
        <Brain className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="font-medium">{label}</span>
        <ChevronRight className="agent-line__chevron size-3.5" aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="agent-collapsible__content">
        <div className="agent-reasoning__text">{block.text}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
