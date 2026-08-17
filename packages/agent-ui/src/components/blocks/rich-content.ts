/**
 * 富内容块的共享模型与安全工具（与 React 无关的纯逻辑）。
 *
 * 富内容以 ```lang 围栏承载（chart / mermaid / svg / html），由 StreamingMarkdown 在渲染层
 * 识别、交给 renderRichFence 分发。此模块集中：图表 spec 解析与归一、系列色板、CSV 导出、
 * SVG 允许列表消毒、HTML 沙箱包裹。信任分级：chart 声明式 spec > svg sanitize > html iframe。
 *
 * 与 SRC 的差异（文案零硬编码改造）：parseChartSpec 的默认标题、specToCsv 的「系列」表头
 * 改为调用方传入（组件层取字典）；解析失败只返回机器码（ChartParseError.reason），
 * 由 ChartBlock 经 dict.blocks.chart.parseErrors 映射为本地化文案后展示。
 */

export const RICH_FENCE_LANGS = ["chart", "mermaid", "svg", "html"] as const;
export type RichFenceLang = (typeof RICH_FENCE_LANGS)[number];

export function isRichFenceLang(lang: string | undefined): lang is RichFenceLang {
  return lang !== undefined && (RICH_FENCE_LANGS as readonly string[]).includes(lang);
}

/** 图表系列色板 —— 引用 tokens.css 的 --viz-* 语义色，深浅主题各自选定。 */
export const VIZ_PALETTE = [
  "var(--viz-s1)",
  "var(--viz-s2)",
  "var(--viz-s3)",
  "var(--viz-s4)",
  "var(--viz-s5)",
  "var(--viz-s6)",
] as const;

/* ============================================================ 图表 spec */

export type ChartType = "line" | "bar" | "stack";

export interface ChartSeriesInput {
  name: string;
  data: number[];
  color?: string | undefined;
}
export interface ChartSpecInput {
  type?: ChartType | undefined;
  title?: string | undefined;
  sub?: string | undefined;
  unit?: string | undefined;
  x: string[];
  series: ChartSeriesInput[];
  yMax?: number | undefined;
  yTicks?: number[] | undefined;
  source?: string | undefined;
  evidence?: number[] | undefined;
}

/** 归一后的图表 spec —— 渲染器只认这个：色板已分配、坐标轴已算好。 */
export interface ChartSeries {
  name: string;
  data: number[];
  color: string;
}
export interface ChartSpec {
  type: ChartType;
  title: string;
  sub?: string | undefined;
  unit: string;
  x: string[];
  series: ChartSeries[];
  yMax: number;
  yTicks: number[];
  source?: string | undefined;
  evidence: number[];
}

/** 解析失败的机器码；组件层按 dict.blocks.chart.parseErrors 映射为本地化文案。 */
export type ChartParseErrorReason =
  | "invalid-json"
  | "not-object"
  | "missing-x"
  | "missing-series"
  | "invalid-series";

export interface ChartParseError {
  reason: ChartParseErrorReason;
  /** 仅 invalid-json 携带：JSON.parse 的原始诊断（机器串，随 invalidJson 模板插值展示）。 */
  detail?: string | undefined;
}

export interface ChartParseResult {
  spec?: ChartSpec | undefined;
  error?: ChartParseError | undefined;
}

/** 取「好看」的整刻度（1 / 2 / 5 × 10ⁿ）。 */
function niceNum(range: number, round: boolean): number {
  if (range <= 0 || !Number.isFinite(range)) return 1;
  const exp = Math.floor(Math.log10(range));
  const frac = range / 10 ** exp;
  let nice: number;
  if (round) nice = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
  else nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nice * 10 ** exp;
}

