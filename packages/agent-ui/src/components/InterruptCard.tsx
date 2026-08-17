import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, CircleAlert, Lightbulb, SendHorizontal } from "lucide-react";

import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
import { Textarea } from "./ui/textarea.js";
import type { InterruptField } from "../protocol/events.js";
import type { ActiveInterrupt } from "../state/view-types.js";
import { clearDraft, readDraft, writeDraft } from "../state/draft-registry.js";
import { StreamingMarkdown } from "../markdown/StreamingMarkdown.js";
import { interpolate, useLocale } from "../i18n/locale-context.js";
import type { CardsDict } from "../i18n/index.js";

/** 「其他…」自定义项的哨兵值（不与真实 option value 冲突）。 */
const OTHER = "__other__";

type Resolution = Record<string, unknown>;

type InterruptCopy = CardsDict["interrupt"];

export function InterruptCard({
  interrupt,
  onSubmit,
  readOnly = false,
}: {
  interrupt: ActiveInterrupt;
  onSubmit: (resolution: Resolution) => void;
  readOnly?: boolean;
}) {
  if (interrupt.resolved) return <ResolvedCard interrupt={interrupt} />;
  if (readOnly) return <FrozenCard interrupt={interrupt} />;
  if (interrupt.interrupt_kind === "plan_approval") {
    return <PlanApproval interrupt={interrupt} onSubmit={onSubmit} />;
  }
  return <Clarification interrupt={interrupt} onSubmit={onSubmit} />;
}

/* -------------------------------- 已答复固化 ------------------------------- */

/**
 * 答复摘要。两种来源形状：
 * - wire resolution（ResumeInput，服务端持久化）：clarification → {answer}；
 *   plan_approval → {decision, feedback?}。
 * - 本地乐观标注（annotateResolution）：字段级 {name: value} / {approved, feedback}。
 * 双形状都渲染；均缺失时只落「已答复」标签。
 */
function resolvedSummary(interrupt: ActiveInterrupt, t: InterruptCopy): string {
  const r = interrupt.resolution ?? {};
  if (interrupt.interrupt_kind === "plan_approval") {
    if (typeof r.decision === "string") {
      if (r.decision === "approve") return t.decisionApprove;
      if (r.decision === "reject") {
        const fb = typeof r.feedback === "string" && r.feedback ? r.feedback : null;
        return fb ? interpolate(t.decisionRejectWithFeedback, { feedback: fb }) : t.decisionReject;
      }
      const fb = typeof r.feedback === "string" && r.feedback ? r.feedback : null;
      return fb ? interpolate(t.decisionReviseWithFeedback, { feedback: fb }) : t.decisionRevise;
    }
    if (typeof r.approved === "boolean") {
      return r.approved
        ? t.decisionApprove
        : interpolate(t.decisionReviseWithFeedback, {
            feedback: String(r.feedback ?? t.seeConversation),
          });
    }
    return t.answered;
  }
  if (typeof r.answer === "string" && r.answer) {
    // wire 形状：整段答复文本（多字段以「字段: 值」换行拼接）。
    return r.answer;
  }
  if (r.answer !== undefined) return String(r.answer);
  if (interrupt.fields) {
    const summary = interrupt.fields
      .map((f) => {
        const v = r[f.name];
        if (v === undefined || v === "") return null;
        if (f.type === "single_choice") {
          return f.options?.find((o) => o.value === v)?.label ?? String(v);
        }
        return String(v);
      })
      .filter(Boolean)
      .join(" · ");
    if (summary) return summary;
  }
  return t.answered;
}

