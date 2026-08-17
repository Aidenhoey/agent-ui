/**
 * pages/showcase/ShowcasePage.tsx —— 组件展示页（/showcase，复刻新增，无 SRC 对应）。
 *
 * 分节展示 @diribo/agent-ui 的 run 时间线组件：每节 = 组件名 + 一句话描述（字典
 * showcase 域，双语）+ live demo。demo 数据用库 buildScenarios(locale) 的演示剧本
 * 灌进真实 run store（createRunStore 逐事件 dispatch）得到 RunViewState，再经
 * RunStoreContext.Provider + renderBlock/组件直接渲染 —— 与会话页同一套渲染路径。
 *
 * 截断语义：
 * - stepsUpToPause：截到首个 pauseAfter（interrupt 悬停等待用户输入的半途态）；
 * - stepsUpToEvent：截到第 N 个匹配事件（流式正文 / 工具运行中 / todo 半途态）。
 * live=true 的 store 保持 "live" 连接：TextBlock 打字机生效；静态快照落 "replay" 直出终态。
 *
 * 可交互 interrupt demo：提交后把场景暂停点之后的剩余事件续播进 store（interrupt
 * 闭合事件的 resolution 换成用户的真实提交），卡片转已答复、run 推进到完成。
 * demo 里的正文 / 附件名等演示数据内联双语（同 mocks/data.ts 约定），不进字典。
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  ArtifactCard,
  buildScenarios,
  Composer,
  ConnectionBanner,
  ContentModal,
  createRunStore,
  dictionaries,
  EvidenceList,
  EvidenceMarker,
  interpolate,
  InterruptCard,
  ProcessGroup,
  ReasoningBlock,
  renderBlock,
  RunErrorCard,
  RunStoreContext,
  SandboxBlock,
  StreamingMarkdown,
  TodoPanel,
  useLocale,
  useRunState,
  UserMessage,
  type ArtifactView,
  type ComposerSubmit,
  type InterruptBlock,
  type LocaleCode,
  type MessageAttachment,
  type PlaybackStep,
  type PublicRunEvent,
  type RunBlock,
  type RunStore,
  type SandboxBlockView,
  type Scenario,
  type ShowcaseDict,
  type ShowcaseSectionCopy,
} from "@diribo/agent-ui";

type SectionId = keyof ShowcaseDict["sections"];

/** 分节顺序（键即页内锚点 id）。 */
const SECTION_ORDER: readonly SectionId[] = [
  "text",
  "reasoning",
  "tool",
  "sandbox",
  "interrupt",
  "todo",
  "evidence",
  "artifact",
  "rich",
  "process",
  "userMessage",
  "status",
  "composer",
];

/* ------------------------------- demo store 构造 ------------------------------- */

/** 把一段事件流灌进真实 run store；live=true 保持 "live" 连接（打字机生效），否则落 "replay"。 */
function buildDemoStore(steps: PlaybackStep[], locale: LocaleCode, live = false): RunStore {
  const store = createRunStore({ toolCopy: dictionaries[locale].blocks.tool });
  for (const step of steps) store.dispatch(step.event);
  if (!live) store.setConnection("replay");
  return store;
}

/** 截到首个 pauseAfter 步骤（含）—— interrupt 悬停等待用户输入的半途态。 */
function stepsUpToPause(scenario: Scenario): PlaybackStep[] {
  const index = scenario.steps.findIndex((step) => step.pauseAfter);
  return index >= 0 ? scenario.steps.slice(0, index + 1) : scenario.steps;
}

/** 截到第 occurrence 个匹配事件（含）。 */
function stepsUpToEvent(
  scenario: Scenario,
  match: (event: PublicRunEvent) => boolean,
  occurrence = 1,
): PlaybackStep[] {
  let seen = 0;
  const out: PlaybackStep[] = [];
  for (const step of scenario.steps) {
    out.push(step);
    if (match(step.event)) {
      seen += 1;
      if (seen >= occurrence) break;
    }
  }
  return out;
}

/** 按 payload.kind + event_type 匹配块事件。 */
function isBlockEvent(event: PublicRunEvent, kind: string, eventType: string): boolean {
  return event.event_type === eventType && (event.payload as { kind?: string }).kind === kind;
}

