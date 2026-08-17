import { useEffect, useRef, useState } from "react";

/**
 * 打字机"排水缓冲"：delta 突发到达（一次几十字），直接渲染会一顿一顿。
 * 这里把目标全文接进缓冲，匀速吐字，观感接近逐字流；步长自适应，长文本不拖沓。
 * replay/历史场景传 enabled=false，直接落终态、跳过动画。
 *
 * 用 setTimeout 而非 rAF 驱动：后台/不可见标签页会暂停 rAF 使动画停滞，
 * setTimeout 虽被节流但仍推进，能保证最终追上终态。
 */
export function useTypewriter(target: string, { enabled = true }: { enabled?: boolean } = {}): string {
  const [display, setDisplay] = useState(enabled ? "" : target);
  const idxRef = useRef(enabled ? 0 : target.length);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      idxRef.current = target.length;
      setDisplay(target);
      return;
    }
    // 目标被重置（比已吐出的还短，如切换场景）→ 跟随回退。
    if (target.length < idxRef.current) {
      idxRef.current = target.length;
      setDisplay(target.slice(0, idxRef.current));
    }

    const tick = () => {
      const remaining = target.length - idxRef.current;
      if (remaining <= 0) {
        timerRef.current = null;
        return;
      }
      const step = Math.max(2, Math.ceil(remaining / 40));
      idxRef.current = Math.min(target.length, idxRef.current + step);
      setDisplay(target.slice(0, idxRef.current));
      timerRef.current = window.setTimeout(tick, 22);
    };

    if (idxRef.current < target.length && timerRef.current === null) {
      timerRef.current = window.setTimeout(tick, 22);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [target, enabled]);

  return display;
}
