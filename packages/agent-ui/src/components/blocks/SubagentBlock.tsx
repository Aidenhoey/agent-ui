import { Bot, ChevronRight, LoaderCircle, TriangleAlert } from "lucide-react";
import { useContext } from "react";

import type { BlocksDict } from "../../i18n/dict/blocks.js";
import { interpolate, useLocale } from "../../i18n/locale-context.js";
import type { AgentBlock as AgentBlockData } from "../../state/view-types.js";
import { SubagentPanelContext } from "../subagent-panel-context.js";

type SubagentCopy = BlocksDict["subagent"];

function summaryOf(t: SubagentCopy, block: AgentBlockData): string {
  if (block.status === "running") return block.statusText ?? t.runningLabel;
  if (block.status === "failed") {
    return `${block.error?.message ?? t.genericError}${block.willRetry ? ` · ${t.retryingNote}` : ""}`;
  }
  const parts: string[] = [];
  if (block.stepCount) parts.push(interpolate(t.stepsPart, { count: block.stepCount }));
  if (block.durationMs) {
    parts.push(interpolate(t.secondsPart, { seconds: Math.max(1, Math.round(block.durationMs / 1000)) }));
  }
  return parts.join(" · ") || t.completedFallback;
}

/**
 * 子 agent 行 —— 时间线里被委托子任务的锚点，与工具行同级的一行克制文本。
 * 点击在右侧详情栏打开该子 agent 的任务说明与内部执行过程。
 */
export function SubagentBlock({ block }: { block: AgentBlockData }) {
  const { activeAgentId, openAgent } = useContext(SubagentPanelContext);
  const { dict } = useLocale();
  const t = dict.blocks.subagent;
  const active = activeAgentId === block.block_id;
  const summary = summaryOf(t, block);

  return (
    <button
      type="button"
      className="agent-line agent-line--trigger agent-subagent"
      data-status={block.status}
      data-active={active || undefined}
      onClick={() => openAgent(block.block_id)}
      aria-label={interpolate(t.ariaLabel, { title: block.title })}
      aria-expanded={active}
    >
      <span className="agent-subagent__avatar" aria-hidden="true">
        {block.status === "failed" ? <TriangleAlert /> : <Bot />}
      </span>
      <span className="font-medium truncate">{block.title}</span>
      {block.status === "running" ? (
        <LoaderCircle className="size-3.5 shrink-0 animate-spin text-[var(--color-focus)]" aria-hidden="true" />
      ) : null}
      <span
        className={`agent-subagent__sub truncate${block.status === "running" ? " agent-shimmer" : ""}`}
        title={summary}
      >
        {summary}
      </span>
      <ChevronRight className="agent-subagent__open size-3.5 shrink-0" aria-hidden="true" />
    </button>
  );
}
