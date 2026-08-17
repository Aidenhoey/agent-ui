import { X } from "lucide-react";
import {
  createContext,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { useLocale } from "../../i18n/locale-context.js";
import { IconButton } from "../shared/IconButton.js";
import { ResizablePanel } from "./ResizablePanel.js";

function clampPanelWidth(width: number) {
  const maximum = Math.max(320, Math.min(820, Math.round(window.innerWidth * 0.8)));
  return Math.min(maximum, Math.max(320, Math.round(width)));
}

function applyPanelWidth(host: HTMLElement, width: number) {
  const clamped = clampPanelWidth(width);
  host.style.setProperty("--detail-width", `${clamped}px`);
  const layer = host.closest<HTMLElement>(".detail-layer");
  if (layer) layer.style.setProperty("--detail-width", `${clamped}px`);
  return clamped;
}

function setLayerResizing(layer: HTMLElement | null, resizing: boolean) {
  layer?.classList.toggle("is-resizing", resizing);
}

interface RightPanelContextValue {
  onClose: () => void;
  closeRef: React.RefObject<HTMLButtonElement | null>;
}

const RightPanelContext = createContext<RightPanelContextValue>({
  onClose: () => {},
  closeRef: { current: null },
});

export function useRightPanel() {
  return useContext(RightPanelContext);
}

interface RightPanelProps {
  open: boolean;
  width: number;
  onWidthChange?: ((width: number) => void) | undefined;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  ariaLabelledBy?: string;
}

/** 右侧面板通用外壳：包 ResizablePanel、左侧 resize 手柄、ESC/焦点管理。
 *  产物/子 agent 等右侧面板统一用它做容器。
 *  头部、meta、body、footer 通过子组件或 children 自行组合。 */
export function RightPanel({ open, width, onWidthChange, onClose, children, className, ariaLabelledBy }: RightPanelProps) {
  const { dict } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement | null;
      setMounted(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (mounted && rootRef.current) {
      applyPanelWidth(rootRef.current, width);
    }
  }, [mounted, width]);

  useEffect(() => {
    return () => {
      previousFocus.current?.focus();
    };
  }, []);

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    const host = rootRef.current;
    if (!host) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const layer = host.closest<HTMLElement>(".detail-layer");
    setLayerResizing(layer, true);
    const startX = event.clientX;
    const startWidth = host.getBoundingClientRect().width;
    let currentWidth = startWidth;
    const handleMove = (moveEvent: PointerEvent) => {
      currentWidth = applyPanelWidth(host, startWidth + startX - moveEvent.clientX);
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setLayerResizing(layer, false);
      onWidthChange?.(currentWidth);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const host = rootRef.current;
    if (!host) return;
    const delta = event.key === "ArrowLeft" ? 24 : -24;
    const nextWidth = applyPanelWidth(host, host.getBoundingClientRect().width + delta);
    onWidthChange?.(nextWidth);
  };

  return (
    <RightPanelContext.Provider value={{ onClose, closeRef }}>
      <ResizablePanel open={open} width={width}>
        <div
          ref={rootRef}
          className={`right-panel ${className ?? ""}`}
          style={{ "--detail-width": `${width}px` } as CSSProperties}
          role="dialog"
          aria-modal={false}
          aria-labelledby={ariaLabelledBy}
        >
          <div
            className="right-panel__resizer"
            role="separator"
            aria-label={dict.thread.rightPanel.resizeAria}
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={handleResizeStart}
            onKeyDown={handleResizeKeyDown}
          >
            <span className="right-panel__resizer-bar" aria-hidden="true" />
          </div>
          <div className="right-panel__frame">{children}</div>
        </div>
      </ResizablePanel>
    </RightPanelContext.Provider>
  );
}

interface HeaderProps {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  titleId?: string;
  closeLabel?: string;
}

function Header({ icon, title, subtitle, titleId, closeLabel }: HeaderProps) {
  const { dict } = useLocale();
  const generatedId = useId();
  const resolvedId = titleId ?? `${generatedId}-right-panel-title`;
  const { onClose, closeRef } = useContext(RightPanelContext);

  return (
    <header className="right-panel__header">
      <span className="right-panel__icon">{icon}</span>
      <div className="right-panel__title-block">
        <h2 id={resolvedId} title={typeof title === "string" ? title : undefined}>{title}</h2>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      <IconButton ref={closeRef} label={closeLabel ?? dict.common.close} size="small" tooltip={false} onClick={onClose}>
        <X aria-hidden="true" />
      </IconButton>
    </header>
  );
}

function Meta({ children }: { children: ReactNode }) {
  return <div className="right-panel__meta">{children}</div>;
}

function Body({ children }: { children: ReactNode }) {
  return <div className="right-panel__body">{children}</div>;
}

function Footer({ children }: { children: ReactNode }) {
  return <footer className="right-panel__footer">{children}</footer>;
}

RightPanel.Header = Header;
RightPanel.Meta = Meta;
RightPanel.Body = Body;
RightPanel.Footer = Footer;
