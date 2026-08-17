import { BookMarked, ExternalLink } from "lucide-react";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card.js";
import { useRunState } from "../state/store.js";
import { interpolate, useLocale } from "../i18n/locale-context.js";

/** 正文里的 `[n]` 引用角标：hover 出来源预览，点击跳原文。 */
export function EvidenceMarker({ index }: { index: number }) {
  const { dict } = useLocale();
  const t = dict.cards.evidence;
  const { evidenceOrder, evidences } = useRunState();
  const id = evidenceOrder[index - 1];
  const ev = id ? evidences[id] : undefined;

  if (!ev) {
    return <sup className="agent-cite agent-cite--pending">[{index}]</sup>;
  }

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <a href={ev.url} target="_blank" rel="noreferrer" className="agent-cite-link">
          <sup className="agent-cite">[{index}]</sup>
        </a>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BookMarked className="size-3.5" />
          <span>{interpolate(t.sourceLabel, { provider: ev.provider, index })}</span>
        </div>
        <div className="text-sm font-medium leading-snug">{ev.title}</div>
        {ev.snippet ? (
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{ev.snippet}</p>
        ) : null}
        <a
          href={ev.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-focus-text)] hover:underline"
        >
          {t.viewOriginal} <ExternalLink className="size-3" />
        </a>
      </HoverCardContent>
    </HoverCard>
  );
}
