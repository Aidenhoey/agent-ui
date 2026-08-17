import { cn } from "../../lib/utils.js";

interface NavItemLabelProps {
  children: string;
  maxLength?: number;
  className?: string;
}

/**
 * 导航项标题标签：对超长标题做字符数硬限制，超出部分用「…」替代。
 * 始终保留原始完整字符串作为 title，悬停时仍可查看全称。
 */
export function NavItemLabel({ children, maxLength = 20, className }: NavItemLabelProps) {
  const shouldTruncate = children.length > maxLength;
  const displayText = shouldTruncate ? `${children.slice(0, maxLength - 1)}…` : children;

  return (
    <span
      className={cn("nav-item__label nav-item__label--truncate", className)}
      title={children}
    >
      {displayText}
    </span>
  );
}
