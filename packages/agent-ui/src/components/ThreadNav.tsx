import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

import { interpolate, useLocale } from "../i18n/locale-context.js";

export interface ThreadNavItem {
  /** 对应 [data-thread-anchor] 的下标。 */
  index: number;
  /** 该轮用户提问，用于菜单展示。 */
  text: string;
}

/** 命中判定带：锚点顶部进入滚动视口顶部下方该像素内即视为"当前轮"。 */
const ACTIVE_BAND = 140;
/** 移出后延迟收起，容忍指针跨越刻度与菜单之间的空隙。 */
const CLOSE_DELAY = 140;

/**
 * 会话右缘的轮次导航（ChatGPT 式）：竖排刻度指示每一轮用户提问，
 * hover 展开可点菜单，点击平滑滚动到对应提问；滚动时高亮当前轮。
 * 仅多轮（≥2）时挂载，由 RunThread 控制。
 */
export function ThreadNav({
  items,
  scrollRef,
}: {
  items: ThreadNavItem[];
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const { dict } = useLocale();
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 当前轮判定：取"顶部已越过命中带"的最后一个锚点。绑定容器 scroll + 尺寸变化。
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const compute = () => {
      const rootTop = root.getBoundingClientRect().top;
      let current = items[0]?.index ?? 0;
      for (const item of items) {
        const el = root.querySelector<HTMLElement>(`[data-thread-anchor="${item.index}"]`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - rootTop;
        if (top <= ACTIVE_BAND) current = item.index;
        else break;
      }
      setActive(current);
    };
    compute();
    root.addEventListener("scroll", compute, { passive: true });
    const ro = new ResizeObserver(compute);
    ro.observe(root);
    return () => {
      root.removeEventListener("scroll", compute);
      ro.disconnect();
    };
  }, [items, scrollRef]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const scrollTo = useCallback(
    (index: number) => {
      const el = scrollRef.current?.querySelector<HTMLElement>(`[data-thread-anchor="${index}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [scrollRef],
  );

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  return (
    <nav className="thread-nav" aria-label={dict.thread.nav.ariaLabel} onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <div className="thread-nav__menu" role="menu" hidden={!open}>
        {items.map((item) => (
          <button
            key={item.index}
            type="button"
            role="menuitem"
            className="thread-nav__item"
            data-active={item.index === active || undefined}
            onClick={() => scrollTo(item.index)}
          >
            <span className="thread-nav__item-index">{item.index + 1}</span>
            <span className="thread-nav__item-text">{item.text || dict.thread.nav.emptyText}</span>
          </button>
        ))}
      </div>
      <div className="thread-nav__ticks">
        {items.map((item) => (
          <button
            key={item.index}
            type="button"
            className="thread-nav__tick"
            data-active={item.index === active || undefined}
            onClick={() => scrollTo(item.index)}
            aria-label={interpolate(dict.thread.nav.jumpToTurn, { n: item.index + 1 })}
          />
        ))}
      </div>
    </nav>
  );
}
