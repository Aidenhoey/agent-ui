/**
 * pages/docs/IntroductionPage.tsx —— 文档 · 介绍页（/docs/introduction）。
 *
 * 库定位段落 + 架构流程图（wire 事件 → reduceEvent → RunViewState → 组件，节点为
 * 真实代码标识符（两 locale 同值），caption 双语）+ 八种 wire 块类型 → 视图组件映射表。
 * 全部文案走字典 site.docs.introduction 域。
 */

import { useDemoLocale } from "@aidenhoey/agent-ui/mock";

/** 架构流程图节点：code 为库内真实标识符，captionKey 索引字典 caption。 */
const ARCH_NODES = [
  { code: "run.started · block.* · run.completed", captionKey: "events" },
  { code: "reduceEvent", captionKey: "reducer" },
  { code: "RunViewState", captionKey: "state" },
  { code: "RunTimeline · renderBlock", captionKey: "components" },
] as const;

/** 映射表的行：kind / 组件名是代码标识符（两 locale 同值），说明文字走字典。 */
const BLOCK_ROWS = [
  { kind: "text", component: "TextBlock" },
  { kind: "tool", component: "ToolCallBlock" },
  { kind: "evidence", component: "EvidenceMarker + EvidenceList" },
  { kind: "artifact", component: "ArtifactCard" },
  { kind: "interrupt", component: "InterruptCard" },
  { kind: "reasoning", component: "ReasoningBlock" },
  { kind: "todo", component: "TodoPanel" },
  { kind: "sandbox", component: "SandboxBlock" },
] as const;

export function IntroductionPage() {
  const { dict } = useDemoLocale();
  const t = dict.site.docs.introduction;

  return (
    <section className="docs-page" aria-labelledby="introduction-title">
      <h1 id="introduction-title">{t.title}</h1>
      <p className="docs-page__desc">{t.description}</p>

      <section className="doc-section" aria-labelledby="introduction-overview">
        <h2 id="introduction-overview">{t.overviewTitle}</h2>
        <p>{t.overviewBody}</p>
      </section>

      <section className="doc-section" aria-labelledby="introduction-architecture">
        <h2 id="introduction-architecture">{t.architectureTitle}</h2>
        <p>{t.architectureBody}</p>
        <div className="doc-flow">
          {ARCH_NODES.map((node, index) => (
            <div className="doc-flow__item" key={node.captionKey}>
              {index > 0 ? (
                <span className="doc-flow__arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
              <div className="doc-flow__stage">
                <code className="doc-flow__node">{node.code}</code>
                <span className="doc-flow__caption">{t.architectureStages[node.captionKey]}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="doc-section" aria-labelledby="introduction-blocks">
        <h2 id="introduction-blocks">{t.blocksTitle}</h2>
        <p>{t.blocksBody}</p>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>{t.tableKind}</th>
                <th>{t.tableComponent}</th>
                <th>{t.tableDescription}</th>
              </tr>
            </thead>
            <tbody>
              {BLOCK_ROWS.map((row) => (
                <tr key={row.kind}>
                  <td>
                    <code>{row.kind}</code>
                  </td>
                  <td>
                    <code>{row.component}</code>
                  </td>
                  <td>{t.blockDescriptions[row.kind]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
