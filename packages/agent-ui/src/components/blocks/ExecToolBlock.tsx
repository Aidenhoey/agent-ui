import { ChevronRight, LoaderCircle, SquareTerminal, TriangleAlert } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
import { interpolate, useLocale } from "../../i18n/locale-context.js";
import type { ToolBlock as ToolBlockData } from "../../state/view-types.js";

/** running 态只显示输出尾部，模拟终端滚动。 */
const LIVE_TAIL_LINES = 6;

function ExitChip({ code }: { code: number }) {
  const { dict } = useLocale();
  return (
    <span className="agent-exec__exit agent-exec__exit--inline" data-ok={code === 0 || undefined}>
      {interpolate(dict.blocks.exec.exitChip, { code })}
    </span>
  );
}

/**
 * 执行现场 —— 取 Claude 的克制风格：一行命令（提示符 + 命令），下面是左侧
 * 连接线缩进的单色输出。随主题走，不做深色拟物终端外壳。
 */
function ExecTranscript({ block, live }: { block: ToolBlockData; live: boolean }) {
  const { dict } = useLocale();
  const lines = block.outputLines ?? [];
  const visible = live ? lines.slice(-LIVE_TAIL_LINES) : lines;

  return (
    <div className="agent-exec">
      {block.command ? (
        <div className="agent-exec__cmd">
          <span className="agent-exec__prompt" aria-hidden="true">$</span>
          <code className="agent-exec__cmd-text">{block.command}</code>
          {live ? (
            <span className="agent-exec__badge">
              <span className="agent-exec__badge-dot" aria-hidden="true" />{dict.blocks.exec.runningBadge}
            </span>
          ) : null}
        </div>
      ) : null}
      {visible.length || live ? (
        <div className="agent-exec__out">
          {visible.map((line, i) => (
            <div key={`${i}-${line}`} className="agent-exec__line">{line}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 程序运行块（tool_kind = execute）—— 代码 / 命令执行的专属渲染。
 * - running：命令 + 流式输出尾部 + 光标，实时可见。
 * - completed：一行结果摘要（含退出码）作折叠触发，默认折叠；点开展开内联
 *   命令与输出，长输出限高滚动。
 * - failed：失败行 + 执行现场（有输出时），便于排查。
 */
export function ExecToolBlock({ block }: { block: ToolBlockData }) {
  const { dict } = useLocale();
  const t = dict.blocks.exec;
  const toolCall = dict.blocks.toolCall;
  const hasTranscript = Boolean(block.command) || (block.outputLines?.length ?? 0) > 0;

  if (block.status === "running") {
    // 一期 wire 无 command / 逐行输出源：退化为通用运行行（statusText 优先）。
    if (!hasTranscript) {
      return (
        <div className="agent-line agent-tool--running">
          <LoaderCircle className="size-4 shrink-0 animate-spin text-[var(--color-focus)]" />
          <span className="font-medium">
            {block.statusText ?? interpolate(t.runningLabel, { title: block.title })}
          </span>
        </div>
      );
    }
    return <ExecTranscript block={block} live />;
  }

  if (block.status === "failed") {
    return (
      <div className="agent-exec-failed">
        <div className="agent-line agent-tool--failed">
          <TriangleAlert className="size-4 shrink-0" />
          <span>
            {interpolate(toolCall.failedWithMessage, {
              title: block.title,
              message: block.error?.message ?? t.genericError,
            })}
            {typeof block.exitCode === "number" ? (
              <span className="ml-1 text-xs opacity-80">
                · {interpolate(t.exitChip, { code: block.exitCode })}
              </span>
            ) : null}
            <span className="ml-1 text-xs opacity-80">
              · {block.willRetry ? toolCall.retryingNote : toolCall.stoppedRetryNote}
            </span>
          </span>
        </div>
        {hasTranscript ? <ExecTranscript block={block} live={false} /> : null}
      </div>
    );
  }

  // completed —— 与其他工具一致默认折叠，点开展开内联命令与输出（长输出限高滚动）。
  const label = block.resultPreview ?? interpolate(t.completedLabel, { title: block.title });

  // 无命令与输出（仅回执）——渲染成不可展开的一行，避免展开后空白。
  if (!hasTranscript) {
    return (
      <div className="agent-line">
        <SquareTerminal className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-medium">{label}</span>
        {typeof block.exitCode === "number" ? <ExitChip code={block.exitCode} /> : null}
      </div>
    );
  }

  return (
    <Collapsible className="agent-collapsible">
      <CollapsibleTrigger className="agent-line agent-line--trigger group">
        <SquareTerminal className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-medium">{label}</span>
        {typeof block.exitCode === "number" ? <ExitChip code={block.exitCode} /> : null}
        <ChevronRight className="agent-line__chevron size-3.5" aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="agent-collapsible__content">
        <ExecTranscript block={block} live={false} />
        {block.detailRef ? (
          <p className="agent-exec__more">{interpolate(t.outputRefNote, { ref: block.detailRef })}</p>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
