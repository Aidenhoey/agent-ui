import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 会话流贴底：内容增长时自动跟随到底部；用户主动上滚则停止跟随，
 * 并暴露"回到底部"提示（ChatGPT 式）。dep 传 null 表示禁用跟随（只读场景）。
 */
export function useStickToBottom<T>(dep: T | null) {
  const ref = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el && pinnedRef.current && dep !== null) el.scrollTop = el.scrollHeight;
  }, [dep]);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const pinned = distance < 64;
    pinnedRef.current = pinned;
    setShowJump((prev) => (prev === !pinned ? prev : !pinned));
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    pinnedRef.current = true;
    setShowJump(false);
  }, []);

  return { ref, onScroll, showJump, scrollToBottom };
}
