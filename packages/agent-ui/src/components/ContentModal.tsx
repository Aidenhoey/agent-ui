import type { ReactNode } from "react";

import { Button } from "./ui/button.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog.js";

/**
 * 居中模态工作台 —— 富内容块「展开」与产物全量预览的共用层：
 * 不是右侧滑出，而是页面中央打开大号工作台（大图 + 全量数据 + 导出/复制）。
 * 焦点陷阱、Esc 关闭、遮罩点击关闭由 radix Dialog 提供；样式走设计 token（.viz-modal）。
 */
export function ContentModal({
  open,
  onOpenChange,
  overline,
  title,
  actionLabel,
  onAction,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overline?: string | undefined;
  title: string;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="viz-modal" aria-describedby={undefined}>
        <DialogHeader className="viz-modal__head">
          <div className="viz-modal__titles">
            {overline ? <div className="viz-overline">{overline}</div> : null}
            <DialogTitle className="viz-modal__title">{title}</DialogTitle>
          </div>
          {actionLabel && onAction ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="viz-modal__action"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          ) : null}
        </DialogHeader>
        <div className="viz-modal__body">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
