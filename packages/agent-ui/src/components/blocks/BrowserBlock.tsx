import {
  Camera,
  ChevronRight,
  ChevronsDown,
  Globe,
  Keyboard,
  LoaderCircle,
  Lock,
  MousePointerClick,
  RotateCw,
  ScanLine,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
import { interpolate, useLocale } from "../../i18n/locale-context.js";
import type { BrowserActionKind } from "../../protocol/events.js";
import type { BrowserAction, BrowserBlock as BrowserBlockData } from "../../state/view-types.js";

const ACTION_ICON: Record<BrowserActionKind, LucideIcon> = {
  navigate: Globe,
  click: MousePointerClick,
  type: Keyboard,
  scroll: ChevronsDown,
  extract: ScanLine,
  screenshot: Camera,
  wait: LoaderCircle,
};
function iconFor(kind: BrowserActionKind): LucideIcon {
  return ACTION_ICON[kind] ?? Globe; // 未知动作前向兼容降级
}

function hostOf(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] ?? url;
  }
}

/**
 * 浏览器操作块 —— agent 自动操作浏览器的一段会话。
 * - running：实时浏览器窗口（地址栏 + 视口页面 + 会动的光标/输入/截图闪光 + 当前动作字幕）。
 * - completed：折叠成一行摘要，展开查看动作清单（与过程组一致）。
 * - failed：与工具失败一致的一行提示。
 */
export function BrowserBlock({ block }: { block: BrowserBlockData }) {
  const { dict } = useLocale();
  const t = dict.blocks.browser;

  if (block.status === "failed") {
    return (
      <div className="agent-line agent-tool--failed">
        <TriangleAlert className="size-4 shrink-0" />
        <span className="truncate">
          {interpolate(t.failedWithMessage, { message: block.error?.message ?? t.genericError })}
          <span className="ml-1 text-xs opacity-80">
            · {block.willRetry ? t.retryingNote : t.stoppedNote}
          </span>
        </span>
      </div>
    );
  }

  if (block.status === "completed") {
    const pageText = block.pageCount ? interpolate(t.pagesPrefix, { count: block.pageCount }) : "";
    return (
      <Collapsible className="agent-collapsible">
        <CollapsibleTrigger className="agent-line agent-line--trigger group">
          <Globe className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-medium">
            {interpolate(t.completedLabel, { pages: pageText, steps: block.actions.length })}
          </span>
          <ChevronRight className="agent-line__chevron size-3.5" aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent className="agent-collapsible__content">
          {block.resultPreview ? <div className="agent-browser-summary">{block.resultPreview}</div> : null}
          <ol className="agent-browser__steps">
            {block.actions.map((action) => {
              const Icon = iconFor(action.kind);
              return (
                <li key={action.id}>
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="agent-browser__step-label" title={action.label}>{action.label}</span>
                  {action.url ? <span className="agent-browser__step-host">{hostOf(action.url)}</span> : null}
                </li>
              );
            })}
          </ol>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // running —— 实时浏览器窗口
  const current: BrowserAction | undefined = block.actions[block.actions.length - 1];
  const kind = current?.kind ?? "navigate";
  const caption = current?.label ?? `${block.title}…`;
  const url = block.currentUrl ?? current?.url ?? "";
  const pageTitle = block.pageTitle ?? current?.pageTitle ?? block.title;
  const typedValue = kind === "type" ? current?.value ?? "" : "";
  const CaptionIcon = iconFor(kind);

  return (
    <div className="agent-browser agent-browser--live" data-action={kind}>
      <div className="agent-browser__chrome">
        <span className="agent-browser__dots" aria-hidden="true"><i /><i /><i /></span>
        <div className="agent-browser__omni">
          <Lock className="size-3 shrink-0 opacity-60" aria-hidden="true" />
          <span className="agent-browser__url">{url || "about:blank"}</span>
          <RotateCw className="agent-browser__reload size-3 shrink-0" aria-hidden="true" />
        </div>
        <span className="agent-browser__badge">
          <span className="agent-browser__badge-dot" aria-hidden="true" />{t.liveBadge}
        </span>
      </div>

      <div className="agent-browser__viewport">
        <span className="agent-browser__progress" aria-hidden="true" />
        <div className="agent-browser__page">
          <div className="agent-browser__page-head">
            <span className="agent-browser__page-logo" aria-hidden="true" />
            <div className={`agent-browser__searchbox${kind === "type" ? " is-typing" : ""}`}>
              <span className="agent-browser__searchbox-text">
                {kind === "type" ? typedValue : t.searchPlaceholder}
              </span>
            </div>
          </div>
          <div className="agent-browser__page-title">{pageTitle}</div>
          <div className="agent-browser__page-lines" aria-hidden="true">
            <span style={{ width: "92%" }} />
            <span style={{ width: "86%" }} />
            <span style={{ width: "95%" }} />
            <span style={{ width: "70%" }} />
            <span style={{ width: "90%" }} />
            <span style={{ width: "62%" }} />
          </div>
        </div>
        <span className="agent-browser__cursor" aria-hidden="true">
          <svg viewBox="0 0 12 12" className="agent-browser__cursor-arrow">
            <path d="M1 1 L1 9.4 L3.4 7.1 L5 10.6 L6.6 9.9 L5 6.5 L8.6 6.5 Z" />
          </svg>
        </span>
        <span className="agent-browser__flash" aria-hidden="true" />
      </div>

      <div className="agent-browser__caption">
        <CaptionIcon className="size-4 shrink-0 text-[var(--color-focus)]" />
        <span className="agent-browser__caption-text">{caption}</span>
      </div>
    </div>
  );
}
