/**
 * pages/docs/InstallationPage.tsx —— 文档 · 安装页（/docs/installation）。
 *
 * 安装命令（+ pnpm workspace 引用备注）、独立样式入口、最小可粘贴
 * 示例（createRunStore + buildScenarios + createRunPlayer + RunTimeline 完整片段）。
 * 代码块用库 CodeView（语言角标 + 一键复制），文案走字典 site.docs.installation 域。
 */

import { CodeView } from "@aidenhoey/agent-ui";
import { useDemoLocale } from "@aidenhoey/agent-ui/mock";

const INSTALL_SNIPPET = "pnpm add @aidenhoey/agent-ui";

const STYLES_SNIPPET = `import "@aidenhoey/agent-ui/styles.css";`;

const EXAMPLE_SNIPPET = `import { useEffect, useMemo } from "react";

import {
  createRunStore,
  LocaleProvider,
  RunStoreContext,
  RunTimeline,
} from "@aidenhoey/agent-ui";
import { buildScenarios, createRunPlayer, dictionaries } from "@aidenhoey/agent-ui/mock";
import "@aidenhoey/agent-ui/styles.css";

const locale = "zh-CN";

export function RunDemo() {
  const store = useMemo(
    () => createRunStore({ toolCopy: dictionaries[locale].blocks.tool }),
    [],
  );

  useEffect(() => {
    const scenario = buildScenarios(locale).find((s) => s.id === "success");
    if (!scenario) return;
    const player = createRunPlayer(store, scenario.steps);
    player.play();
    return () => player.stop();
  }, [store]);

  return (
    <LocaleProvider locale={locale}>
      <RunStoreContext.Provider value={store}>
        <RunTimeline
          readOnly
          onOpenArtifact={() => {}}
          onSubmitInterrupt={() => {}}
          onRetry={() => {}}
          onBranch={() => {}}
        />
      </RunStoreContext.Provider>
    </LocaleProvider>
  );
}
`;

export function InstallationPage() {
  const { dict } = useDemoLocale();
  const t = dict.site.docs.installation;

  return (
    <section className="docs-page" aria-labelledby="installation-title">
      <h1 id="installation-title">{t.title}</h1>
      <p className="docs-page__desc">{t.description}</p>

      <section className="doc-section" aria-labelledby="installation-install">
        <h2 id="installation-install">{t.installTitle}</h2>
        <p>{t.installBody}</p>
        <CodeView source={INSTALL_SNIPPET} lang="bash" />
        <p className="doc-note">{t.workspaceNote}</p>
      </section>

      <section className="doc-section" aria-labelledby="installation-styles">
        <h2 id="installation-styles">{t.stylesTitle}</h2>
        <p>{t.stylesBody}</p>
        <CodeView source={STYLES_SNIPPET} lang="css" />
      </section>

      <section className="doc-section" aria-labelledby="installation-example">
        <h2 id="installation-example">{t.exampleTitle}</h2>
        <p>{t.exampleBody}</p>
        <CodeView source={EXAMPLE_SNIPPET} lang="tsx" />
      </section>
    </section>
  );
}
