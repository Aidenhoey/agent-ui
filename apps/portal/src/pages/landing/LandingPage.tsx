/**
 * pages/landing/LandingPage.tsx —— 落地页（/）。
 *
 * hero（标题 / 简介 / 两个主按钮）+ 大 live demo（真实 run store + createRunPlayer
 * 逐条回放 buildScenarios 的 success 剧本，RunStoreContext.Provider + RunTimeline
 * 渲染；⟳ 重播 = player.play()，内部 store.reset() 后重放）+ 三张特性卡 + 简洁页脚。
 * 文案走字典 site.landing 域；demo 数据（userPrompt / 正文等）由 buildScenarios(locale) 双语提供。
 * success 剧本无 interrupt，RunTimeline 以 readOnly 渲染（隐藏完成后的 AgentActions）。
 */

import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";

import {
  buildScenarios,
  buttonVariants,
  createRunPlayer,
  createRunStore,
  dictionaries,
  RunStoreContext,
  RunTimeline,
  useLocale,
  UserMessage,
} from "@diribo/agent-ui";

import { ArrowRight, Languages, Layers, RotateCcw, Workflow } from "../../lib/icons.js";

const noop = () => {};

/**
 * 滚动入场：容器内所有 .reveal 元素进入视口时加 .is-visible（CSS 负责淡入上移）。
 * prefers-reduced-motion 时直接全部置为可见，跳过观察器。
 */
function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll(".reveal");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return ref;
}

/** hero 下方的大 live demo：自动播放一轮 success 场景，⟳ 按钮重播。 */
function LandingDemo() {
  const { dict, locale } = useLocale();
  const t = dict.site.landing;

  const demo = useMemo(() => {
    const scenarios = buildScenarios(locale);
    const scenario = scenarios.find((s) => s.id === "success") ?? scenarios[0]!;
    const store = createRunStore({ toolCopy: dictionaries[locale].blocks.tool });
    const player = createRunPlayer(store, scenario.steps, { speed: 1.5 });
    return { scenario, store, player };
  }, [locale]);

  // 挂载 / 切语言后自动播放；player.play() 幂等（清计时器 + store.reset() 重放），卸载时停表。
  useEffect(() => {
    demo.player.play();
    return () => demo.player.stop();
  }, [demo]);

  return (
    <section className="landing-demo reveal" aria-label={t.demoLabel}>
      <div className="landing-demo__bar">
        <span className="landing-demo__label">{t.demoLabel}</span>
        <button type="button" className="landing-demo__replay" onClick={() => demo.player.play()}>
          <RotateCcw aria-hidden="true" />
          {t.demoReplay}
        </button>
      </div>
      <div className="landing-demo__body">
        <UserMessage text={demo.scenario.userPrompt} />
        <RunStoreContext.Provider value={demo.store}>
          <RunTimeline
            readOnly
            onOpenArtifact={noop}
            onSubmitInterrupt={noop}
            onRetry={() => demo.player.play()}
            onBranch={noop}
          />
        </RunStoreContext.Provider>
      </div>
    </section>
  );
}

/** 特性卡图标按字典键映射；顺序即页面呈现顺序。 */
const FEATURE_ICONS = { protocol: Workflow, shadcn: Layers, i18n: Languages } as const;
type FeatureKey = keyof typeof FEATURE_ICONS;
const FEATURE_ORDER: readonly FeatureKey[] = ["protocol", "shadcn", "i18n"];

export function LandingPage() {
  const { dict } = useLocale();
  const t = dict.site.landing;
  const pageRef = useScrollReveal<HTMLDivElement>();

  return (
    <div className="landing-page" ref={pageRef}>
      <section className="landing-hero reveal" aria-labelledby="landing-title">
        <span className="landing-hero__badge">{t.badge}</span>
        <h1 id="landing-title">{t.title}</h1>
        <p className="landing-hero__desc">{t.description}</p>
        <div className="landing-hero__actions">
          <Link to="/docs/introduction" className={buttonVariants({ size: "lg" })}>
            {t.getStarted}
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link to="/components/thread" className={buttonVariants({ variant: "outline", size: "lg" })}>
            {t.browseComponents}
          </Link>
        </div>
      </section>

      <LandingDemo />

      <section className="landing-features reveal" aria-labelledby="landing-features-title">
        <h2 id="landing-features-title">{t.featuresTitle}</h2>
        <div className="landing-features__grid">
          {FEATURE_ORDER.map((key) => {
            const Icon = FEATURE_ICONS[key];
            const card = t.features[key];
            return (
              <article key={key} className="landing-feature reveal">
                <Icon className="landing-feature__icon" aria-hidden="true" />
                <h3 className="landing-feature__title">{card.title}</h3>
                <p className="landing-feature__desc">{card.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="landing-footer">{t.footer}</footer>
    </div>
  );
}
