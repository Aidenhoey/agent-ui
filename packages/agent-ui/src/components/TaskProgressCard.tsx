import { CheckCircle2, CircleStop, LoaderCircle, ShieldQuestion } from "lucide-react";

import type { TaskProgress } from "../protocol/events.js";
import { interpolate, useLocale } from "../i18n/locale-context.js";

function StatusIcon({ status }: { status: TaskProgress["status"] }) {
  if (status === "completed") return <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />;
  if (status === "stopped") return <CircleStop className="size-4 text-muted-foreground" aria-hidden="true" />;
  if (status === "awaiting_review") return <ShieldQuestion className="size-4 text-primary" aria-hidden="true" />;
  return <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />;
}

/** PublicAPI Task projection only: product labels and lifecycle status, no runtime internals. */
export function TaskProgressCard({ progress }: { progress: TaskProgress }) {
  const { dict } = useLocale();
  const t = dict.cards.taskProgress;

  const STATUS_LABEL: Record<TaskProgress["status"], string> = {
    running: t.status.running,
    awaiting_review: t.status.awaitingReview,
    advancing: t.status.advancing,
    completed: t.status.completed,
    stopped: t.status.stopped,
  };

  return (
    <section
      className="mb-3 rounded-xl border border-border bg-card p-4 text-card-foreground"
      aria-label={interpolate(t.ariaLabel, { skill: progress.skill_label })}
      data-task-id={progress.task_id}
      data-task-status={progress.status}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{progress.skill_label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.currentStage}<span className="text-foreground">{progress.stage_label}</span>
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium" role="status">
          <StatusIcon status={progress.status} />
          {STATUS_LABEL[progress.status]}
        </span>
      </div>
      {progress.status === "awaiting_review" ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t.awaitingReviewNote}
        </p>
      ) : null}
    </section>
  );
}
