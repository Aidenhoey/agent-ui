import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { useLocale } from "../../i18n/locale-context.js";

/**
 * 代码视图 —— 语言角标（```lang）+ 等宽代码块 +（可选）复制按钮。
 * 富内容块的「源码态」、流式未闭合态与居中模态里都复用它，保证源码永远可回看、可复制。
 */
export function CodeView({
  source,
  lang,
  showCopy = true,
}: {
  source: string;
  lang: string;
  showCopy?: boolean;
}) {
  const { dict } = useLocale();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* 剪贴板不可用（无 https / 权限）时静默降级 */
    }
  };

  return (
    <div className="agent-code-view">
      <div className="agent-code-view__bar">
        <span className="agent-code-view__lang">```{lang}</span>
        {showCopy ? (
          <button
            type="button"
            className="agent-code-view__copy"
            onClick={copy}
            aria-label={copied ? dict.blocks.rich.sourceCopied : dict.blocks.rich.copySource}
          >
            {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
            <span>{copied ? dict.common.copied : dict.common.copy}</span>
          </button>
        ) : null}
      </div>
      <pre className="agent-code-view__pre">
        <code>{source}</code>
      </pre>
    </div>
  );
}
