import { type ReactNode, useMemo } from "react";

import { isRichFenceLang } from "../components/blocks/rich-content.js";
import { renderRichFence } from "../components/blocks/richFence.js";

/**
 * 轻量流式 Markdown 渲染器（原型级，零依赖）。
 *
 * 覆盖 agent 常见输出：标题 / 段落 / 有序无序列表 / 粗体斜体行内代码 /
 * 代码块 / 表格 / 链接，以及本产品特有的 `[n]` 引用角标。
 * 对"正在到达"的半截语法（未闭合围栏、只有表头的表格）做容错。
 *
 * 生产可替换为 react-markdown + remark-gfm + shiki；行内 `[n]` 角标
 * 作为 remark 插件保留即可。
 *
 * `[n]` 角标经 renderCitation 分流（运行时间线由调用方接 EvidenceMarker，
 * 无 RunStore 场景沿用默认纯角标）；富围栏分流到 components/blocks/richFence。
 */

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; code: string; lang?: string | undefined; closed: boolean }
  | { type: "table"; header: string[]; rows: string[][] };

const isBlank = (l: string) => l.trim() === "";
const headingRe = /^(#{1,6})\s+(.*)$/;
const ulRe = /^\s*[-*]\s+(.*)$/;
const olRe = /^\s*\d+\.\s+(.*)$/;
const isTableRow = (l: string) => l.trim().startsWith("|");
const isSepRow = (l: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l) && l.includes("-");

function splitCells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function parseBlocks(src: string): Block[] {
  const lines = src.split("\n");
  const at = (k: number): string => lines[k] ?? "";
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = at(i);

    // 代码围栏。closed 标记收尾围栏是否已到达：富内容据此决定「源码流入」还是「尝试渲染」。
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const buf: string[] = [];
      i += 1;
      let closed = false;
      while (i < lines.length) {
        if (at(i).trim().startsWith("```")) {
          closed = true;
          i += 1; // 跳过收尾围栏
          break;
        }
        buf.push(at(i));
        i += 1;
      }
      blocks.push({ type: "code", code: buf.join("\n"), lang: lang || undefined, closed });
      continue;
    }

    if (isBlank(line)) {
      i += 1;
      continue;
    }

    const heading = headingRe.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: (heading[1] ?? "").length, text: heading[2] ?? "" });
      i += 1;
      continue;
    }

    // 表格：连续 | 行，且第二行是分隔行
    if (isTableRow(line)) {
      const group: string[] = [];
      while (i < lines.length && isTableRow(at(i))) {
        group.push(at(i));
        i += 1;
      }
      if (group.length >= 2 && isSepRow(group[1] ?? "")) {
        const header = splitCells(group[0] ?? "");
        const rows = group.slice(2).filter((r) => !isSepRow(r)).map(splitCells);
        blocks.push({ type: "table", header, rows });
      } else {
        // 尚未成表（流式中间态）→ 暂作段落
        blocks.push({ type: "p", text: group.join(" ") });
      }
      continue;
    }

    // 列表
    if (ulRe.test(line) || olRe.test(line)) {
      const ordered = olRe.test(line);
      const re = ordered ? olRe : ulRe;
      const items: string[] = [];
      while (i < lines.length && re.test(at(i))) {
        const m = re.exec(at(i));
        items.push(m?.[1] ?? "");
        i += 1;
      }
      blocks.push({ type: ordered ? "ol" : "ul", items });
      continue;
    }

    // 段落（合并连续普通行）
    const buf: string[] = [];
    while (
      i < lines.length &&
      !isBlank(at(i)) &&
      !headingRe.test(at(i)) &&
      !isTableRow(at(i)) &&
      !ulRe.test(at(i)) &&
      !olRe.test(at(i)) &&
      !at(i).trim().startsWith("```")
    ) {
      buf.push(at(i));
      i += 1;
    }
    blocks.push({ type: "p", text: buf.join(" ") });
  }
  return blocks;
}

interface InlinePattern {
  re: RegExp;
  render: (m: RegExpExecArray, key: string, rc: (n: number) => ReactNode) => ReactNode;
}

