import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

interface ResizablePanelProps {
  open: boolean;
  width: number;
  children: ReactNode;
  className?: string;
}

/** 可拖动宽度的右侧面板外壳：负责开合动画、保持内容宽度不被挤压。 */
export function ResizablePanel({ open, width, children, className }: ResizablePanelProps) {
  const [mounted, setMounted] = useState(open);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsOpen(true));
      });
      return () => cancelAnimationFrame(raf);
    }

    setIsOpen(false);
    const timer = window.setTimeout(() => setMounted(false), 240);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className={`detail-layer ${isOpen ? "is-open" : ""} ${className ?? ""}`}
      style={{ "--detail-width": `${width}px` } as CSSProperties}
    >
      {children}
    </div>
  );
}