interface ShowcaseDemos {
  /** success 截到正文第 4 个 delta（live）：流式正文 demo。 */
  textStreaming: RunStore;
  /** success 全量（replay）：完成正文 / 来源 / 产物 / 过程折叠共用。 */
  successFull: RunStore;
  /** exec 截到首个工具 progress（live）：工具运行中 demo。 */
  toolRunning: RunStore;
  /** success 截到第 3 个 todo delta（live）：任务清单半途态 demo（2/4 完成）。 */
  todoMid: RunStore;
  /** richviz 全量（replay）：chart / mermaid / svg / html 围栏 demo。 */
  richFull: RunStore;
  /** plan 全量（replay）：已答复计划审批卡 demo。 */
  planFull: RunStore;
  /** fail 全量（replay）：失败工具块 demo。 */
  failFull: RunStore;
}

function buildDemos(scenarios: Scenario[], locale: LocaleCode): ShowcaseDemos {
  const byId = (id: string): Scenario => scenarios.find((s) => s.id === id) ?? scenarios[0]!;
  const success = byId("success");
  let textDeltas = 0;
  let todoDeltas = 0;
  return {
    textStreaming: buildDemoStore(
      stepsUpToEvent(success, (event) => {
        if (!isBlockEvent(event, "text", "block.delta")) return false;
        textDeltas += 1;
        return textDeltas >= 4;
      }),
      locale,
      true,
    ),
    successFull: buildDemoStore(success.steps, locale),
    toolRunning: buildDemoStore(
      stepsUpToEvent(byId("exec"), (event) => isBlockEvent(event, "tool", "block.progress")),
      locale,
      true,
    ),
    todoMid: buildDemoStore(
      stepsUpToEvent(success, (event) => {
        if (!isBlockEvent(event, "todo", "block.delta")) return false;
        todoDeltas += 1;
        return todoDeltas >= 3;
      }),
      locale,
      true,
    ),
    richFull: buildDemoStore(byId("richviz").steps, locale),
    planFull: buildDemoStore(byId("plan").steps, locale),
    failFull: buildDemoStore(byId("fail").steps, locale),
  };
}

/* ------------------------------- 页面骨架小组件 ------------------------------- */

/** 一个展示分节：锚点 id + 标题 + 一句话描述 + demo 区。 */
function Section({ id, copy, children }: { id: SectionId; copy: ShowcaseSectionCopy; children: ReactNode }) {
  return (
    <section id={`showcase-${id}`} className="showcase-section" aria-labelledby={`showcase-${id}-title`}>
      <h2 id={`showcase-${id}-title`} className="showcase-section__title">{copy.title}</h2>
      <p className="showcase-section__desc">{copy.description}</p>
      <div className="showcase-section__body">{children}</div>
    </section>
  );
}

/** 一个 demo 框：可选的变体标签（流式 / 运行中 / 失败…）+ 内容。 */
function DemoFrame({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="showcase-demo">
      {label ? <span className="showcase-demo__label">{label}</span> : null}
      {children}
    </div>
  );
}

/* ----------------------------- store 取数渲染组件 ----------------------------- */

/** 渲染 store 里首个指定 kind（或指定 block_id）的块；agent-turn__body 对齐时间线间距。 */
function StoreBlockView({ kind, blockId }: { kind: RunBlock["kind"]; blockId?: string }) {
  const state = useRunState();
  const block = state.blocks.find((b) => (blockId ? b.block_id === blockId : b.kind === kind));
  if (!block) return null;
  return <div className="agent-turn__body">{renderBlock(block)}</div>;
}

/** success 场景的 4 个工具块收进过程折叠组（耗时取 run 起止时间戳）。 */
function StoreProcessGroup() {
  const state = useRunState();
  const blocks = state.blocks.filter((b) => b.kind === "tool");
  if (blocks.length === 0) return null;
  const durationMs = state.completedAt && state.startedAt ? state.completedAt - state.startedAt : undefined;
  return <ProcessGroup blocks={blocks} durationMs={durationMs} />;
}

/** fail 场景的迷你时间线（部分正文 + 失败工具 + 错误卡）；重试 = 换 store 重演。 */
function FailTimeline({ onRetry }: { onRetry: () => void }) {
  const state = useRunState();
  return (
    <div className="agent-turn__body">
      {state.blocks.map((block) => renderBlock(block))}
      {state.error ? (
        <RunErrorCard error={state.error} retryable={state.error.retryable} onRetry={onRetry} />
      ) : null}
    </div>
  );
}

