import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "./ui/button.js";
import type { ConnectionState, RecoveryFailure } from "../state/view-types.js";
import { useLocale } from "../i18n/locale-context.js";

/** 非侵入的连接状态浮条：不打断已渲染内容，重连成功自动消失。 */
export function ConnectionBanner({
  connection,
  failure,
  onRetry,
  onReload,
}: {
  connection: ConnectionState;
  failure: RecoveryFailure | null;
  onRetry?: (() => void) | undefined;
  onReload?: (() => void) | undefined;
}) {
  const { dict } = useLocale();
  const t = dict.cards.connection;
  if (connection === "live" || connection === "replay") return null;
  if (connection === "recovery_failed") {
    return (
      <div className="agent-conn agent-conn--failure" role="alert">
        <AlertTriangle className="size-3.5" />
        <span className="min-w-0">{failure?.message ?? t.failureFallback}</span>
        <span className="agent-conn__actions">
          {failure?.retryable && onRetry ? (
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="size-3.5" />
              {t.retry}
            </Button>
          ) : null}
          {onReload ? (
            <Button type="button" size="sm" variant="outline" onClick={onReload}>
              {t.reload}
            </Button>
          ) : null}
        </span>
      </div>
    );
  }
  return (
    <div className="agent-conn agent-conn--reconnect">
      <LoaderCircle className="size-3.5 animate-spin" />
      {connection === "recovering" ? t.recovering : t.reconnecting}
    </div>
  );
}