/** 由峰值推导 yMax 与刻度数组（约 4 段）。 */
function computeAxis(peak: number): { yMax: number; yTicks: number[] } {
  const safePeak = peak > 0 && Number.isFinite(peak) ? peak : 1;
  const range = niceNum(safePeak, false);
  const step = niceNum(range / 3, true);
  const yMax = Math.max(step, Math.ceil(safePeak / step) * step);
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax + step * 1e-6; v += step) yTicks.push(Number(v.toFixed(6)));
  return { yMax, yTicks };
}

/**
 * 解析并归一图表 spec。只在围栏闭合后调用；容错返回 { error }（机器码，文案由组件层
 * 经字典映射），由卡片降级为源码视图。
 * fallbackTitle：spec 缺省标题时的占位文案（组件层传字典值；SRC 原硬编码「数据图表」）。
 */
export function parseChartSpec(source: string, fallbackTitle: string): ChartParseResult {
  let raw: ChartSpecInput;
  try {
    raw = JSON.parse(source) as ChartSpecInput;
  } catch (e) {
    return { error: { reason: "invalid-json", detail: (e as Error).message } };
  }
  if (!raw || typeof raw !== "object") return { error: { reason: "not-object" } };
  if (!Array.isArray(raw.x) || raw.x.length === 0) return { error: { reason: "missing-x" } };
  if (!Array.isArray(raw.series) || raw.series.length === 0) return { error: { reason: "missing-series" } };
  for (const s of raw.series) {
    if (!s || typeof s.name !== "string" || !Array.isArray(s.data)) {
      return { error: { reason: "invalid-series" } };
    }
  }

  const type: ChartType =
    raw.type === "bar" || raw.type === "stack" || raw.type === "line" ? raw.type : "line";
  const series: ChartSeries[] = raw.series.map((s, i) => ({
    name: s.name,
    data: s.data.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : 0)),
    color: s.color ?? VIZ_PALETTE[i % VIZ_PALETTE.length]!,
  }));

  const peak =
    type === "stack"
      ? Math.max(...raw.x.map((_, i) => series.reduce((a, s) => a + (s.data[i] ?? 0), 0)))
      : Math.max(...series.flatMap((s) => (s.data.length ? s.data : [0])));
  const auto = computeAxis(peak);
  const yMax = raw.yMax && raw.yMax > 0 ? raw.yMax : auto.yMax;
  const yTicks = raw.yTicks && raw.yTicks.length ? raw.yTicks : auto.yTicks;

  return {
    spec: {
      type,
      title: raw.title ?? fallbackTitle,
      sub: raw.sub,
      unit: raw.unit ?? "",
      x: raw.x,
      series,
      yMax,
      yTicks,
      source: raw.source,
      evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
    },
  };
}

/** 数值展示：整数带千分位，小数保留一位（比例/读数场景）。 */
export function formatNumber(v: number): string {
  return Number.isInteger(v) ? v.toLocaleString("en-US") : v.toFixed(1);
}

/** seriesHeader：CSV 首列表头文案（组件层传字典值；SRC 原硬编码「系列」）。 */
export function specToCsv(spec: ChartSpec, seriesHeader: string): string {
  const head = [seriesHeader, ...spec.x].join(",");
  const rows = spec.series.map((s) => [s.name, ...s.data.map((v) => String(v))].join(","));
  return [head, ...rows].join("\n");
}

