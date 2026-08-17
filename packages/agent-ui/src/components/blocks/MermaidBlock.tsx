import { Copy, Maximize2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useLocale } from "../../i18n/locale-context.js";
import { CodeView } from "../shared/CodeView.js";
import { ContentModal } from "../ContentModal.js";
import { Seg, TBtn, VizCard } from "./viz-card.js";

/**
 * 内置轻量 Mermaid flowchart 渲染器 —— 覆盖常见的 `flowchart|graph <DIR>` + 节点形状 + 带标签边，
 * 用分层（longest-path）布局直出 SVG，全程无网络、无重依赖。无法解析或规模过大时降级源码。
 * （信任分级：本地已验证渲染器；生产可平替打包的 mermaid.js。）
 */

type NodeShape = "rect" | "round" | "stadium" | "diamond" | "circle";
interface MNode {
  id: string;
  label: string;
  shape: NodeShape;
}
interface MEdge {
  from: string;
  to: string;
  label: string;
}
interface ParsedGraph {
  nodes: Map<string, MNode>;
  edges: MEdge[];
  horizontal: boolean;
  reversed: boolean;
}

const EDGE_SPLIT = /(-\.->|-->|==>|===|---|-\.-)/;

function stripLabel(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .trim();
}

function extractNode(spec: string, nodes: Map<string, MNode>): string | null {
  const s = spec.trim();
  if (!s) return null;
  const m = s.match(
    /^([A-Za-z0-9_]+)\s*(?:\[\[(.*?)\]\]|\(\((.*?)\)\)|\(\[(.*?)\]\)|\{\{(.*?)\}\}|\{(.*?)\}|\[(.*?)\]|\((.*?)\))?/,
  );
  if (!m || !m[1]) return null;
  const id = m[1];
  let label = id;
  let shape: NodeShape = "rect";
  const hasShape = m[2] !== undefined || m[3] !== undefined || m[4] !== undefined || m[5] !== undefined || m[6] !== undefined || m[7] !== undefined || m[8] !== undefined;
  if (m[2] !== undefined) { label = m[2]; shape = "rect"; } // [[ ]] 子程序
  else if (m[3] !== undefined) { label = m[3]; shape = "circle"; } // (( ))
  else if (m[4] !== undefined) { label = m[4]; shape = "stadium"; } // ([ ])
  else if (m[5] !== undefined) { label = m[5]; shape = "diamond"; } // {{ }} 六边形→菱形
  else if (m[6] !== undefined) { label = m[6]; shape = "diamond"; } // { }
  else if (m[7] !== undefined) { label = m[7]; shape = "rect"; } // [ ]
  else if (m[8] !== undefined) { label = m[8]; shape = "round"; } // ( )
  label = stripLabel(label) || id;

  const existing = nodes.get(id);
  if (!existing) nodes.set(id, { id, label, shape });
  else if (hasShape) { existing.label = label; existing.shape = shape; }
  return id;
}

function parseMermaid(source: string): ParsedGraph | null {
  const lines = source
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("%%"));
  if (lines.length === 0) return null;

  let horizontal = false;
  let reversed = false;
  let start = 0;
  const header = lines[0]!.match(/^(?:flowchart|graph)\s+(LR|RL|TB|TD|BT)\b/i);
  if (header) {
    const dir = header[1]!.toUpperCase();
    horizontal = dir === "LR" || dir === "RL";
    reversed = dir === "RL" || dir === "BT";
    start = 1;
  } else if (/^(?:flowchart|graph)\b/i.test(lines[0]!)) {
    start = 1; // 无方向 → 默认 TD
  }

  const nodes = new Map<string, MNode>();
  const edges: MEdge[] = [];
  for (let i = start; i < lines.length; i++) {
    let line = lines[i]!.replace(/;+\s*$/, "");
    if (!line) continue;
    // 归一 "A -- 文本 --> B" → "A -->|文本| B"
    line = line.replace(/--\s+([^|>]+?)\s+-->/g, (_, t: string) => `-->|${t.trim()}|`);

    if (!EDGE_SPLIT.test(line)) {
      extractNode(line, nodes); // 独立节点定义
      continue;
    }
    const parts = line.split(EDGE_SPLIT);
    let prev = extractNode(parts[0] ?? "", nodes);
    for (let k = 1; k < parts.length; k += 2) {
      let chunk = parts[k + 1] ?? "";
      let label = "";
      const lm = chunk.match(/^\s*\|([^|]*)\|\s*/);
      if (lm) {
        label = stripLabel(lm[1] ?? "");
        chunk = chunk.slice(lm[0].length);
      }
      const cur = extractNode(chunk, nodes);
      if (prev && cur) edges.push({ from: prev, to: cur, label });
      prev = cur;
    }
  }

  if (nodes.size === 0 || nodes.size > 60) return null;
  return { nodes, edges, horizontal, reversed };
}

/* ============================================================ 布局 */

