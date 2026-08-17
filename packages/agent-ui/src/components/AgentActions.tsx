import { Check, Copy, GitBranch, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "../i18n/locale-context.js";

/**
 * 轮次末尾的操作行（hover 显示）：复制正文 / 重试本轮 / 从本轮分支。
 * copyText 为空则隐藏复制；重试、分支由宿主按轮绑定。
 */
export function AgentActions({
  copyText,
  onRetry,
  onBranch,
}: {
  copyText?: string;
  onRetry?: () => void;
  onBranch?: () => void;
}) {
  const { dict } = useLocale();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const copy = () => {
    if (!copyText) return;
    void navigator.clipboard?.writeText(copyText);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="agent-actions">
      {copyText ? (
        <button type="button" className="agent-action" onClick={copy} aria-label={dict.thread.agentActions.copyAria}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? dict.common.copied : dict.common.copy}
        </button>
      ) : null}
      {onRetry ? (
        <button type="button" className="agent-action" onClick={onRetry} aria-label={dict.thread.agentActions.retryAria}>
          <RotateCcw className="size-3.5" /> {dict.common.retry}
        </button>
      ) : null}
      {onBranch ? (
        <button type="button" className="agent-action" onClick={onBranch} aria-label={dict.thread.agentActions.branchAria}>
          <GitBranch className="size-3.5" /> {dict.thread.agentActions.branch}
        </button>
      ) : null}
    </div>
  );
}
