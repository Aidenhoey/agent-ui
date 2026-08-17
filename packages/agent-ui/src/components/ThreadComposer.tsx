import { Puzzle, X } from "lucide-react";

import { Composer, type ComposerSubmit } from "../composer/Composer.js";
import type { ComposerDict } from "../i18n/index.js";
import { interpolate, useLocale } from "../i18n/locale-context.js";
import { useRunState } from "../state/store.js";

/** 一条排队中的用户消息（本轮结束后自动成轮发送，发送前可撤回）。 */
export interface QueuedMessage {
  id: string;
  value: ComposerSubmit;
}

/** 队列条目的一行摘要：优先正文首行，退化到 Skill 名 / 附件名。 */
function queuedSummary(value: ComposerSubmit, t: ComposerDict["thread"]): string {
  const line = value.text.trim().split("\n")[0]?.trim();
  if (line) return line;
  if (value.skillId) return interpolate(t.skillSummary, { label: value.skillLabel ?? value.skillId });
  if (value.attachments.length) return value.attachments[0]!.name;
  return t.emptyMessage;
}

/**
 * 会话底部输入：复用产品 Composer。
 * agent 忙碌（运行中 / 等待用户回复卡片）时不锁输入，而是可输入 + 排队：
 * 主按钮在空输入时为「停止」、有输入时为「加入队列」；队列在本轮结束后逐条自动成轮发送。
 */
export function ThreadComposer({
  onSubmit,
  onStop,
  queue,
  onRemoveQueued,
}: {
  onSubmit: (value: ComposerSubmit) => void;
  onStop: () => void;
  queue: QueuedMessage[];
  onRemoveQueued: (id: string) => void;
}) {
  const t = useLocale().dict.composer.thread;
  const { status, taskProgress } = useRunState();
  const taskBusy = Boolean(
    taskProgress
    && taskProgress.status !== "completed"
    && taskProgress.status !== "stopped",
  );
  const busy = status === "running" || status === "waiting_user" || taskBusy;
  const placeholder =
    taskProgress?.status === "awaiting_review"
      ? t.placeholderAwaitingReview
      : status === "waiting_user"
      ? t.placeholderWaitingUser
      : status === "running"
        ? t.placeholderRunning
        : t.placeholderIdle;

  return (
    <footer className="conversation-composer">
      {queue.length > 0 ? (
        <ol className="composer-queue" aria-label={t.queueAria}>
          {queue.map((item, index) => {
            const summary = queuedSummary(item.value, t);
            return (
              <li key={item.id} className="composer-queue__item">
                <span className="composer-queue__index" aria-hidden="true">{index + 1}</span>
                {item.value.skillId ? <Puzzle className="composer-queue__skill" aria-hidden="true" /> : null}
                <span className="composer-queue__text" title={summary}>{summary}</span>
                <button
                  type="button"
                  className="composer-queue__remove"
                  aria-label={interpolate(t.retractAria, { summary })}
                  onClick={() => onRemoveQueued(item.id)}
                >
                  <X aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}
      <Composer
        busy={busy}
        onStop={onStop}
        placeholder={placeholder}
        onSubmit={onSubmit}
      />
    </footer>
  );
}
