import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { useLocale } from "../i18n/locale-context.js";
import type { MessageAttachment } from "../protocol/entities.js";

/**
 * 图片灯箱：全屏遮罩查看大图。
 * - Esc / 点击遮罩 / 关闭按钮 退出；← → 或左右按钮切换（多图时）。
 * - 打开期间锁定 body 滚动，Portal 到 body 避免被会话滚动容器裁剪。
 */
export function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: MessageAttachment[];
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}) {
  const { dict } = useLocale();
  const count = images.length;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight" && count > 1) onIndexChange((index + 1) % count);
      else if (event.key === "ArrowLeft" && count > 1) onIndexChange((index - 1 + count) % count);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, count, onClose, onIndexChange]);

  const current = images[index];
  if (!current) return null;

  return createPortal(
    <div className="agent-lightbox" role="dialog" aria-modal="true" aria-label={dict.thread.lightbox.ariaLabel} onClick={onClose}>
      <button type="button" className="agent-lightbox__close" aria-label={dict.common.close} onClick={onClose}>
        <X aria-hidden="true" />
      </button>

      {count > 1 ? (
        <button
          type="button"
          className="agent-lightbox__nav agent-lightbox__nav--prev"
          aria-label={dict.thread.lightbox.prev}
          onClick={(event) => {
            event.stopPropagation();
            onIndexChange((index - 1 + count) % count);
          }}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
      ) : null}

      <figure className="agent-lightbox__stage" onClick={(event) => event.stopPropagation()}>
        <img className="agent-lightbox__img" src={current.url} alt={current.name} />
        <figcaption className="agent-lightbox__caption">
          {current.name}
          {count > 1 ? <span className="agent-lightbox__counter">{index + 1} / {count}</span> : null}
        </figcaption>
      </figure>

      {count > 1 ? (
        <button
          type="button"
          className="agent-lightbox__nav agent-lightbox__nav--next"
          aria-label={dict.thread.lightbox.next}
          onClick={(event) => {
            event.stopPropagation();
            onIndexChange((index + 1) % count);
          }}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      ) : null}
    </div>,
    document.body,
  );
}
