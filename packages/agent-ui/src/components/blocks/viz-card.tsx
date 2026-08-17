import type { ReactNode } from "react";

/**
 * 富内容卡的统一解剖 —— Chart / Mermaid / Rich 三类块共用：
 * overline（类型·来源）→ 标题 → 副标题 → 工具条 → 内容区 → 脚注。
 * 抽出以保证卡片外观一致、避免三处重复。
 */

export interface SegOption<T extends string> {
  value: T;
  label: string;
}

/** 视图切换分段控件（渲染/源码、图表/表格/源码…）。 */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <span className="viz-seg" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-view={option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </span>
  );
}

/** 工具条图标按钮（复制 / 导出 / 展开）。 */
export function TBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button type="button" className="viz-tbtn" onClick={onClick} title={title} aria-label={title}>
      {children}
    </button>
  );
}

export function VizCard({
  overline,
  title,
  sub,
  tools,
  children,
  foot,
  className,
}: {
  overline: string;
  title: string;
  sub?: ReactNode;
  tools?: ReactNode;
  children: ReactNode;
  foot?: ReactNode;
  className?: string;
}) {
  return (
    <figure className={className ? `viz-card ${className}` : "viz-card"}>
      <div className="viz-head">
        <div className="viz-titles">
          <div className="viz-overline">{overline}</div>
          <div className="viz-title">{title}</div>
          {sub ? <div className="viz-sub">{sub}</div> : null}
        </div>
        {tools ? <div className="viz-tools">{tools}</div> : null}
      </div>
      <div className="viz-body">{children}</div>
      {foot ? <figcaption className="viz-foot">{foot}</figcaption> : null}
    </figure>
  );
}
