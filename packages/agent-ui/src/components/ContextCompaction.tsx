import { Layers } from "lucide-react";

import { useLocale } from "../i18n/locale-context.js";

/**
 * 上下文压缩标记（Codex 风格的 auto-compact）。
 *
 * 会话历史累积到接近上下文窗口上限时，系统把较早的若干轮归纳为摘要以释放空间。
 * 渲染上：在压缩边界处内联插入一条安静的标记行，不折叠任何历史轮次——
 * 被归纳的轮次仍完整展示，标记只是视觉分界（呼应 DESIGN 原则 1 内容优先）。
 *
 * 两种状态：
 * - `compacting`：正在压缩，文字走 agent-shimmer 流光（与"正在思考"同款）；
 * - `compacted`：压缩完成，安静的静态行。
 *
 * 这是**会话级**标记，不进 run 的事件 / 块管线。
 */
export function ContextCompaction({ state }: { state: "compacting" | "compacted" }) {
  const { dict } = useLocale();
  const t = dict.cards.compaction;
  const compacting = state === "compacting";
  return (
    <div className="agent-compaction">
      <Layers className="size-3.5 shrink-0" aria-hidden="true" />
      <span className={compacting ? "agent-shimmer" : undefined}>
        {compacting ? t.compacting : t.compacted}
      </span>
    </div>
  );
}
