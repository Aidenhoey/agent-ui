import { Copy, Maximize2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useLocale } from "../../i18n/locale-context.js";
import { useResolvedTheme } from "../../hooks/useResolvedTheme.js";
import { CodeView } from "../shared/CodeView.js";
import { ContentModal } from "../ContentModal.js";
import { sanitizeSvg, wrapHtml } from "./rich-content.js";
import { Seg, TBtn, VizCard } from "./viz-card.js";

type RichKind = "svg" | "html";

/** 渲染态内容：SVG 内联（已消毒）或 HTML 沙箱 iframe（注入当前主题）。 */
function RichRender({
  kind,
  source,
  safeSvg,
  theme,
  tall,
}: {
  kind: RichKind;
  source: string;
  safeSvg?: string | undefined;
  theme: "light" | "dark";
  tall?: boolean;
}) {
  const { dict } = useLocale();
  if (kind === "svg") {
    return <div className="viz-rich-svg" dangerouslySetInnerHTML={{ __html: safeSvg ?? "" }} />;
  }
  return (
    <iframe
      className={tall ? "viz-html-frame viz-html-frame--tall" : "viz-html-frame"}
      sandbox="allow-scripts"
      title={dict.blocks.rich.iframeTitle}
      srcDoc={wrapHtml(source, theme)}
    />
  );
}

function RichCard({ kind, source, safeSvg }: { kind: RichKind; source: string; safeSvg?: string | undefined }) {
  const { dict } = useLocale();
  const [view, setView] = useState<"render" | "code">("render");
  const [expanded, setExpanded] = useState(false);
  const theme = useResolvedTheme();
  // SRC 的 META 常量表含中文文案；迁移后按 kind 从字典取（overline/title/foot）。
  const meta =
    kind === "svg"
      ? {
          overline: dict.blocks.rich.svgOverline,
          title: dict.blocks.rich.svgTitle,
          foot: dict.blocks.rich.svgFoot,
        }
      : {
          overline: "html · sandbox iframe",
          title: dict.blocks.rich.interactive,
          foot: dict.blocks.rich.sandboxNote,
        };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source);
    } catch {
      /* 静默 */
    }
  };

  return (
    <>
      <VizCard
        overline={meta.overline}
        title={meta.title}
        tools={
          <>
            <Seg
              ariaLabel={dict.blocks.rich.viewSwitch}
              value={view}
              onChange={setView}
              options={[
                { value: "render", label: dict.blocks.rich.render },
                { value: "code", label: dict.blocks.rich.source },
              ]}
            />
            <TBtn onClick={copy} title={dict.blocks.rich.copySource}>
              <Copy className="size-3.5" aria-hidden />
            </TBtn>
            <TBtn onClick={() => setExpanded(true)} title={dict.blocks.rich.expand}>
              <Maximize2 className="size-3.5" aria-hidden />
            </TBtn>
          </>
        }
        foot={meta.foot}
      >
        {view === "code" ? (
          <CodeView source={source} lang={kind} />
        ) : (
          <RichRender kind={kind} source={source} safeSvg={safeSvg} theme={theme} />
        )}
      </VizCard>

      <ContentModal
        open={expanded}
        onOpenChange={setExpanded}
        overline={meta.overline}
        title={meta.title}
        actionLabel={dict.blocks.rich.modalCopySource}
        onAction={copy}
      >
        <RichRender kind={kind} source={source} safeSvg={safeSvg} theme={theme} tall />
      </ContentModal>
    </>
  );
}

export function RichBlock({ kind, source, closed }: { kind: RichKind; source: string; closed: boolean }) {
  const { dict } = useLocale();
  // 围栏未闭合：源码流入。
  const safeSvg = useMemo(() => (closed && kind === "svg" ? sanitizeSvg(source) : null), [closed, kind, source]);

  if (!closed) return <CodeView source={source} lang={kind} />;

  if (kind === "svg" && !safeSvg) {
    return (
      <div className="viz-fallback">
        <div className="viz-fallback__note" role="alert">
          {dict.blocks.rich.svgInvalid}
        </div>
        <CodeView source={source} lang="svg" />
      </div>
    );
  }
  return <RichCard kind={kind} source={source} safeSvg={safeSvg ?? undefined} />;
}