/** 可交互 interrupt 时间线：暂停点截断的 live store；提交后续播剩余事件。 */
function InteractiveInterruptDemo({ scenario, locale }: { scenario: Scenario; locale: LocaleCode }) {
  const demo = useMemo(() => {
    const pauseIndex = scenario.steps.findIndex((step) => step.pauseAfter);
    const head = pauseIndex >= 0 ? scenario.steps.slice(0, pauseIndex + 1) : scenario.steps;
    const tail = pauseIndex >= 0 ? scenario.steps.slice(pauseIndex + 1) : [];
    return { store: buildDemoStore(head, locale, true), tail };
  }, [scenario, locale]);

  // 提交 = 把暂停后的剩余事件续播进 store：interrupt 闭合事件的 resolution 换成
  // 用户的真实提交（wire 剧本值 → 本地字段级值），卡片转已答复、run 推进到完成。
  const submit = (resolution: Record<string, unknown>) => {
    for (const step of demo.tail) {
      const event = step.event;
      if (isBlockEvent(event, "interrupt", "block.completed")) {
        demo.store.dispatch({
          ...event,
          payload: { ...(event.payload as Record<string, unknown>), resolution },
        } as PublicRunEvent);
      } else {
        demo.store.dispatch(event);
      }
    }
  };

  return (
    <RunStoreContext.Provider value={demo.store}>
      <InteractiveInterruptTimeline onSubmit={submit} />
    </RunStoreContext.Provider>
  );
}

function InteractiveInterruptTimeline({ onSubmit }: { onSubmit: (resolution: Record<string, unknown>) => void }) {
  const state = useRunState();
  return (
    <div className="agent-turn__body">
      {state.blocks.map((block) =>
        renderBlock(block, { onSubmitInterrupt: onSubmit, interruptReadOnly: false }),
      )}
    </div>
  );
}

/* ------------------------------- 独立 demo 组件 ------------------------------- */

/** 产物卡 demo：点击在中央工作台打开 markdown 预览。 */
function ArtifactDemo({ artifact }: { artifact: ArtifactView }) {
  const { dict } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <>
      <ArtifactCard artifact={artifact} onOpen={() => setOpen(true)} />
      <ContentModal
        open={open}
        onOpenChange={setOpen}
        overline={dict.showcase.artifactPreviewOverline}
        title={artifact.logical_path}
      >
        <StreamingMarkdown text={artifact.preview_content ?? ""} renderCitation={() => null} />
      </ContentModal>
    </>
  );
}

/** 用户消息 demo：附件文件卡 + 行内编辑（编辑结果直接回写气泡）。 */
function UserMessageDemo() {
  const { locale } = useLocale();
  const zh = locale === "zh-CN";
  const [text, setText] = useState(() =>
    zh
      ? "分析一下 XX 公司最近的三份定向增发公告，重点比对募资规模和定价机制；附件是我整理的要点摘要。"
      : "Analyze XX Company's three recent private placement announcements, focusing on proceeds size and pricing mechanism. Attached is my summary of the key points.",
  );
  const attachments: MessageAttachment[] = [
    {
      id: "demo_att_1",
      name: zh ? "定增要点摘要.pdf" : "placement-notes.pdf",
      kind: "file",
      fileType: "PDF",
      size: "1.2 MB",
    },
  ];
  return <UserMessage text={text} attachments={attachments} onEdit={setText} />;
}

/** 恢复失败浮条 demo：点「重试」短暂进入重连中，再回落恢复失败（模拟重连不成）。 */
function ConnectionRetryDemo() {
  const { locale } = useLocale();
  const [retrying, setRetrying] = useState(false);
  const timerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );
  const retry = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setRetrying(true);
    timerRef.current = window.setTimeout(() => setRetrying(false), 1600);
  };
  return (
    <ConnectionBanner
      connection={retrying ? "reconnecting" : "recovery_failed"}
      failure={{
        kind: "network",
        message: locale === "zh-CN" ? "网络连接已断开，快照恢复失败。" : "The network connection was lost; snapshot recovery failed.",
        retryable: true,
      }}
      onRetry={retry}
    />
  );
}

/** Composer demo：独立可输入，提交内容回显在下方。 */
function ComposerDemo() {
  const { dict } = useLocale();
  const [submitted, setSubmitted] = useState("");
  return (
    <>
      <Composer onSubmit={(value: ComposerSubmit) => setSubmitted(value.text)} />
      {submitted ? (
        <p className="showcase-echo">{interpolate(dict.showcase.composerEcho, { text: submitted })}</p>
      ) : null}
    </>
  );
}

/* --------------------------------- 页面本体 --------------------------------- */