/** 导出 CSV（带 BOM，Excel 中文不乱码）。 */
export function downloadCsv(spec: ChartSpec, seriesHeader: string): void {
  const blob = new Blob(["﻿" + specToCsv(spec, seriesHeader)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${spec.title || "chart"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ============================================================ SVG 消毒 */

const SVG_TAG_ALLOW = new Set([
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "text", "tspan", "textpath", "defs", "marker", "lineargradient", "radialgradient",
  "stop", "clippath", "mask", "use", "title", "desc", "symbol", "pattern",
]);
const SVG_ATTR_ALLOW = new Set([
  "viewbox", "xmlns", "xmlns:xlink", "preserveaspectratio", "width", "height",
  "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "d", "points", "dx", "dy",
  "transform", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
  "stroke-dasharray", "stroke-dashoffset", "stroke-opacity", "fill-opacity", "fill-rule",
  "opacity", "class", "id", "text-anchor", "dominant-baseline", "alignment-baseline",
  "font-size", "font-family", "font-weight", "font-style", "letter-spacing",
  "offset", "stop-color", "stop-opacity", "gradientunits", "gradienttransform",
  "spreadmethod", "marker-start", "marker-mid", "marker-end", "markerwidth", "markerheight",
  "refx", "refy", "orient", "markerunits", "patternunits", "patterncontentunits",
  "clip-path", "clippathunits", "mask", "maskunits", "role", "focusable", "text-decoration",
]);

/**
 * SVG 允许列表消毒：DOMParser 解析 → 递归剔除非白名单元素（含 script / foreignObject / style）、
 * 事件属性（on*）、外链 href、危险 style，最后序列化回字符串。
 * 无法解析或非 svg 根返回 null，由卡片降级为源码视图。
 * （生产可平替 DOMPurify；此处自包含、无网络依赖。）
 */
export function sanitizeSvg(src: string): string | null {
  if (typeof DOMParser === "undefined") return null;
  const trimmed = src.trim();
  if (!trimmed.toLowerCase().startsWith("<svg")) return null;
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(trimmed, "image/svg+xml");
  } catch {
    return null;
  }
  if (doc.getElementsByTagName("parsererror").length > 0) return null;
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg") return null;
  try {
    cleanSvgElement(root);
  } catch {
    return null;
  }
  return new XMLSerializer().serializeToString(root);
}

function cleanSvgElement(el: Element): void {
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on")) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (name === "href" || name === "xlink:href") {
      if (!attr.value.trim().startsWith("#")) el.removeAttribute(attr.name); // 只允许片段引用
      continue;
    }
    if (name === "style") {
      if (/url\s*\(|expression|javascript:|@import/i.test(attr.value)) el.removeAttribute(attr.name);
      continue;
    }
    if (name.startsWith("aria-") || name.startsWith("data-")) continue;
    if (!SVG_ATTR_ALLOW.has(name)) el.removeAttribute(attr.name);
  }
  for (const child of Array.from(el.children)) {
    if (!SVG_TAG_ALLOW.has(child.tagName.toLowerCase())) {
      child.remove();
      continue;
    }
    cleanSvgElement(child);
  }
}

/* ============================================================ HTML 沙箱包裹 */

const HTML_BASE_STYLE = `
:root{color-scheme:light dark}
html[data-theme=light]{color-scheme:light}
html[data-theme=dark]{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;padding:10px 12px;background:transparent;
  font:14px/1.6 system-ui,-apple-system,"Segoe UI","PingFang SC","Hiragino Sans GB",sans-serif;
  color:light-dark(#201f1d,#e9e8e6)}
a{color:light-dark(#19559a,#98cbff)}
button{font:inherit;cursor:pointer}
input,select,textarea{font:inherit;accent-color:light-dark(#1b5aa4,#3987e5)}
`;

/**
 * 把 agent 输出的 HTML 片段包成沙箱 iframe 的 srcdoc，并注入当前主题。
 * 片段（无 <html>）会补上基础 token 样式与透明背景；完整文档尽力注入 data-theme。
 */
export function wrapHtml(source: string, theme: "light" | "dark"): string {
  const hasDocument = /<!doctype|<html[\s>]/i.test(source);
  if (hasDocument) {
    if (/<html[^>]*\sdata-theme=/i.test(source)) {
      return source.replace(/(<html[^>]*\sdata-theme=)(["'])[^"']*\2/i, `$1$2${theme}$2`);
    }
    return source.replace(/<html/i, `<html data-theme="${theme}"`);
  }
  return (
    `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8">` +
    `<style>${HTML_BASE_STYLE}</style></head><body>${source}</body></html>`
  );
}
