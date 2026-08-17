import { Box, CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";

import type { BlocksDict } from "../../i18n/dict/blocks.js";
import { interpolate, useLocale } from "../../i18n/locale-context.js";
import type { SandboxBlock as SandboxBlockData } from "../../state/view-types.js";

type SandboxCopy = BlocksDict["sandbox"];

/** wire 的阶段键（collecting-outputs）→ 字典的 camelCase 键。 */
function stageLabel(t: SandboxCopy, stage: NonNullable<SandboxBlockData["stage"]>): string {
  switch (stage) {
    case "preparing":
      return t.stages.preparing;
    case "running":
      return t.stages.running;
    case "collecting-outputs":
      return t.stages.collectingOutputs;
  }
}

function formatDuration(t: SandboxCopy, durationMs: number): string {
  if (durationMs < 1000) return interpolate(t.durationMs, { ms: durationMs });
  const seconds = durationMs / 1000;
  return interpolate(t.durationSeconds, {
    seconds: seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1),
  });
}

export function SandboxBlock({ block }: { block: SandboxBlockData }) {
  const { dict } = useLocale();
  const t = dict.blocks.sandbox;

  if (block.status === "running") {
    return (
      <div className="agent-line agent-sandbox agent-sandbox--running" role="status">
        <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" />
        <span className="font-medium">{stageLabel(t, block.stage ?? "preparing")}</span>
        {typeof block.percent === "number" ? (
          <span className="agent-sandbox__meta">{Math.round(block.percent)}%</span>
        ) : null}
      </div>
    );
  }

  if (block.status === "failed") {
    const detail = block.failureCode ? t.failures[block.failureCode] : t.failedFallback;
    return (
      <div className="agent-line agent-sandbox agent-sandbox--failed" role="status">
        <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
        <span className="font-medium">{interpolate(t.failedWithDetail, { detail })}</span>
        {typeof block.durationMs === "number" ? (
          <span className="agent-sandbox__meta">· {formatDuration(t, block.durationMs)}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="agent-line agent-sandbox agent-sandbox--completed" role="status">
      {block.exitCode === 0 ? (
        <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <Box className="size-4 shrink-0" aria-hidden="true" />
      )}
      <span className="font-medium">{t.succeeded}</span>
      {block.exitCode === 0 ? (
        <span className="agent-sandbox__meta">· {t.exitOkNote}</span>
      ) : null}
      {typeof block.durationMs === "number" ? (
        <span className="agent-sandbox__meta">· {formatDuration(t, block.durationMs)}</span>
      ) : null}
      {typeof block.outputCount === "number" ? (
        <span className="agent-sandbox__meta">· {interpolate(t.safeOutputs, { count: block.outputCount })}</span>
      ) : null}
    </div>
  );
}
