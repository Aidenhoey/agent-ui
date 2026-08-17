import { Bot, CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";

import { interpolate, useLocale } from "../i18n/locale-context.js";
import type { EvidenceReference } from "../protocol/events.js";
import { useRunState } from "../state/store.js";
import type { AgentBlock } from "../state/view-types.js";
import { RightPanel } from "./panels/RightPanel.js";
import { renderBlock } from "./renderBlock.js";
import { Badge } from "./ui/badge.js";

/**
 * 子 agent 详情面板（右侧栏）—— 点击时间线中的子 agent 行打开。
 * 复用 RightPanel 通用外壳与 renderBlock 渲染管线：内部步骤（parentId 指回该块的子块）
 * 用与主时间线完全相同的块组件呈现，订阅同一 run store，运行中实时更新。
 */
export function SubagentPanel({
  agentId,
  width,
  onClose,
  onWidthChange,
}: {
  agentId: string;
  width: number;
  onClose: () => void;
  onWidthChange?: ((width: number) => void) | undefined;
}) {
  const { dict } = useLocale();
  const state = useRunState();
  const agent = state.blocks.find(
    (b): b is AgentBlock => b.kind === "agent" && b.block_id === agentId,
  );
  // run 重播 / 切场景后块可能已不存在；宿主页会随之关闭面板，这里防御渲染空。
  if (!agent) return null;

  const t = dict.thread.subagentPanel;
  const STATUS_META = {
    running: { label: dict.blocks.toolStatus.running, Icon: LoaderCircle },
    completed: { label: dict.blocks.toolStatus.completed, Icon: CircleCheck },
    failed: { label: dict.blocks.toolStatus.failed, Icon: TriangleAlert },
  } as const;
  const meta = STATUS_META[agent.status];
  const StatusIcon = meta.Icon;
  const steps = state.blocks.filter((b) => b.parentId === agentId);
  const cited = (agent.evidenceIds ?? [])
    .map((id) => state.evidences[id])
    .filter((e): e is EvidenceReference => Boolean(e));
  const seconds = agent.durationMs ? Math.max(1, Math.round(agent.durationMs / 1000)) : null;

  return (
    <RightPanel
      open
      width={width}
      onClose={onClose}
      onWidthChange={onWidthChange}
      className="agent-subagent-panel"
      ariaLabelledBy="subagent-panel-title"
    >
      <RightPanel.Header
        icon={<Bot aria-hidden="true" />}
        title={agent.title}
        subtitle={agent.model ? interpolate(t.subtitleWithModel, { model: agent.model }) : t.subtitle}
        titleId="subagent-panel-title"
        closeLabel={t.close}
      />

      <RightPanel.Meta>
        <Badge variant="secondary" className="agent-subagent-panel__status" data-status={agent.status}>
          <StatusIcon
            aria-hidden="true"
            className={agent.status === "running" ? "animate-spin" : undefined}
          />
          {meta.label}
        </Badge>
        {steps.length ? <span className="right-panel__time">{interpolate(t.stepCount, { count: steps.length })}</span> : null}
        {seconds ? <span className="right-panel__time">{interpolate(t.duration, { seconds })}</span> : null}
      </RightPanel.Meta>

      <RightPanel.Body>
        <div className="agent-subagent-panel__body">
          {agent.task ? (
            <section className="agent-subagent-panel__task">
              <h3>{t.taskTitle}</h3>
              <p>{agent.task}</p>
            </section>
          ) : null}

          <section>
            <h3 className="agent-subagent-panel__section-title">{t.processTitle}</h3>
            {steps.length ? (
              // 与主时间线同一渲染管线：块组件与间距完全复用。
              <div className="agent-turn__body">{steps.map((block) => renderBlock(block))}</div>
            ) : (
              <p className="agent-subagent-panel__empty">
                {agent.status === "running" ? t.emptyRunning : t.emptySettled}
              </p>
            )}
          </section>

          {agent.status === "failed" && agent.error ? (
            <div className="agent-subagent-panel__failure">
              <TriangleAlert aria-hidden="true" />
              <span>
                {agent.error.message}
                {agent.willRetry ? ` · ${dict.blocks.toolStatus.retrying}` : ` · ${dict.blocks.toolStatus.stopped}`}
              </span>
            </div>
          ) : null}

          {agent.status === "completed" && agent.resultPreview ? (
            <section className="agent-subagent-panel__result">
              <h3>{t.resultTitle}</h3>
              <p>{agent.resultPreview}</p>
            </section>
          ) : null}

          {cited.length ? (
            <section aria-label={t.citationsAria}>
              <h3 className="agent-subagent-panel__section-title">{t.citationsTitle}</h3>
              <ul className="agent-tool-hits">
                {cited.map((ev) => (
                  <li key={ev.evidence_id}>
                    <span className="truncate" title={ev.title}>{ev.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{ev.provider}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </RightPanel.Body>
    </RightPanel>
  );
}
