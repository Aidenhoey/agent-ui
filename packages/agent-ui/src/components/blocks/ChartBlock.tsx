import { Maximize2, Table2 } from "lucide-react";
import { type KeyboardEvent, type PointerEvent, type ReactNode, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { BlocksDict } from "../../i18n/dict/blocks.js";
import { interpolate, useLocale } from "../../i18n/locale-context.js";
import { CodeView } from "../shared/CodeView.js";
import { ContentModal } from "../ContentModal.js";
import {
  downloadCsv,
  formatNumber,
  parseChartSpec,
  specToCsv,
  type ChartParseError,
  type ChartSeries,
  type ChartSpec,
} from "./rich-content.js";
import { Seg, TBtn, VizCard } from "./viz-card.js";

/* ============================================================ 图表 SVG + 交互 */

interface TipRow {
  name: string;
  value: string;
  color: string;
  shape: "line" | "rect";
}
interface Tip {
  title: string;
  rows: TipRow[];
  sum?: { name: string; value: string } | undefined;
}

function buildTip(spec: ChartSpec, visible: ChartSeries[], index: number, totalLabel: string): Tip {
  const unit = spec.unit ? ` ${spec.unit}` : "";
  if (spec.type === "stack") {
    const total = visible.reduce((a, s) => a + (s.data[index] ?? 0), 0);
    return {
      title: spec.x[index] ?? "",
      rows: [...visible].reverse().map((s) => ({
        name: s.name,
        value: `${formatNumber(s.data[index] ?? 0)}${unit}`,
        color: s.color,
        shape: "rect",
      })),
      sum: { name: totalLabel, value: `${formatNumber(total)}${unit}` },
    };
  }
  return {
    title: spec.x[index] ?? "",
    rows: visible.map((s) => ({
      name: s.name,
      value: `${formatNumber(s.data[index] ?? 0)}${unit}`,
      color: s.color,
      shape: spec.type === "bar" ? "rect" : "line",
    })),
  };
}

/** 悬浮 tooltip（单例，值主名次）—— portal 到 body，避免被卡片 overflow 裁剪。 */
function ChartTooltip({ tip, x, y }: { tip: Tip; x: number; y: number }) {
  const pad = 14;
  const estW = 190;
  const estH = 34 + tip.rows.length * 20 + (tip.sum ? 24 : 0);
  let left = x + pad;
  let top = y + pad;
  if (typeof window !== "undefined") {
    if (left + estW > window.innerWidth - 8) left = x - estW - pad;
    if (top + estH > window.innerHeight - 8) top = Math.max(8, y - estH - pad);
  }
  return (
    <div className="viz-tooltip" style={{ left, top }} role="status">
      <div className="viz-tooltip__title">{tip.title}</div>
      {tip.rows.map((r, i) => (
        <div key={i} className="viz-tooltip__row">
          <span
            className={r.shape === "rect" ? "viz-tooltip__key viz-tooltip__key--rect" : "viz-tooltip__key"}
            style={{ background: r.shape === "rect" ? r.color : undefined, borderTopColor: r.shape === "line" ? r.color : undefined }}
          />
          <span className="viz-tooltip__name">{r.name}</span>
          <span className="viz-tooltip__val">{r.value}</span>
        </div>
      ))}
      {tip.sum ? (
        <div className="viz-tooltip__sum">
          <div className="viz-tooltip__row">
            <span className="viz-tooltip__key" style={{ visibility: "hidden" }} />
            <span className="viz-tooltip__name">{tip.sum.name}</span>
            <span className="viz-tooltip__val">{tip.sum.value}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/** 折线 / 柱 / 堆叠柱统一渲染器 —— 拥有 hover/键盘交互与自持 tooltip。 */
function ChartPlot({
  spec,
  visible,
  width,
  height,
}: {
  spec: ChartSpec;
  visible: ChartSeries[];
  width: number;
  height: number;
}) {
  const { dict } = useLocale();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);

  const n = spec.x.length;
  const isBars = spec.type === "bar" || spec.type === "stack";
  const m = isBars ? { l: 40, r: 18, t: 24, b: 30 } : { l: 38, r: 62, t: 26, b: 30 };
  const pw = width - m.l - m.r;
  const ph = height - m.t - m.b;
  const bandW = pw / Math.max(1, n);
  const xPos = (i: number) => (n <= 1 ? m.l + pw / 2 : m.l + (i * pw) / (n - 1));
  const yPos = (v: number) => m.t + ph - (clamp(v, 0, spec.yMax) / spec.yMax) * ph;

  const indexFromClientX = (clientX: number): number => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const px = ((clientX - rect.left) * width) / rect.width;
    if (isBars) return clamp(Math.floor((px - m.l) / bandW), 0, n - 1);
    return clamp(Math.round(((px - m.l) / pw) * (n - 1)), 0, n - 1);
  };

  const onPointerMove = (e: PointerEvent) => {
    setHover({ index: indexFromClientX(e.clientX), x: e.clientX, y: e.clientY });
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const cur = hover?.index ?? (e.key === "ArrowRight" ? -1 : n);
    const next = clamp(cur + (e.key === "ArrowRight" ? 1 : -1), 0, n - 1);
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = rect.width / width;
    setHover({ index: next, x: rect.left + xPos(next) * scale, y: rect.top + (m.t + ph / 3) * scale });
  };

  const gridlines = spec.yTicks.map((t, i) => (
    <g key={`g${i}`}>
      <line x1={m.l} x2={width - m.r} y1={yPos(t)} y2={yPos(t)} className={t === 0 ? "viz-baseline" : "viz-gridline"} />
      <text x={m.l - 7} y={yPos(t) + 3.5} textAnchor="end" className="viz-ax-text">
        {formatNumber(t)}
      </text>
    </g>
  ));
  const xLabels = spec.x.map((lab, i) => (
    <text key={`x${i}`} x={isBars ? m.l + bandW * i + bandW / 2 : xPos(i)} y={height - m.b + 18} textAnchor="middle" className="viz-ax-text">
      {lab}
    </text>
  ));

  let marks: ReactNode = null;
  if (spec.type === "line") {
    marks = visible.map((s) => {
      const d = s.data.map((v, i) => `${i ? "L" : "M"}${xPos(i)},${yPos(v)}`).join(" ");
      const last = s.data.length - 1;
      return (
        <g key={s.name}>
          <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={xPos(last)} cy={yPos(s.data[last] ?? 0)} r={4.2} fill={s.color} stroke="var(--color-raised)" strokeWidth={2} />
          <text x={xPos(last) + 9} y={yPos(s.data[last] ?? 0) + 4} className="viz-dlabel">
            {formatNumber(s.data[last] ?? 0)}
          </text>
        </g>
      );
    });
  } else if (spec.type === "stack") {
    marks = spec.x.map((_, i) => {
      const cx = m.l + bandW * i + bandW / 2;
      const barW = Math.min(24, bandW * 0.5);
      const x0 = cx - barW / 2;
      let acc = 0;
      const total = visible.reduce((a, s) => a + (s.data[i] ?? 0), 0);
      const segs = visible.map((s, k) => {
        const v = s.data[i] ?? 0;
        const yTop = yPos(acc + v);
        const yBot = yPos(acc);
        const isTop = k === visible.length - 1;
        const h = Math.max(0, yBot - yTop - (isTop ? 0 : 2));
        acc += v;
        return isTop ? (
          <path key={s.name} d={topRoundedRect(x0, yTop, barW, h, 4)} fill={s.color} />
        ) : (
          <rect key={s.name} x={x0} y={yTop} width={barW} height={h} fill={s.color} />
        );
      });
      return (
        <g key={i} className={hover?.index === i ? "viz-bar-col hot" : "viz-bar-col"}>
          {segs}
          <text x={cx} y={yPos(total) - 7} textAnchor="middle" className="viz-dlabel">
            {formatNumber(total)}
          </text>
        </g>
      );
    });
  } else {
    // grouped bar
    const c = Math.max(1, visible.length);
    const groupW = Math.min(bandW * 0.72, 26 * c);
    const subW = Math.min(20, groupW / c - 2);
    marks = spec.x.map((_, i) => {
      const cx = m.l + bandW * i + bandW / 2;
      const start = cx - (subW * c + 2 * (c - 1)) / 2;
      return (
        <g key={i} className={hover?.index === i ? "viz-bar-col hot" : "viz-bar-col"}>
          {visible.map((s, k) => {
            const v = s.data[i] ?? 0;
            const x0 = start + k * (subW + 2);
            const yTop = yPos(v);
            return <path key={s.name} d={topRoundedRect(x0, yTop, subW, Math.max(0, yPos(0) - yTop), 3)} fill={s.color} />;
          })}
        </g>
      );
    });
  }

  const hot =
    hover && spec.type === "line"
      ? visible.map((s) => (
          <circle key={s.name} cx={xPos(hover.index)} cy={yPos(s.data[hover.index] ?? 0)} r={4} fill={s.color} stroke="var(--color-raised)" strokeWidth={2} />
        ))
      : null;

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="viz-plot"
        role="img"
        tabIndex={0}
        aria-label={interpolate(dict.blocks.chart.ariaChart, { title: spec.title })}
        onKeyDown={onKeyDown}
        onBlur={() => setHover(null)}
      >
        {gridlines}
        {spec.unit ? (
          <text x={m.l - 7} y={m.t - 10} textAnchor="end" className="viz-ax-unit">
            {spec.unit}
          </text>
        ) : null}
        {xLabels}
        {spec.type === "line" && hover ? (
          <line x1={xPos(hover.index)} x2={xPos(hover.index)} y1={m.t} y2={m.t + ph} className="viz-crosshair" />
        ) : null}
        {marks}
        {hot}
        <rect
          x={m.l}
          y={m.t}
          width={pw}
          height={ph}
          fill="transparent"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover ? createPortal(<ChartTooltip tip={buildTip(spec, visible, hover.index, dict.blocks.chart.total)} x={hover.x} y={hover.y} />, document.body) : null}
    </>
  );
}

/* ============================================================ 图例 / 表格 */

function Legend({
  spec,
  hidden,
  onToggle,
}: {
  spec: ChartSpec;
  hidden: Set<string>;
  onToggle: (name: string) => void;
}) {
  const { dict } = useLocale();
  const keyShape = spec.type === "line" ? "line" : "rect";
  return (
    <div className="viz-legend" role="group" aria-label={dict.blocks.chart.legend}>
      {spec.series.map((s) => {
        const on = !hidden.has(s.name);
        return (
          <button key={s.name} type="button" className="viz-lg-item" aria-pressed={on} onClick={() => onToggle(s.name)}>
            <span
              className={keyShape === "rect" ? "viz-lg-key viz-lg-key--rect" : "viz-lg-key viz-lg-key--line"}
              style={{ background: keyShape === "rect" ? s.color : undefined, borderTopColor: keyShape === "line" ? s.color : undefined }}
            />
            <span>{s.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChartTable({ spec }: { spec: ChartSpec }) {
  const { dict } = useLocale();
  const caption = spec.unit
    ? interpolate(dict.blocks.chart.tableCaptionWithUnit, { title: spec.title, unit: spec.unit })
    : interpolate(dict.blocks.chart.tableCaption, { title: spec.title });
  return (
    <div className="viz-table-wrap">
      <table className="viz-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{dict.blocks.chart.seriesColumn}</th>
            {spec.x.map((x) => (
              <th key={x} scope="col">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spec.series.map((s) => (
            <tr key={s.name}>
              <td>
                <span className="viz-swatch" style={{ background: s.color }} />
                {s.name}
              </td>
              {s.data.map((v, i) => (
                <td key={i}>{formatNumber(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================ 图表卡 */

type ChartView = "chart" | "table" | "code";

function ChartCard({ spec, source }: { spec: ChartSpec; source: string }) {
  const { dict } = useLocale();
  const [view, setView] = useState<ChartView>("chart");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const [csvFlash, setCsvFlash] = useState(false);

  const visible = useMemo(() => spec.series.filter((s) => !hidden.has(s.name)), [spec, hidden]);

  const toggle = (name: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else if (spec.series.length - next.size > 1) next.add(name); // 至少留一条
      return next;
    });
  };

  const copyCsv = async () => {
    try {
      await navigator.clipboard.writeText(specToCsv(spec, dict.blocks.chart.seriesColumn));
      setCsvFlash(true);
      window.setTimeout(() => setCsvFlash(false), 1200);
    } catch {
      /* 静默 */
    }
  };

  const typeLabel = spec.type === "line" ? "line" : spec.type === "stack" ? "stacked bar" : "bar";
  const foot = (
    <>
      {spec.source
        ? <span>{interpolate(dict.blocks.chart.sourceFrom, { source: spec.source })}</span>
        : <span>{dict.blocks.chart.sampleData}</span>}
      {spec.evidence.map((n) => (
        <sup key={n} className="viz-cite">
          [{n}]
        </sup>
      ))}
    </>
  );

  return (
    <>
      <VizCard
        overline={`${typeLabel}${spec.source ? ` · ${spec.source}` : ""}`}
        title={spec.title}
        sub={spec.sub}
        tools={
          <>
            <Seg
              ariaLabel={dict.blocks.rich.viewSwitch}
              value={view}
              onChange={setView}
              options={[
                { value: "chart", label: dict.blocks.chart.viewChart },
                { value: "table", label: dict.blocks.chart.viewTable },
                { value: "code", label: dict.blocks.chart.viewCode },
              ]}
            />
            <TBtn onClick={copyCsv} title={csvFlash ? dict.blocks.chart.copiedCsv : dict.blocks.chart.copyCsv}>
              <Table2 className="size-3.5" aria-hidden />
            </TBtn>
            <TBtn onClick={() => setExpanded(true)} title={dict.blocks.rich.expand}>
              <Maximize2 className="size-3.5" aria-hidden />
            </TBtn>
          </>
        }
        foot={foot}
      >
        {view === "code" ? (
          <CodeView source={source} lang="chart" />
        ) : view === "table" ? (
          <ChartTable spec={spec} />
        ) : (
          <>
            <ChartPlot spec={spec} visible={visible} width={640} height={300} />
            <Legend spec={spec} hidden={hidden} onToggle={toggle} />
          </>
        )}
      </VizCard>

      <ContentModal
        open={expanded}
        onOpenChange={setExpanded}
        overline={`${typeLabel}${spec.source ? ` · ${spec.source}` : ""}`}
        title={spec.sub ? `${spec.title} · ${spec.sub}` : spec.title}
        actionLabel={dict.blocks.chart.downloadCsv}
        onAction={() => downloadCsv(spec, dict.blocks.chart.seriesColumn)}
      >
        <ChartPlot spec={spec} visible={visible} width={860} height={440} />
        <Legend spec={spec} hidden={hidden} onToggle={toggle} />
        <ChartTable spec={spec} />
      </ContentModal>
    </>
  );
}

/* ============================================================ 入口：流式闭合 → 解析 → 渲染 */

type ChartParseErrorCopy = BlocksDict["chart"]["parseErrors"];

/** 解析失败机器码 → 本地化一句（invalid-json 附带 JSON.parse 原始诊断）。 */
function parseErrorText(copy: ChartParseErrorCopy, error: ChartParseError): string {
  switch (error.reason) {
    case "invalid-json":
      return interpolate(copy.invalidJson, { detail: error.detail ?? "" });
    case "not-object":
      return copy.notObject;
    case "missing-x":
      return copy.missingX;
    case "missing-series":
      return copy.missingSeries;
    case "invalid-series":
      return copy.invalidSeries;
  }
}

export function ChartBlock({ source, closed }: { source: string; closed: boolean }) {
  const { dict } = useLocale();
  // 围栏未闭合：源码流入（所见即代码）。
  if (!closed) return <CodeView source={source} lang="chart" />;

  const { spec, error } = parseChartSpec(source, dict.blocks.chart.title);
  if (!spec) {
    // 渲染失败：降级源码 + 错误提示，内容永不被 gate。
    const note = error ? parseErrorText(dict.blocks.chart.parseErrors, error) : "";
    return (
      <div className="viz-fallback">
        <div className="viz-fallback__note" role="alert">
          {interpolate(dict.blocks.chart.renderFailed, { error: note })}
        </div>
        <CodeView source={source} lang="chart" />
      </div>
    );
  }
  return <ChartCard spec={spec} source={source} />;
}
