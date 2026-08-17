import { useEffect, useState } from "react";

/**
 * 解析当前生效主题：优先 `.dark` 类（AppProviders 统一维护，system 偏好也会落到该类），
 * 回落 `data-theme` 属性。供 HTML 沙箱 iframe 的 srcdoc 同步深浅色。
 */
export function resolveTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const root = document.documentElement;
  if (root.classList.contains("dark")) return "dark";
  if (root.getAttribute("data-theme") === "dark") return "dark";
  return "light";
}

/** 订阅主题变化（class / data-theme 突变）——切换主题时驱动 iframe 重建 srcdoc。 */
export function useResolvedTheme(): "light" | "dark" {
  const [theme, setTheme] = useState(resolveTheme);
  useEffect(() => {
    const update = () => setTheme(resolveTheme());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return theme;
}