export function ShowcasePage() {
  const { dict, locale } = useLocale();
  const t = dict.showcase;
  const zh = locale === "zh-CN";

  const scenarios = useMemo(() => buildScenarios(locale), [locale]);
  const demos = useMemo(() => buildDemos(scenarios, locale), [scenarios, locale]);
  // 失败 demo 的 store 独立持有：错误卡「重试」= 重建 store 重演场景（live 连接，正文重新打字）。
  const [failSeed, setFailSeed] = useState(0);
  const failStore = useMemo(() => {
    const fail = scenarios.find((s) => s.id === "fail") ?? scenarios[0]!;
    return buildDemoStore(fail.steps, locale, true);
  }, [scenarios, locale, failSeed]);

  const clarifyScenario = scenarios.find((s) => s.id === "clarify") ?? scenarios[0]!;
  const planScenario = scenarios.find((s) => s.id === "plan") ?? scenarios[0]!;
  // 静态 replay store 直接读快照（无后续 dispatch，引用稳定）。
  const planInterrupt = demos.planFull.getState().blocks.find(
    (block): block is InterruptBlock => block.kind === "interrupt",
  );
  const artifact = demos.successFull.getState().artifacts[0];

  const sandboxDemos: Array<{ label: string; block: SandboxBlockView }> = [
    {
      label: t.variants.preparing,
      block: { block_id: "demo_sandbox_prepare", kind: "sandbox", order: 0, status: "running", stage: "preparing" },
    },
    {
      label: t.variants.running,
      block: { block_id: "demo_sandbox_running", kind: "sandbox", order: 1, status: "running", stage: "running", percent: 46 },
    },
    {
      label: t.variants.collecting,
      block: { block_id: "demo_sandbox_collect", kind: "sandbox", order: 2, status: "running", stage: "collecting-outputs", percent: 92 },
    },
    {
      label: t.variants.completed,
      block: { block_id: "demo_sandbox_done", kind: "sandbox", order: 3, status: "completed", exitCode: 0, durationMs: 8340, outputCount: 2 },
    },
    {
      label: t.variants.failed,
      block: { block_id: "demo_sandbox_failed", kind: "sandbox", order: 4, status: "failed", failureCode: "deadline_exceeded", durationMs: 12000 },
    },
  ];

  return (
    <section className="page showcase-page" aria-labelledby="showcase-title">
      <div className="showcase-page__inner">
        <header className="showcase-page__head">
          <h1 id="showcase-title">{t.pageTitle}</h1>
          <p className="showcase-page__desc">{t.pageDescription}</p>
        </header>

        <nav className="showcase-nav" aria-label={t.tocAria}>
          {SECTION_ORDER.map((id) => (
            <a key={id} className="showcase-nav__link" href={`#showcase-${id}`}>
              {t.sections[id].title}
            </a>
          ))}
        </nav>

        <Section id="text" copy={t.sections.text}>
          <DemoFrame label={t.variants.streaming}>
            <RunStoreContext.Provider value={demos.textStreaming}>
              <StoreBlockView kind="text" />
            </RunStoreContext.Provider>
          </DemoFrame>
          <DemoFrame label={t.variants.completed}>
            <RunStoreContext.Provider value={demos.successFull}>
              <StoreBlockView kind="text" />
            </RunStoreContext.Provider>
          </DemoFrame>
        </Section>

        <Section id="reasoning" copy={t.sections.reasoning}>
          <DemoFrame label={t.variants.thinking}>
            <ReasoningBlock
              block={{ block_id: "demo_reasoning_thinking", kind: "reasoning", order: 0, status: "thinking" }}
            />
          </DemoFrame>
          <DemoFrame label={t.variants.done}>
            <ReasoningBlock
              block={{
                block_id: "demo_reasoning_done",
                kind: "reasoning",
                order: 1,
                status: "done",
                durationMs: 4200,
                text: zh
                  ? "先比对三份公告披露的募资总额口径（预案上限 12.8 亿、上轮实际 10.85 亿），再核对发行对象数量与定价基准日差异；最后把补流比例与监管关注区间对照 —— 风险点只在补流口径。"
                  : "Compare the disclosed proceeds across the three announcements first (a RMB 1.28B cap this round versus RMB 1.085B raised last time), then check subscriber counts and pricing reference dates; finally benchmark the working-capital ratio against the regulatory watch zone — the only real risk sits in that ratio.",
              }}
            />
          </DemoFrame>
        </Section>

        <Section id="tool" copy={t.sections.tool}>
          <DemoFrame label={`${t.variants.running} · code.execute`}>
            <RunStoreContext.Provider value={demos.toolRunning}>
              <StoreBlockView kind="tool" blockId="blk_exec" />
            </RunStoreContext.Provider>
          </DemoFrame>
          <DemoFrame label={`${t.variants.completed} · file.read`}>
            <RunStoreContext.Provider value={demos.successFull}>
              <StoreBlockView kind="tool" blockId="blk_f1" />
            </RunStoreContext.Provider>
          </DemoFrame>
          <DemoFrame label={`${t.variants.failed} · file.read`}>
            <RunStoreContext.Provider value={demos.failFull}>
              <StoreBlockView kind="tool" blockId="blk_f1" />
            </RunStoreContext.Provider>
          </DemoFrame>
        </Section>

        <Section id="sandbox" copy={t.sections.sandbox}>
          {sandboxDemos.map((demo) => (
            <DemoFrame key={demo.block.block_id} label={demo.label}>
              <SandboxBlock block={demo.block} />
            </DemoFrame>
          ))}
        </Section>

        <Section id="interrupt" copy={t.sections.interrupt}>
          <DemoFrame label={`${t.variants.interactive} · clarification`}>
            <InteractiveInterruptDemo scenario={clarifyScenario} locale={locale} />
          </DemoFrame>
          <DemoFrame label={`${t.variants.interactive} · plan_approval`}>
            <InteractiveInterruptDemo scenario={planScenario} locale={locale} />
          </DemoFrame>
          <DemoFrame label={`${t.variants.resolved} · plan_approval`}>
            <div className="agent-turn__body">
              {planInterrupt ? <InterruptCard interrupt={planInterrupt.interrupt} onSubmit={() => {}} /> : null}
            </div>
          </DemoFrame>
        </Section>

        <Section id="todo" copy={t.sections.todo}>
          <DemoFrame label={t.variants.running}>
            <RunStoreContext.Provider value={demos.todoMid}>
              <TodoPanel />
            </RunStoreContext.Provider>
          </DemoFrame>
        </Section>

        <Section id="evidence" copy={t.sections.evidence}>
          <DemoFrame>
            <RunStoreContext.Provider value={demos.successFull}>
              <div className="agent-turn__body">
                <p className="showcase-evidence-line">
                  {zh ? "本次拟募集资金不超过 12.8 亿元" : "Planned proceeds are capped at RMB 1.28B"}
                  <EvidenceMarker index={1} />
                  {zh ? "，较 2024 年方案上调约 18%" : ", up ~18% over the 2024 plan"}
                  <EvidenceMarker index={2} />
                  {zh ? "；补充流动资金比例上调至 30%。" : "; the working-capital share rose to 30%."}
                  <EvidenceMarker index={5} />
                </p>
                <EvidenceList />
              </div>
            </RunStoreContext.Provider>
          </DemoFrame>
        </Section>

        <Section id="artifact" copy={t.sections.artifact}>
          {artifact ? (
            <DemoFrame>
              <div className="agent-artifacts">
                <ArtifactDemo artifact={artifact} />
              </div>
            </DemoFrame>
          ) : null}
        </Section>

        <Section id="rich" copy={t.sections.rich}>
          <DemoFrame label="chart · mermaid · svg · html">
            <RunStoreContext.Provider value={demos.richFull}>
              <StoreBlockView kind="text" />
            </RunStoreContext.Provider>
          </DemoFrame>
        </Section>

        <Section id="process" copy={t.sections.process}>
          <DemoFrame>
            <RunStoreContext.Provider value={demos.successFull}>
              <StoreProcessGroup />
            </RunStoreContext.Provider>
          </DemoFrame>
        </Section>

        <Section id="userMessage" copy={t.sections.userMessage}>
          <DemoFrame>
            {/* key=locale：切换语言时重挂载，气泡文本与附件名回到对应语言初值。 */}
            <UserMessageDemo key={locale} />
          </DemoFrame>
        </Section>

        <Section id="status" copy={t.sections.status}>
          <DemoFrame label={t.variants.failed}>
            {/* key=failSeed：重试重建 store 后整棵子树重挂载，正文打字机重新播放。 */}
            <RunStoreContext.Provider key={failSeed} value={failStore}>
              <FailTimeline onRetry={() => setFailSeed((seed) => seed + 1)} />
            </RunStoreContext.Provider>
          </DemoFrame>
          <DemoFrame label={t.variants.reconnecting}>
            <ConnectionBanner connection="reconnecting" failure={null} />
          </DemoFrame>
          <DemoFrame label={t.variants.recoveryFailed}>
            <ConnectionRetryDemo />
          </DemoFrame>
        </Section>

        <Section id="composer" copy={t.sections.composer}>
          <DemoFrame>
            <ComposerDemo />
          </DemoFrame>
        </Section>
      </div>
    </section>
  );
}
