import { RotateCcw, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./ui/alert.js";
import { Button } from "./ui/button.js";
import type { PublicError } from "../protocol/events.js";
import { useLocale } from "../i18n/locale-context.js";

export function RunErrorCard({
  error,
  retryable,
  onRetry,
}: {
  error: PublicError;
  retryable: boolean;
  onRetry?: () => void;
}) {
  const { dict } = useLocale();
  const t = dict.cards.runError;
  return (
    <Alert variant="destructive" className="agent-error">
      <TriangleAlert />
      <AlertTitle>{t.title}</AlertTitle>
      <AlertDescription>
        <p>
          {error.message}
          <span className="ml-1 opacity-70">（{error.code}）</span>
        </p>
        <p>{t.note}</p>
        {retryable && onRetry ? (
          <Button variant="outline" size="sm" className="mt-1" onClick={onRetry}>
            <RotateCcw className="size-3.5" /> {t.retry}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
