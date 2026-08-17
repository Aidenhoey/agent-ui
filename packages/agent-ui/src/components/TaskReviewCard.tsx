import { useEffect, useMemo, useRef, useState } from "react";
import { GitBranch, LoaderCircle, ShieldCheck } from "lucide-react";

import { Button } from "./ui/button.js";
import type { TaskProgress } from "../protocol/events.js";
import type { TaskReviewDecision } from "../protocol/entities.js";
import type { TaskReviewViewState } from "../state/view-types.js";
import { interpolate, useLocale } from "../i18n/locale-context.js";
import type { CardsDict } from "../i18n/index.js";

type TaskReviewCopy = CardsDict["taskReview"];

function settledMessage(
  review: TaskReviewViewState,
  progress: TaskProgress | null,
  t: TaskReviewCopy,
): string {
  if (review.request.status === "approved") {
    const next = review.request.allowed_next_stages.find(
      (stage) => stage.id === review.request.next_stage_id,
    );
    return next ? interpolate(t.approvedNextStage, { stage: next.label }) : t.approved;
  }
  if (review.request.status === "rejected") return t.rejected;
  if (review.request.status === "expired") return t.expired;
  if (progress?.status === "stopped") return t.settledHandled;
  return t.settledSyncing;
}

export function TaskReviewCard({
  review,
  progress,
  onDecision,
  readOnly,
}: {
  review: TaskReviewViewState;
  progress: TaskProgress | null;
  onDecision: (decision: TaskReviewDecision, nextStageId?: string) => void;
  readOnly: boolean;
}) {
  const { dict } = useLocale();
  const t = dict.cards.taskReview;
  const options = review.request.allowed_next_stages;
  const [selectedStageId, setSelectedStageId] = useState(
    () => options.length === 1 ? options[0]!.id : "",
  );
  const optionIds = options.map((option) => option.id).join(":");
  const resultRef = useRef<HTMLParagraphElement>(null);
  const previousActionRef = useRef(review.actionState);
  const busy = review.actionState === "pending";
  const settled = review.settled || review.request.status !== "pending";
  const selectedStage = useMemo(
    () => options.find((stage) => stage.id === selectedStageId) ?? null,
    [options, selectedStageId],
  );

  useEffect(() => {
    const previous = previousActionRef.current;
    previousActionRef.current = review.actionState;
    if (previous === "pending" && review.actionState !== "pending") {
      resultRef.current?.focus();
    }
  }, [review.actionState]);

  useEffect(() => {
    setSelectedStageId(options.length === 1 ? options[0]!.id : "");
  }, [optionIds, review.request.review_id]);

  return (
    <section
      className="mb-3 rounded-xl border border-border bg-card p-4 text-card-foreground"
      aria-labelledby={`task-review-title-${review.request.review_id}`}
      aria-busy={busy}
      data-review-id={review.request.review_id}
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 id={`task-review-title-${review.request.review_id}`} className="text-sm font-semibold">
            {review.request.title}
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {review.request.summary}
          </p>

          {!settled && options.length > 1 ? (
            <fieldset className="mt-4 space-y-2">
              <legend className="flex items-center gap-1.5 text-sm font-medium">
                <GitBranch className="size-4" aria-hidden="true" />
                {t.chooseNextStage}
              </legend>
              {options.map((stage) => (
                <label
                  key={stage.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring"
                >
                  <input
                    type="radio"
                    name={`task-review-next-stage-${review.request.review_id}`}
                    value={stage.id}
                    checked={selectedStageId === stage.id}
                    disabled={busy || readOnly}
                    onChange={() => setSelectedStageId(stage.id)}
                  />
                  {stage.label}
                </label>
              ))}
            </fieldset>
          ) : !settled && options[0] ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t.advanceAfterApproval}<span className="text-foreground">{options[0].label}</span>
            </p>
          ) : null}

          {!settled && !readOnly ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy || !selectedStageId}
                aria-label={selectedStage ? interpolate(t.approveAndEnter, { stage: selectedStage.label }) : t.approveContinue}
                onClick={() => onDecision("approve", selectedStageId || undefined)}
              >
                {busy && review.pendingDecision === "approve"
                  ? <LoaderCircle className="animate-spin" aria-hidden="true" />
                  : null}
                {t.approveContinue}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                aria-label={t.rejectAriaLabel}
                onClick={() => onDecision("reject")}
              >
                {busy && review.pendingDecision === "reject"
                  ? <LoaderCircle className="animate-spin" aria-hidden="true" />
                  : null}
                {t.reject}
              </Button>
            </div>
          ) : null}

          {settled || review.failure ? (
            <p
              ref={resultRef}
              tabIndex={-1}
              className={`mt-4 text-sm ${review.failure ? "text-destructive" : "text-muted-foreground"}`}
              role={review.failure ? "alert" : "status"}
              aria-live={review.failure ? "assertive" : "polite"}
            >
              {review.failure?.message ?? settledMessage(review, progress, t)}
            </p>
          ) : (
            <p ref={resultRef} tabIndex={-1} className="sr-only" aria-live="polite">
              {busy ? t.submitting : ""}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
