import {
  BookSearch,
  ChevronRight,
  FileText,
  Globe,
  LoaderCircle,
  PenLine,
  Puzzle,
  SquareTerminal,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
import { interpolate, useLocale } from "../../i18n/locale-context.js";
import { formatToolRunningLabel, type EvidenceReference, type ToolKind } from "../../protocol/events.js";
import { useRunState } from "../../state/store.js";
import type { ToolBlock as ToolBlockData } from "../../state/view-types.js";
import { ExecToolBlock } from "./ExecToolBlock.js";

/** 工具类别 → 图标；进行态文案由 protocol/events 的 formatToolRunningLabel 派生。 */
const KIND_ICON: Record<ToolKind, LucideIcon> = {
  search: Globe,
  knowledge: BookSearch,
  file_read: FileText,
  file_write: PenLine,
  execute: SquareTerminal,
  skill: Puzzle,
  generic: Wrench,
};

function iconFor(kind: ToolKind): LucideIcon {
  return KIND_ICON[kind] ?? KIND_ICON.generic; // 未知 kind 前向兼容降级
}

export function ToolCallBlock({ block }: { block: ToolBlockData }) {
  const { evidences } = useRunState();
  const { dict } = useLocale();
  const toolCopy = dict.blocks.tool;
  const t = dict.blocks.toolCall;
  const Icon = iconFor(block.toolKind);

  // 程序 / 命令执行走专属终端渲染（命令 + 实时输出 + 退出码）。
  if (block.toolKind === "execute") {
    return <ExecToolBlock block={block} />;
  }

  if (block.status === "running") {
    return (
      <div className="agent-line agent-tool--running">
        <LoaderCircle className="size-4 shrink-0 animate-spin text-[var(--color-focus)]" />
        <span className="font-medium truncate">
          {block.statusText ?? formatToolRunningLabel(block.toolKind, block.title, block.toolName, toolCopy)}
        </span>
      </div>
    );
  }

  if (block.status === "failed") {
    return (
      <div className="agent-line agent-tool--failed">
        <TriangleAlert className="size-4 shrink-0" />
        <span className="truncate">
          {interpolate(t.failedWithMessage, {
            title: block.title,
            message: block.error?.message ?? t.genericError,
          })}
          <span className="ml-1 text-xs opacity-80">
            · {block.willRetry ? t.retryingNote : t.stoppedRetryNote}
          </span>
        </span>
      </div>
    );
  }

  // completed —— 只呈现结果：摘要行给出结果概述，展开查看引用命中与完整结果引用（不再展示工具输入）。
  const cited = (block.evidenceIds ?? [])
    .map((id) => evidences[id])
    .filter((e): e is EvidenceReference => Boolean(e));
  const label = block.resultPreview ?? interpolate(t.completedLabel, { title: block.title });
  const hasDetail = cited.length > 0 || Boolean(block.detailRef);

  // 无更多详情（如写文件仅回执）——渲染成不可展开的一行，避免展开后空白。
  if (!hasDetail) {
    return (
      <div className="agent-line">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-medium truncate">{label}</span>
      </div>
    );
  }

  return (
    <Collapsible className="agent-collapsible">
      <CollapsibleTrigger className="agent-line agent-line--trigger group">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-medium truncate">{label}</span>
        <ChevronRight className="agent-line__chevron size-3.5" aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="agent-collapsible__content">
        <div className="agent-tool-detail space-y-2">
          {cited.length ? (
            <ul className="agent-tool-hits">
              {cited.map((ev) => (
                <li key={ev.evidence_id}>
                  <span className="truncate" title={ev.title}>{ev.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{ev.provider}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {block.detailRef ? (
            <p className="text-xs text-muted-foreground/70">
              {interpolate(t.detailRefNote, { ref: block.detailRef })}
            </p>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
