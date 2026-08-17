import { useEffect, useState } from "react";
import { ChevronDown, Circle, CircleCheck, CircleDot, ListTodo, LoaderCircle } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible.js";
import { useRunState } from "../state/store.js";
import type { TodoStatus } from "../protocol/events.js";
import { interpolate, useLocale } from "../i18n/locale-context.js";

/** 单项状态图标：完成✓ / 进行中●(运行态转圈) / 待办○。 */
function StatusIcon({ status, active }: { status: TodoStatus; active: boolean }) {
  if (status === "completed") {
    return <CircleCheck className="agent-todo__ico agent-todo__ico--done size-3.5" aria-hidden="true" />;
  }
  if (status === "in_progress") {
    return active ? (
      <LoaderCircle className="agent-todo__ico agent-todo__ico--doing agent-todo__spin size-3.5" aria-hidden="true" />
    ) : (
      <CircleDot className="agent-todo__ico agent-todo__ico--doing size-3.5" aria-hidden="true" />
    );
  }
  return <Circle className="agent-todo__ico agent-todo__ico--todo size-3.5" aria-hidden="true" />;
}

/**
 * 任务清单面板 —— 玻璃 tab 紧贴 composer 顶部（不混入时间线）。
 * - 比 composer 窄一档，无底边/底圆角，底缘插入 composer 背后，视觉成一体。
 * - 收起（默认）：一行进度摘要（前导图标 + 当前项 + 计数）；展开：整单列表，限高滚动。
 * - 全部完成后整体收拢淡出并卸载，不再占位。
 * 无清单时不渲染。数据源为 run 顶层 todos（整单快照覆盖式更新）。
 */
export function TodoPanel() {
  const { dict } = useLocale();
  const t = dict.cards.todo;
  const { todos, status, todoLifecycle } = useRunState();

  const total = todos.length;
  const done = todos.filter((todo) => todo.status === "completed").length;
  const allDone = total > 0 && done === total;

  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!allDone) {
      setHidden(false);
      return;
    }
    const timer = setTimeout(() => setHidden(true), 260);
    return () => clearTimeout(timer);
  }, [allDone]);

  if (!total || hidden) return null;

  const active = status === "running" && todoLifecycle.status === "running";
  const current = todos.find((todo) => todo.status === "in_progress");
  const summary = allDone ? interpolate(t.allDone, { total }) : current ? current.text : t.pending;

  return (
    <div className="conversation-todos" data-hiding={allDone || undefined}>
      <Collapsible className="agent-todo">
        <CollapsibleTrigger className="agent-todo__head group" aria-label={t.title}>
          <span className="agent-todo__lead">
            {allDone ? (
              <CircleCheck className="agent-todo__ico--done size-[1.05rem]" aria-hidden="true" />
            ) : active ? (
              <LoaderCircle className="agent-todo__ico--doing agent-todo__spin size-[1.05rem]" aria-hidden="true" />
            ) : (
              <ListTodo className="agent-todo__lead-ico size-[1.05rem]" aria-hidden="true" />
            )}
          </span>
          <span className="agent-todo__summary">
            <span className="agent-todo__summary-label">{t.title}</span>
            <span className="agent-todo__summary-current" title={summary}>{summary}</span>
          </span>
          <span className="agent-todo__count">
            {done}/{total}
          </span>
          <ChevronDown className="agent-todo__chevron size-3.5 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </CollapsibleTrigger>

        <CollapsibleContent className="agent-todo__content">
          <ol className="agent-todo__list">
            {todos.map((todo) => (
              <li key={todo.id} className="agent-todo__item" data-status={todo.status}>
                <StatusIcon status={todo.status} active={active} />
                <span className="agent-todo__text">{todo.text}</span>
              </li>
            ))}
          </ol>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
