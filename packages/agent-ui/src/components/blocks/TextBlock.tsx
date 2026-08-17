import { StreamingMarkdown } from "../../markdown/StreamingMarkdown.js";
import { useTypewriter } from "../../hooks/useTypewriter.js";
import { useRunState } from "../../state/store.js";
import type { TextBlock as TextBlockData } from "../../state/view-types.js";
import { EvidenceMarker } from "../EvidenceMarker.js";

export function TextBlock({ block }: { block: TextBlockData }) {
  const { connection } = useRunState();
  // 历史 replay 直接落终态，跳过打字机动画。
  const display = useTypewriter(block.text, { enabled: connection === "live" });

  return (
    <div className="agent-text">
      <StreamingMarkdown text={display} renderCitation={(n) => <EvidenceMarker index={n} />} />
    </div>
  );
}
