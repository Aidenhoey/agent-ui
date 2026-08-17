import { ChevronDown } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible.js";
import { useRunState } from "../state/store.js";
import { interpolate, useLocale } from "../i18n/locale-context.js";

/** 本轮末尾的来源汇总，与正文 `[n]` 角标一一对应。 */
export function EvidenceList() {
  const { dict } = useLocale();
  const t = dict.cards.evidence;
  const { evidenceOrder, evidences } = useRunState();
  if (evidenceOrder.length === 0) return null;

  const head = evidenceOrder.slice(0, 2);
  const rest = evidenceOrder.slice(2);

  const item = (id: string, i: number) => {
    const ev = evidences[id];
    if (!ev) return null;
    return (
      <li key={id} className="agent-source">
        <span className="agent-source__idx">[{i + 1}]</span>
        <a href={ev.url} target="_blank" rel="noreferrer" className="agent-source__title">
          {ev.title}
        </a>
        <span className="agent-source__provider">{ev.provider}</span>
      </li>
    );
  };

  return (
    <Collapsible className="agent-sources">
      <div className="agent-sources__head">{interpolate(t.sourcesHead, { count: evidenceOrder.length })}</div>
      <ol className="agent-sources__list">{head.map((id, i) => item(id, i))}</ol>
      {rest.length ? (
        <>
          <CollapsibleContent>
            <ol className="agent-sources__list">{rest.map((id, i) => item(id, i + 2))}</ol>
          </CollapsibleContent>
          <CollapsibleTrigger className="agent-sources__more group">
            {interpolate(t.expandRest, { count: rest.length })}
            <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
        </>
      ) : null}
    </Collapsible>
  );
}
