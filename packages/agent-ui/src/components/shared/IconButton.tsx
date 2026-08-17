import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { Button } from "../ui/button.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.js";
import { cn } from "../../lib/utils.js";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  size?: "small" | "medium" | "large";
  tooltip?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, className = "", size = "medium", tooltip = true, ...props },
  ref,
) {
  // 库的 Button 仅提供 icon 一种方形尺寸（SRC 的 icon-sm/icon-lg 未随复刻迁移）；
  // 三档尺寸差异由 icon-button--* BEM 类在样式表承担。
  const button = (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      className={cn("icon-button", `icon-button--${size}`, className)}
      {...props}
    >
      {children}
    </Button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {button}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
});
