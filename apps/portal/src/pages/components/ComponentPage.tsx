/**
 * pages/components/ComponentPage.tsx —— 组件页（/components/:slug）数据驱动模板页。
 *
 * 结构：标题 + 一句话描述（dict.components.components[slug]）→ Preview|Code 选项卡 demo 卡
 * （Preview = live demo；Code = 该变体的构造源码串，CodeView 自带复制按钮）→ 工具行
 * （变体选择器 + ⟳ 重播 = key 重挂载重建 store）→ Installation（shadcn registry 命令复制块
 * + 即将支持说明）→ Usage（最小用法代码块）→ Props 简表（name/type/description，描述双语
 * 走 dict.components.props）→ Examples（其余变体平铺）。
 * demo 配置在同目录 registry.tsx；store 构造 / 截断 / 续播工具在 demo-utils.ts。
 */

import { useState } from "react";
import { useParams } from "react-router-dom";

import { CodeView, useLocale, type ComponentSlug } from "@diribo/agent-ui";

import { COMPONENT_ORDER } from "../../lib/components.js";
import { RotateCcw } from "../../lib/icons.js";
import { COMPONENT_REGISTRY, type ComponentVariant } from "./registry.js";

/** 变体标签文本（标签 + 可选标识符后缀）。 */
function useVariantLabel() {
  const { dict } = useLocale();
  const t = dict.components;
  return (variant: ComponentVariant) =>
    t.variants[variant.labelKey] + (variant.hint ? ` · ${variant.hint}` : "");
}

function ComponentDoc({ slug }: { slug: ComponentSlug }) {
  const { dict, locale } = useLocale();
  const t = dict.components;
  const entry = t.components[slug];
  const config = COMPONENT_REGISTRY[slug];
  const variantLabel = useVariantLabel();

  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [variantIndex, setVariantIndex] = useState(0);
  const [seed, setSeed] = useState(0);

  const variant = config.variants[variantIndex] ?? config.variants[0]!;
  const examples = config.variants.slice(1);
  const propsCopy = t.props[slug];

  return (
    <section className="docs-page comp-page" aria-labelledby="component-title">
      <h1 id="component-title">{entry.title}</h1>
      <p className="docs-page__desc">{entry.description}</p>

      <div className="comp-demo">
        <div className="comp-demo__bar">
          <div className="comp-tabs" role="tablist" aria-label={entry.title}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "preview"}
              className="comp-tabs__tab"
              onClick={() => setTab("preview")}
            >
              {t.labels.preview}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "code"}
              className="comp-tabs__tab"
              onClick={() => setTab("code")}
            >
              {t.labels.code}
            </button>
          </div>
          <div className="comp-demo__tools">
            <div className="comp-variants" aria-label={t.labels.variant}>
              {config.variants.map((item, index) => (
                <button
                  key={`${item.labelKey}:${index}`}
                  type="button"
                  className="comp-variant"
                  aria-pressed={index === variantIndex}
                  onClick={() => setVariantIndex(index)}
                >
                  {variantLabel(item)}
                </button>
              ))}
            </div>
            <button type="button" className="comp-replay" onClick={() => setSeed((value) => value + 1)}>
              <RotateCcw aria-hidden="true" />
              {t.labels.replay}
            </button>
          </div>
        </div>
        {tab === "preview" ? (
          <div className="comp-demo__body" role="tabpanel">
            {/* key=locale+变体+seed：切语言 / 变体 / 重播都重挂载 demo（store 重建、打字机重播）。 */}
            <variant.Demo key={`${locale}:${variantIndex}:${seed}`} />
          </div>
        ) : (
          <div className="comp-demo__body comp-demo__body--code" role="tabpanel">
            <CodeView source={variant.code} lang="tsx" />
          </div>
        )}
      </div>

      <h2 className="comp-h2">{t.labels.installation}</h2>
      <CodeView source={`npx shadcn add @diribo-agent-ui/${slug}`} lang="bash" />
      <p className="comp-note">{t.notes.installation}</p>

      <h2 className="comp-h2">{t.labels.usage}</h2>
      <CodeView source={config.usage} lang="tsx" />

      <h2 className="comp-h2">{t.labels.props}</h2>
      {config.props.length > 0 ? (
        <table className="comp-props">
          <thead>
            <tr>
              <th>{t.propsTable.name}</th>
              <th>{t.propsTable.type}</th>
              <th>{t.propsTable.description}</th>
            </tr>
          </thead>
          <tbody>
            {config.props.map((row) => (
              <tr key={row.name}>
                <td className="comp-props__name">{row.name}</td>
                <td className="comp-props__type">
                  <code>{row.type}</code>
                </td>
                <td>{propsCopy[row.name]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="comp-note">{t.notes.propsEmpty}</p>
      )}

      {examples.length > 0 ? (
        <>
          <h2 className="comp-h2">{t.labels.examples}</h2>
          <div className="comp-examples">
            {examples.map((item, index) => (
              <div className="comp-frame" key={`${item.labelKey}:${index}`}>
                <span className="comp-frame__label">{variantLabel(item)}</span>
                <item.Demo key={locale} />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

export function ComponentPage() {
  const { slug } = useParams<{ slug: string }>();
  const { dict } = useLocale();

  const known = COMPONENT_ORDER.includes(slug as ComponentSlug);
  if (!known) {
    const notFound = dict.site.notFound;
    return (
      <section className="docs-page" aria-labelledby="component-missing-title">
        <h1 id="component-missing-title">{notFound.title}</h1>
        <p className="docs-page__desc">{notFound.description}</p>
      </section>
    );
  }
  // key=slug：路由切换组件时重置 tab / 变体 / 重播状态。
  return <ComponentDoc key={slug} slug={slug as ComponentSlug} />;
}