interface Placed extends MNode {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}
interface RenderEdge {
  d: string;
  label: string;
  lx: number;
  ly: number;
}
interface Layout {
  nodes: Placed[];
  edges: RenderEdge[];
  width: number;
  height: number;
}

const NODE_H = 40;
const RANK_GAP = 62;
const NODE_GAP = 22;
const PAD = 16;

function labelWidth(label: string): number {
  let w = 0;
  for (const ch of label) w += /[一-鿿＀-￯]/.test(ch) ? 13.5 : ch === " " ? 4 : 7.6;
  return Math.max(74, Math.min(230, Math.round(w + 30)));
}

function computeLayout(graph: ParsedGraph): Layout | null {
  const { nodes, edges, horizontal, reversed } = graph;
  const ids = [...nodes.keys()];

  // 分层：最长路径。indegree 0 为根；有环时保底不无限迭代。
  const rank = new Map<string, number>();
  ids.forEach((id) => rank.set(id, 0));
  for (let pass = 0; pass < ids.length; pass++) {
    let changed = false;
    for (const e of edges) {
      const rf = rank.get(e.from) ?? 0;
      const rt = rank.get(e.to) ?? 0;
      if (rt < rf + 1) {
        rank.set(e.to, rf + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const maxRank = Math.max(0, ...ids.map((id) => rank.get(id) ?? 0));

  // 按 rank 分组（保持插入顺序）。
  const byRank: string[][] = Array.from({ length: maxRank + 1 }, () => []);
  ids.forEach((id) => byRank[rank.get(id) ?? 0]!.push(id));

  // 节点尺寸。
  const size = new Map<string, { w: number; h: number }>();
  nodes.forEach((nd) => {
    let w = labelWidth(nd.label);
    let h = NODE_H;
    if (nd.shape === "diamond") { w = Math.round(w * 1.25); h = NODE_H + 14; }
    if (nd.shape === "circle") { const d = Math.max(w, NODE_H + 20); w = d; h = d; }
    size.set(nd.id, { w, h });
  });

  const mainSize = (id: string) => (horizontal ? size.get(id)!.w : size.get(id)!.h);
  const crossSize = (id: string) => (horizontal ? size.get(id)!.h : size.get(id)!.w);

  // main 轴：每 rank 槽位取该 rank 最大 main 尺寸，累加 + 间隙。
  const rankMain = byRank.map((r) => Math.max(0, ...r.map(mainSize)));
  const mainStart: number[] = [];
  let accMain = PAD;
  for (let r = 0; r <= maxRank; r++) {
    mainStart[r] = accMain;
    accMain += rankMain[r]! + RANK_GAP;
  }
  const totalMain = accMain - RANK_GAP + PAD;

  // cross 轴：每 rank 内堆叠，最后整体居中。
  const rankCrossExtent = byRank.map((r) => r.reduce((a, id) => a + crossSize(id) + NODE_GAP, -NODE_GAP));
  const maxCross = Math.max(0, ...rankCrossExtent);

  const placed: Placed[] = [];
  for (let r = 0; r <= maxRank; r++) {
    const effRank = reversed ? maxRank - r : r;
    let cross = PAD + (maxCross - rankCrossExtent[r]!) / 2;
    for (const id of byRank[r]!) {
      const nd = nodes.get(id)!;
      const { w, h } = size.get(id)!;
      const mainCenter = mainStart[effRank]! + rankMain[effRank]! / 2;
      const crossCenter = cross + crossSize(id) / 2;
      const cx = horizontal ? mainCenter : crossCenter;
      const cy = horizontal ? crossCenter : mainCenter;
      placed.push({ ...nd, x: cx - w / 2, y: cy - h / 2, w, h, cx, cy });
      cross += crossSize(id) + NODE_GAP;
    }
  }

  const width = (horizontal ? totalMain : maxCross + PAD * 2) || 200;
  const height = (horizontal ? maxCross + PAD * 2 : totalMain) || 120;

  const byId = new Map(placed.map((p) => [p.id, p]));
  const renderEdges: RenderEdge[] = [];
  for (const e of edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    // 依方向选择连接边（source 出、target 入）。
    let sx: number, sy: number, tx: number, ty: number, c1x: number, c1y: number, c2x: number, c2y: number;
    if (horizontal) {
      const dir = b.cx >= a.cx ? 1 : -1;
      sx = a.cx + dir * (a.w / 2); sy = a.cy;
      tx = b.cx - dir * (b.w / 2); ty = b.cy;
      const mid = (sx + tx) / 2;
      c1x = mid; c1y = sy; c2x = mid; c2y = ty;
    } else {
      const dir = b.cy >= a.cy ? 1 : -1;
      sx = a.cx; sy = a.cy + dir * (a.h / 2);
      tx = b.cx; ty = b.cy - dir * (b.h / 2);
      const mid = (sy + ty) / 2;
      c1x = sx; c1y = mid; c2x = tx; c2y = mid;
    }
    renderEdges.push({
      d: `M${sx.toFixed(1)},${sy.toFixed(1)} C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`,
      label: e.label,
      lx: (sx + tx) / 2,
      ly: (sy + ty) / 2,
    });
  }

  return { nodes: placed, edges: renderEdges, width, height };
}

/* ============================================================ SVG */

function NodeShapeEl({ node }: { node: Placed }) {
  const tint = node.shape === "diamond" || node.shape === "circle";
  const fill = tint ? "var(--color-brand-tint)" : "var(--color-surface)";
  const stroke = tint ? "var(--color-brand)" : "var(--color-border)";
  if (node.shape === "diamond") {
    const pts = `${node.cx},${node.y} ${node.x + node.w},${node.cy} ${node.cx},${node.y + node.h} ${node.x},${node.cy}`;
    return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={1.2} />;
  }
  if (node.shape === "circle") {
    return <ellipse cx={node.cx} cy={node.cy} rx={node.w / 2} ry={node.h / 2} fill={fill} stroke={stroke} strokeWidth={1.2} />;
  }
  const rx = node.shape === "stadium" ? node.h / 2 : node.shape === "round" ? 14 : 8;
  return <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={rx} fill={fill} stroke={stroke} strokeWidth={1.2} />;
}

function MermaidSvg({ layout, markerId, ariaLabel }: { layout: Layout; markerId: string; ariaLabel: string }) {
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="viz-plot viz-mermaid"
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker id={markerId} viewBox="0 0 8 8" refX={7} refY={4} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-text-subtle)" />
        </marker>
      </defs>
      {layout.edges.map((e, i) => (
        <g key={i}>
          <path d={e.d} fill="none" stroke="var(--color-text-subtle)" strokeWidth={1.4} markerEnd={`url(#${markerId})`} />
          {e.label ? (
            <>
              <rect x={e.lx - e.label.length * 3.6 - 4} y={e.ly - 9} width={e.label.length * 7.2 + 8} height={17} rx={4} fill="var(--color-raised)" />
              <text x={e.lx} y={e.ly + 3.5} textAnchor="middle" className="viz-edge-label">
                {e.label}
              </text>
            </>
          ) : null}
        </g>
      ))}
      {layout.nodes.map((nd) => (
        <g key={nd.id}>
          <NodeShapeEl node={nd} />
          <text x={nd.cx} y={nd.cy + 4.5} textAnchor="middle" className="viz-node-label">
            {nd.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ============================================================ 卡片 */

let mermaidSeq = 0;

function MermaidCard({ source, layout }: { source: string; layout: Layout }) {
  const { dict } = useLocale();
  const [view, setView] = useState<"render" | "code">("render");
  const [expanded, setExpanded] = useState(false);
  const markerId = useMemo(() => `mmarr-${++mermaidSeq}`, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source);
    } catch {
      /* 静默 */
    }
  };

  return (
    <>
      <VizCard
        overline="mermaid · flowchart"
        title={dict.blocks.mermaid.title}
        tools={
          <>
            <Seg
              ariaLabel={dict.blocks.rich.viewSwitch}
              value={view}
              onChange={setView}
              options={[
                { value: "render", label: dict.blocks.mermaid.render },
                { value: "code", label: dict.blocks.mermaid.source },
              ]}
            />
            <TBtn onClick={copy} title={dict.blocks.mermaid.copySource}>
              <Copy className="size-3.5" aria-hidden />
            </TBtn>
            <TBtn onClick={() => setExpanded(true)} title={dict.blocks.rich.expand}>
              <Maximize2 className="size-3.5" aria-hidden />
            </TBtn>
          </>
        }
        foot={dict.blocks.mermaid.localRendererNote}
      >
        {view === "code" ? <CodeView source={source} lang="mermaid" /> : <MermaidSvg layout={layout} markerId={markerId} ariaLabel={dict.blocks.mermaid.title} />}
      </VizCard>

      <ContentModal
        open={expanded}
        onOpenChange={setExpanded}
        overline="mermaid · flowchart"
        title={dict.blocks.mermaid.title}
        actionLabel={dict.blocks.mermaid.modalCopySource}
        onAction={copy}
      >
        <MermaidSvg layout={layout} markerId={`${markerId}-lg`} ariaLabel={dict.blocks.mermaid.title} />
      </ContentModal>
    </>
  );
}

/* ============================================================ 入口 */

export function MermaidBlock({ source, closed }: { source: string; closed: boolean }) {
  const { dict } = useLocale();
  const layout = useMemo(() => {
    if (!closed) return null;
    try {
      const graph = parseMermaid(source);
      return graph ? computeLayout(graph) : null;
    } catch {
      return null;
    }
  }, [source, closed]);

  if (!closed) return <CodeView source={source} lang="mermaid" />;
  if (!layout || layout.nodes.length === 0) {
    return (
      <div className="viz-fallback">
        <div className="viz-fallback__note" role="alert">
          {dict.blocks.mermaid.renderFailed}
        </div>
        <CodeView source={source} lang="mermaid" />
      </div>
    );
  }
  return <MermaidCard source={source} layout={layout} />;
}
