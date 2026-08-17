import { ExternalLink, FileText } from "lucide-react";

import type { ArtifactView } from "../state/view-types.js";
import { useLocale } from "../i18n/locale-context.js";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function ArtifactCard({
  artifact,
  active,
  onOpen,
}: {
  artifact: ArtifactView;
  active?: boolean;
  onOpen: (artifact: ArtifactView) => void;
}) {
  const { dict } = useLocale();
  const t = dict.cards.artifact;
  return (
    <button
      type="button"
      className="agent-artifact"
      data-active={active ? "" : undefined}
      onClick={() => onOpen(artifact)}
    >
      <span className="agent-artifact__icon">
        <FileText className="size-4.5" />
      </span>
      <span className="agent-artifact__body">
        <span className="agent-artifact__name" title={artifact.logical_path}>{artifact.logical_path}</span>
        <span className="agent-artifact__meta">
          <span data-committed={artifact.committed ? "" : undefined} className="agent-artifact__tag">
            {artifact.committed ? t.committed : t.draft}
          </span>
          {typeof artifact.size_bytes === "number" ? ` · ${formatSize(artifact.size_bytes)}` : ""}
        </span>
      </span>
      <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