const inlinePatterns: InlinePattern[] = [
  { re: /`([^`]+)`/, render: (m, k) => <code key={k} className="agent-md-code">{m[1] ?? ""}</code> },
  { re: /\*\*([^*]+)\*\*/, render: (m, k) => <strong key={k}>{m[1] ?? ""}</strong> },
  {
    re: /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/,
    render: (m, k) => (
      <a key={k} href={m[2] ?? "#"} target="_blank" rel="noreferrer" className="agent-md-link">{m[1] ?? ""}</a>
    ),
  },
  { re: /\[(\d+)\]/, render: (m, k, rc) => <span key={k}>{rc(Number(m[1] ?? "0"))}</span> },
  { re: /\*([^*]+)\*/, render: (m, k) => <em key={k}>{m[1] ?? ""}</em> },
];

/**
 * 流式容错：隐藏"尚未闭合"的行内标记，避免 `**粗体**` 打到一半（`**粗体*`）
 * 时短暂被误解析为斜体或漏出星号。配对完整时此函数不改变文本（幂等）。
 */
function hideDangling(input: string): string {
  let t = input;
  const strip = (re: RegExp, token: string) => {
    const count = (t.match(re) ?? []).length;
    if (count % 2 === 1) {
      const idx = t.lastIndexOf(token);
      if (idx >= 0) t = t.slice(0, idx) + t.slice(idx + token.length);
    }
  };
  strip(/\*\*/g, "**");
  strip(/\*/g, "*");
  strip(/`/g, "`");
  return t;
}

function renderInline(rawText: string, keyBase: string, rc: (n: number) => ReactNode): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = hideDangling(rawText);
  let n = 0;
  while (rest.length) {
    let best: { index: number; len: number; node: ReactNode } | null = null;
    for (const p of inlinePatterns) {
      const m = p.re.exec(rest);
      if (m && (best === null || m.index < best.index)) {
        best = { index: m.index, len: (m[0] ?? "").length, node: p.render(m, `${keyBase}-${n}`, rc) };
      }
    }
    if (!best) {
      nodes.push(rest);
      break;
    }
    if (best.index > 0) nodes.push(rest.slice(0, best.index));
    nodes.push(best.node);
    rest = rest.slice(best.index + best.len);
    n += 1;
  }
  return nodes;
}

function defaultCitation(n: number): ReactNode {
  return <sup className="agent-cite">[{n}]</sup>;
}

export function StreamingMarkdown({
  text,
  renderCitation = defaultCitation,
}: {
  text: string;
  renderCitation?: (n: number) => ReactNode;
}) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <div className="agent-md">
      {blocks.map((b, i) => {
        const key = `b${i}`;
        switch (b.type) {
          case "heading": {
            const Tag = `h${Math.min(b.level + 2, 6)}` as "h3";
            return <Tag key={key} className="agent-md-h">{renderInline(b.text, key, renderCitation)}</Tag>;
          }
          case "p":
            return <p key={key}>{renderInline(b.text, key, renderCitation)}</p>;
          case "ul":
            return (
              <ul key={key} className="agent-md-ul">
                {b.items.map((it, j) => <li key={j}>{renderInline(it, `${key}-${j}`, renderCitation)}</li>)}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="agent-md-ol">
                {b.items.map((it, j) => <li key={j}>{renderInline(it, `${key}-${j}`, renderCitation)}</li>)}
              </ol>
            );
          case "code":
            // 富内容围栏（chart/mermaid/svg/html）→ 交给富块渲染器；其余保持普通代码块。
            if (isRichFenceLang(b.lang)) {
              return renderRichFence(b.lang, b.code, b.closed, key);
            }
            return (
              <pre key={key} className="agent-md-pre"><code>{b.code}</code></pre>
            );
          case "table":
            return (
              <div key={key} className="agent-md-table-wrap">
                <table className="agent-md-table">
                  <thead>
                    <tr>{b.header.map((h, j) => <th key={j}>{renderInline(h, `${key}-h${j}`, renderCitation)}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r}>{row.map((c, j) => <td key={j}>{renderInline(c, `${key}-${r}-${j}`, renderCitation)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