function ResolvedCard({ interrupt }: { interrupt: ActiveInterrupt }) {
  const { dict } = useLocale();
  const t = dict.cards.interrupt;
  const [planOpen, setPlanOpen] = useState(false);
  const plan = interrupt.plan ?? [];
  const hasPlan = interrupt.interrupt_kind === "plan_approval" && plan.length > 0;
  const body = interrupt.markdown?.trim() ? interrupt.markdown : interrupt.prompt;

  return (
    <div className="agent-interrupt agent-interrupt--resolved">
      <div className="agent-interrupt__head">
        <span className="agent-interrupt__resolved-headline">
          <span className="agent-interrupt__resolved-tag">{t.answered}</span>
          <span className="agent-interrupt__resolved-title">{interrupt.title}</span>
        </span>
        {hasPlan ? (
          <button
            type="button"
            className="agent-interrupt__plan-toggle"
            aria-expanded={planOpen}
            onClick={() => setPlanOpen((v) => !v)}
          >
            {planOpen ? t.collapsePlan : t.expandPlan}
            <ChevronDown className={`size-3.5 transition-transform ${planOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {body ? (
        <div className="agent-interrupt__prompt">
          <StreamingMarkdown text={body} renderCitation={() => null} />
        </div>
      ) : null}
      {hasPlan && planOpen ? (
        <ol className="agent-plan">
          {plan.map((step, i) => (
            <li key={step.id} className="agent-plan__step">
              <span className="agent-plan__idx">{i + 1}</span>
              <div>
                <div className="agent-plan__title">{step.title}</div>
                {step.detail ? <div className="agent-plan__detail">{step.detail}</div> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      <div className="agent-interrupt__answer">
        <span className="agent-interrupt__answer-label">{t.yourAnswer}</span>
        <span className="agent-interrupt__answer-text">{resolvedSummary(interrupt, t)}</span>
      </div>
    </div>
  );
}

/* -------------------------------- 只读冻结 -------------------------------- */

function FrozenCard({ interrupt }: { interrupt: ActiveInterrupt }) {
  const { dict } = useLocale();
  const t = dict.cards.interrupt;
  return (
    <div className="agent-interrupt agent-interrupt--frozen">
      <div className="agent-interrupt__head">
        <span className="agent-interrupt__title">
          <CircleAlert className="size-4 text-[var(--color-warning)]" />
          {interrupt.title}
        </span>
      </div>
      {interrupt.prompt ? (
        <div className="agent-interrupt__prompt">
          <StreamingMarkdown text={interrupt.prompt} renderCitation={() => null} />
        </div>
      ) : null}
      <p className="agent-interrupt__frozen-note">{t.frozenNote}</p>
    </div>
  );
}

/* -------------------------------- 澄清表单 -------------------------------- */

function Clarification({
  interrupt,
  onSubmit,
}: {
  interrupt: ActiveInterrupt;
  onSubmit: (r: Resolution) => void;
}) {
  const { dict } = useLocale();
  const t = dict.cards.interrupt;
  // fields 为空时合成兜底 textarea（legacy 空壳 / 选项-in-question），不写回 interrupt.fields
  const effectiveFields: InterruptField[] =
    interrupt.fields && interrupt.fields.length > 0
      ? interrupt.fields
      : [{ name: "answer", label: t.yourReply, type: "textarea", required: true }];
  const fields = effectiveFields;
  // 交互草稿按 interrupt_id 建键：SPA 导航卸载后重挂载可恢复字段值与「其他」自定义文本。
  const draftKey = `interrupt:${interrupt.interrupt_id}`;
  const [values, setValues] = useState<Record<string, string>>(
    () => readDraft<{ values?: Record<string, string> }>(draftKey)?.values ?? {},
  );
  const [others, setOthers] = useState<Record<string, string>>(
    () => readDraft<{ others?: Record<string, string> }>(draftKey)?.others ?? {},
  );
  const [touched, setTouched] = useState(false);
  // 提交态抑制位：提交路径同步置位后，setState 触发的 write-through effect 重跑见此位直接 return，
  // 不再把陈旧 values 写回草稿（修 instant 单选「选中即提交」后离开再返回恢复陈旧选择的 race）。
  const submittedRef = useRef(false);

  // write-through：值变化即同步草稿；提交时先 clearDraft，组件随 interrupt 转 resolved 卸载，effect 不再写回。
  useEffect(() => {
    if (submittedRef.current) return;
    writeDraft(draftKey, { values, others });
  }, [values, others, draftKey]);

  // 字段的最终值：选了「其他」则取自定义文本，否则取选中值/输入值。
  const resolve = (name: string): string => {
    const v = values[name];
    return v === OTHER ? others[name] ?? "" : v ?? "";
  };
  const isMissing = (f: InterruptField) => Boolean(f.required) && !resolve(f.name).trim();
  const missing = fields.some(isMissing);

  // 仅当整卡只有一个单选字段时「选中即提交」；多字段仍走底部按钮。
  const instant = fields.length === 1 && fields[0]?.type === "single_choice";

  const submitAll = () => {
    setTouched(true);
    if (missing) return;
    const out: Resolution = {};
    for (const f of fields) out[f.name] = resolve(f.name);
    submittedRef.current = true;
    clearDraft(draftKey);
    onSubmit(out);
  };

  return (
    <div
      className="agent-interrupt agent-interrupt--active"
      onKeyDown={(e) => {
        // Enter 兜底提交：textarea 内换行、选项按钮各自处理、输入法组合中，均不触发。
        if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
        const el = e.target as HTMLElement;
        if (el.tagName === "TEXTAREA" || el.getAttribute("role") === "radio") return;
        e.preventDefault();
        submitAll();
      }}
    >
      <div className="agent-interrupt__head">
        <span className="agent-interrupt__title">
          <CircleAlert className="size-4 text-[var(--color-warning)]" />
          {interrupt.title}
        </span>
      </div>
      {interrupt.prompt ? (
        <div className="agent-interrupt__prompt">
          <StreamingMarkdown text={interrupt.prompt} renderCitation={() => null} />
        </div>
      ) : null}

      <div className="agent-interrupt__fields">
        {fields.map((field) => {
          const invalid = touched && isMissing(field);
          if (field.type === "single_choice") {
            return (
              <ChoiceField
                key={field.name}
                field={field}
                value={values[field.name] ?? ""}
                otherValue={others[field.name] ?? ""}
                invalid={invalid}
                onChange={(v) => setValues((s) => ({ ...s, [field.name]: v }))}
                onPick={(v) => {
                  // 选中即提交仅在单字段单选时生效；直接用 v，避开 setState 异步。
                  if (instant) {
                    // ref 同步置位先于 setState 触发的 effect 重跑，effect 见 submittedRef 不再写回草稿。
                    submittedRef.current = true;
                    clearDraft(draftKey);
                    onSubmit({ [field.name]: v });
                  }
                }}
                onOtherChange={(text) => setOthers((s) => ({ ...s, [field.name]: text }))}
              />
            );
          }
          return (
            <TextField
              key={field.name}
              field={field}
              value={values[field.name] ?? ""}
              invalid={invalid}
              onChange={(v) => setValues((s) => ({ ...s, [field.name]: v }))}
            />
          );
        })}
      </div>

      {instant ? null : (
        <div className="agent-interrupt__foot">
          <Button size="sm" onClick={submitAll} disabled={touched && missing}>
            {t.submit} <SendHorizontal className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ 单选：选项卡 ------------------------------ */

function ChoiceField({
  field,
  value,
  otherValue,
  invalid,
  onChange,
  onPick,
  onOtherChange,
}: {
  field: InterruptField;
  value: string;
  otherValue: string;
  invalid: boolean;
  onChange: (v: string) => void;
  onPick: (finalValue: string) => void;
  onOtherChange: (t: string) => void;
}) {
  const { dict } = useLocale();
  const t = dict.cards.interrupt;
  const opts = useMemo(
    () => [
      ...(field.options ?? []),
      { value: OTHER, label: t.otherOption, description: t.otherOptionDesc as string | undefined },
    ],
    [field.options, t],
  );
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const idxOf = (v: string) => opts.findIndex((o) => o.value === v);

  // 键盘选中并聚焦；普通项同时触发 onPick（单字段单选时即提交），「其他」仅展开输入框。
  const choose = (i: number, pick: boolean) => {
    const opt = opts[i];
    if (!opt) return;
    onChange(opt.value);
    refs.current[i]?.focus();
    if (pick && opt.value !== OTHER) onPick(opt.value);
  };
  const move = (delta: number) => {
    const cur = idxOf(value);
    const from = cur < 0 ? (delta > 0 ? -1 : 0) : cur;
    const next = (((from + delta) % opts.length) + opts.length) % opts.length;
    choose(next, false); // 方向键只浏览，不提交
  };

  const checkedIdx = idxOf(value);
  return (
    <div className="agent-field" data-invalid={invalid ? "" : undefined}>
      <div className="agent-field__label" id={`${field.name}-label`}>
        {field.label}
        {field.required ? <span className="agent-field__req">*</span> : null}
      </div>
      <div
        className="agent-options"
        role="radiogroup"
        aria-labelledby={`${field.name}-label`}
        aria-required={field.required || undefined}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowRight") {
            e.preventDefault();
            move(1);
          } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
            e.preventDefault();
            move(-1);
          } else if (e.key >= "1" && e.key <= "9") {
            const i = Number(e.key) - 1;
            if (i < opts.length) {
              e.preventDefault();
              choose(i, true);
            }
          }
        }}
      >
        {opts.map((opt, i) => {
          const checked = value === opt.value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (checkedIdx < 0 && i === 0) ? 0 : -1}
              className="agent-option"
              data-checked={checked ? "" : undefined}
              onClick={() => choose(i, true)}
            >
              <span className="agent-option__mark" aria-hidden>
                {checked ? <Check className="size-3.5" /> : <span className="agent-option__kbd">{i + 1}</span>}
              </span>
              <span className="agent-option__body">
                <span className="agent-option__label">{opt.label}</span>
                {opt.description ? <span className="agent-option__desc">{opt.description}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
      {value === OTHER ? (
        <Input
          autoFocus
          className="agent-field__other"
          value={otherValue}
          placeholder={field.placeholder ?? t.customInputPlaceholder}
          aria-invalid={invalid || undefined}
          aria-label={interpolate(t.customReplyAriaLabel, { label: field.label })}
          onChange={(e) => onOtherChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}

/* ---------------------------- 文本 / 多行文本 ---------------------------- */

function TextField({
  field,
  value,
  invalid,
  onChange,
}: {
  field: InterruptField;
  value: string;
  invalid: boolean;
  onChange: (v: string) => void;
}) {
  const id = `f-${field.name}`;
  return (
    <div className="agent-field" data-invalid={invalid ? "" : undefined}>
      <label className="agent-field__label" htmlFor={id}>
        {field.label}
        {field.required ? <span className="agent-field__req">*</span> : null}
      </label>
      {field.type === "textarea" ? (
        <Textarea
          id={id}
          rows={2}
          value={value}
          placeholder={field.placeholder}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          value={value}
          placeholder={field.placeholder}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/* ------------------------------- 计划审批 -------------------------------- */

function PlanApproval({
  interrupt,
  onSubmit,
}: {
  interrupt: ActiveInterrupt;
  onSubmit: (r: Resolution) => void;
}) {
  const { dict } = useLocale();
  const t = dict.cards.interrupt;
  // 交互草稿按 interrupt_id 建键：SPA 导航卸载后重挂载可恢复调整意见与 revising 态。
  const draftKey = `interrupt:${interrupt.interrupt_id}`;
  const [revising, setRevising] = useState(
    () => readDraft<{ revising?: boolean }>(draftKey)?.revising ?? false,
  );
  const [feedback, setFeedback] = useState(
    () => readDraft<{ feedback?: string }>(draftKey)?.feedback ?? "",
  );
  const plan = interrupt.plan ?? [];

  // write-through：值变化即同步草稿；提交时先 clearDraft，组件随 interrupt 转 resolved 卸载，effect 不再写回。
  useEffect(() => {
    writeDraft(draftKey, { revising, feedback });
  }, [revising, feedback, draftKey]);

  return (
    <div className="agent-interrupt agent-interrupt--active">
      <div className="agent-interrupt__head">
        <span className="agent-interrupt__title">
          <Lightbulb className="size-4 text-[var(--color-warning)]" />
          {interrupt.title}
        </span>
      </div>

      {interrupt.markdown && interrupt.markdown.trim() ? (
        <StreamingMarkdown text={interrupt.markdown} renderCitation={() => null} />
      ) : plan.length ? (
        <ol className="agent-plan">
          {plan.map((step, i) => (
            <li key={step.id} className="agent-plan__step">
              <span className="agent-plan__idx">{i + 1}</span>
              <div>
                <div className="agent-plan__title">{step.title}</div>
                {step.detail ? <div className="agent-plan__detail">{step.detail}</div> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : interrupt.prompt ? (
        <div className="agent-interrupt__prompt">
          <StreamingMarkdown text={interrupt.prompt} renderCitation={() => null} />
        </div>
      ) : null}

      {revising ? (
        <div className="agent-interrupt__fields">
          <Textarea
            rows={2}
            autoFocus
            value={feedback}
            placeholder={t.feedbackPlaceholder}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && feedback.trim()) {
                e.preventDefault();
                clearDraft(draftKey);
                onSubmit({ approved: false, feedback });
              }
            }}
          />
        </div>
      ) : null}

      <div className="agent-interrupt__foot">
        {revising ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => setRevising(false)}>
              {t.cancel}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                clearDraft(draftKey);
                onSubmit({ approved: false, feedback });
              }}
              disabled={!feedback.trim()}
            >
              {t.submitRevision}
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setRevising(true)}>
              {t.revise}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                clearDraft(draftKey);
                onSubmit({ approved: true });
              }}
            >
              {t.approve} <SendHorizontal className="size-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
