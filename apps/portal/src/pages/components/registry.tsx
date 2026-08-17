/**
 * pages/components/registry.tsx —— 组件页数据驱动注册表：
 * 14 个 slug（顺序见 lib/components.ts 的 COMPONENT_ORDER）→
 * { variants: [{ labelKey, hint?, code, Demo }], usage, props }。
 *
 * 约定：
 * - Demo 是组件：页面「重播」= key 重挂载（store 重建，live 连接下打字机重播）；
 *   store 驱动 demo 统一走 StoreDemo（scenarioId + 截断器 + live 标志）。
 * - demo 里的正文 / 附件名 / 任务卡等演示数据内联双语（同 buildScenarios 约定），不进字典；
 *   变体标签与 props 描述走 dict.components（variants / props 域）。
 * - code 为该变体 demo 的构造源码串，展示在 Preview|Code 的 Code 选项卡。
 * store 构造 / 截断 / 续播纯逻辑在同目录 demo-utils.ts。
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  ArtifactCard,
  ChartBlock,
  Composer,
  ConnectionBanner,
  ContentModal,
  EvidenceList,
  EvidenceMarker,
  InterruptCard,
  interpolate,
  ProcessGroup,
  ReasoningBlock,
  renderBlock,
  RunErrorCard,
  RunStoreContext,
  RunThread,
  SandboxBlock,
  StreamingMarkdown,
  TaskProgressCard,
  TaskReviewCard,
  TodoPanel,
  useRunState,
  UserMessage,
  type ComposerSubmit,
  type InterruptBlock,
  type MessageAttachment,
  type RunBlock,
  type SandboxBlockView,
  type SentMessage,
  type TaskProgress,
  type TaskReview,
  type TaskReviewDecision,
  type TaskReviewViewState,
} from "@aidenhoey/agent-ui";
import {
  useDemoLocale,
  type ComponentsDict,
  type ComponentSlug,
  type PlaybackStep,
  type Scenario,
} from "@aidenhoey/agent-ui/mock";

import {
  buildDemoStore,
  isBlockEvent,
  replayTail,
  splitAtPause,
  stepsUpToEvent,
  useScenario,
} from "./demo-utils.js";

/** 变体标签键：dict.components.variants 的键。 */
type VariantKey = keyof ComponentsDict["variants"];

export interface ComponentVariant {
  labelKey: VariantKey;
  /** 标签后缀标识符（工具名 / interrupt_kind / prop 名，非文案）。 */
  hint?: string;
  /** Code 选项卡展示的 demo 构造源码。 */
  code: string;
  /** demo 组件（重播 = 外层 key 重挂载）。 */
  Demo: () => ReactNode;
}

export interface ComponentPropRow {
  /** 属性名（同时是 dict.components.props[slug] 的描述键）。 */
  name: string;
  type: string;
}

export interface ComponentEntry {
  variants: ComponentVariant[];
  usage: string;
  props: ComponentPropRow[];
}

/* ------------------------------- demo 原语 ------------------------------- */

/** 渲染 context store 里首个指定 kind（或指定 block_id）的块；agent-turn__body 对齐时间线间距。 */
function StoreBlockView({ kind, blockId }: { kind: RunBlock["kind"]; blockId?: string }) {
  const state = useRunState();
  const block = state.blocks.find((b) => (blockId ? b.block_id === blockId : b.kind === kind));
  if (!block) return null;
  return <div className="agent-turn__body">{renderBlock(block)}</div>;
}

/** store 驱动 demo：剧本 + 截断器 + live → provider 包裹 children。 */
function StoreDemo({
  scenarioId,
  select,
  live = false,
  children,
}: {
  scenarioId: string;
  select?: (scenario: Scenario) => PlaybackStep[];
  live?: boolean;
  children: ReactNode;
}) {
  const scenario = useScenario(scenarioId);
  const { locale } = useDemoLocale();
  const store = useMemo(
    () => buildDemoStore(select ? select(scenario) : scenario.steps, locale, live),
    [scenario, select, locale, live],
  );
  return <RunStoreContext.Provider value={store}>{children}</RunStoreContext.Provider>;
}

/* ------------------------------- 截断器 ------------------------------- */

/** 第 4 个正文 delta：流式正文半途态。 */
const selectTextStreaming = (scenario: Scenario) =>
  stepsUpToEvent(scenario, (event) => isBlockEvent(event, "text", "block.delta"), 4);
/** 首个工具 progress：工具运行中。 */
const selectToolProgress = (scenario: Scenario) =>
  stepsUpToEvent(scenario, (event) => isBlockEvent(event, "tool", "block.progress"));
/** 第 3 个 todo delta：任务清单半途态（2/4 完成）。 */
const selectTodoMid = (scenario: Scenario) =>
  stepsUpToEvent(scenario, (event) => isBlockEvent(event, "todo", "block.delta"), 3);
/** 首个 artifact delta：产物草稿态（committed=false）。 */
const selectArtifactDraft = (scenario: Scenario) =>
  stepsUpToEvent(scenario, (event) => isBlockEvent(event, "artifact", "block.delta"));

/* ------------------------------- thread ------------------------------- */

/** 完整 run 线程：live store（正文打字机播放）；错误卡 / AgentActions 的重试 = 重建 store 重演。 */
function ThreadDemo({ scenarioId }: { scenarioId: string }) {
  const scenario = useScenario(scenarioId);
  const { locale } = useDemoLocale();
  const [seed, setSeed] = useState(0);
  const store = useMemo(() => buildDemoStore(scenario.steps, locale, true), [scenario, locale, seed]);
  const liveUser = useMemo<SentMessage>(() => ({ text: scenario.userPrompt, attachments: [] }), [scenario]);
  return (
    <RunStoreContext.Provider value={store}>
      {/* key=seed：重试重建 store 后整棵线程重挂载，正文打字机重新播放。 */}
      <RunThread
        key={seed}
        pastTurns={[]}
        liveUser={liveUser}
        onSubmitInterrupt={() => {}}
        onRetryTurn={() => setSeed((value) => value + 1)}
        onBranchTurn={() => {}}
        activeArtifact={null}
        onOpenArtifact={() => {}}
        activeAgent={null}
        onOpenAgent={() => {}}
      />
    </RunStoreContext.Provider>
  );
}

const ThreadSuccessDemo = () => <ThreadDemo scenarioId="success" />;
const ThreadFailDemo = () => <ThreadDemo scenarioId="fail" />;

/* ------------------------------- message ------------------------------- */

const MessageStreamingDemo = () => (
  <StoreDemo scenarioId="success" select={selectTextStreaming} live>
    <StoreBlockView kind="text" />
  </StoreDemo>
);
const MessageCompletedDemo = () => (
  <StoreDemo scenarioId="success">
    <StoreBlockView kind="text" />
  </StoreDemo>
);

/* ------------------------------- reasoning ------------------------------- */

const ReasoningThinkingDemo = () => (
  <ReasoningBlock block={{ block_id: "demo_reasoning_thinking", kind: "reasoning", order: 0, status: "thinking" }} />
);

/** 完成带耗时：剧本不含 reasoning 原文（库的演示面收窄约定），推理文本内联双语演示数据。 */
function ReasoningDoneDemo() {
  const { locale } = useDemoLocale();
  const zh = locale === "zh-CN";
  return (
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
  );
}

/* ------------------------------- tool-call ------------------------------- */

const ToolRunningDemo = () => (
  <StoreDemo scenarioId="exec" select={selectToolProgress} live>
    <StoreBlockView kind="tool" blockId="blk_exec" />
  </StoreDemo>
);
const ToolCompletedDemo = () => (
  <StoreDemo scenarioId="success">
    <StoreBlockView kind="tool" blockId="blk_f1" />
  </StoreDemo>
);
const ToolFailedDemo = () => (
  <StoreDemo scenarioId="fail">
    <StoreBlockView kind="tool" blockId="blk_f1" />
  </StoreDemo>
);

/* ------------------------------- sandbox ------------------------------- */

/** 剧本无 sandbox 事件（一期演示面收窄），用安全公共投影的视图数据直渲染。 */
function makeSandboxDemo(block: SandboxBlockView) {
  return function SandboxDemo() {
    return <SandboxBlock block={block} />;
  };
}

const SandboxPreparingDemo = makeSandboxDemo({
  block_id: "demo_sandbox_prepare",
  kind: "sandbox",
  order: 0,
  status: "running",
  stage: "preparing",
});
const SandboxRunningDemo = makeSandboxDemo({
  block_id: "demo_sandbox_running",
  kind: "sandbox",
  order: 1,
  status: "running",
  stage: "running",
  percent: 46,
});
const SandboxCollectingDemo = makeSandboxDemo({
  block_id: "demo_sandbox_collect",
  kind: "sandbox",
  order: 2,
  status: "running",
  stage: "collecting-outputs",
  percent: 92,
});
const SandboxCompletedDemo = makeSandboxDemo({
  block_id: "demo_sandbox_done",
  kind: "sandbox",
  order: 3,
  status: "completed",
  exitCode: 0,
  durationMs: 8340,
  outputCount: 2,
});
const SandboxFailedDemo = makeSandboxDemo({
  block_id: "demo_sandbox_failed",
  kind: "sandbox",
  order: 4,
  status: "failed",
  failureCode: "deadline_exceeded",
  durationMs: 12000,
});

/* ------------------------------- interrupt ------------------------------- */

/** 可交互 interrupt：暂停点截断的 live store；提交后 replayTail 续播剩余事件。 */
function InteractiveInterruptDemo({ scenarioId }: { scenarioId: string }) {
  const scenario = useScenario(scenarioId);
  const { locale } = useDemoLocale();
  const demo = useMemo(() => {
    const { head, tail } = splitAtPause(scenario);
    return { store: buildDemoStore(head, locale, true), tail };
  }, [scenario, locale]);
  const submit = (resolution: Record<string, unknown>) => replayTail(demo.store, demo.tail, resolution);
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
      {state.blocks.map((block) => renderBlock(block, { onSubmitInterrupt: onSubmit, interruptReadOnly: false }))}
    </div>
  );
}

const InterruptClarifyDemo = () => <InteractiveInterruptDemo scenarioId="clarify" />;
const InterruptPlanDemo = () => <InteractiveInterruptDemo scenarioId="plan" />;

/** 已答复：plan 全量 replay 快照里的 interrupt 块直渲染（wire resolution 已在剧本内）。 */
function InterruptResolvedDemo() {
  const scenario = useScenario("plan");
  const { locale } = useDemoLocale();
  const store = useMemo(() => buildDemoStore(scenario.steps, locale), [scenario, locale]);
  const block = store.getState().blocks.find((b): b is InterruptBlock => b.kind === "interrupt");
  return (
    <div className="agent-turn__body">
      {block ? <InterruptCard interrupt={block.interrupt} onSubmit={() => {}} /> : null}
    </div>
  );
}

/* ------------------------------- todo ------------------------------- */

const TodoRunningDemo = () => (
  <StoreDemo scenarioId="success" select={selectTodoMid} live>
    <TodoPanel />
  </StoreDemo>
);

/**
 * 全部完成：TodoPanel 在全完成 260ms 后自动收起卸载（组件固有行为），
 * 这里循环重挂载演示「全完成 → 淡出」的完整过程；页面重播按钮同样可再看一次。
 */
function TodoAllDoneDemo() {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setCycle((value) => value + 1), 3200);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <StoreDemo scenarioId="success">
      <TodoPanel key={cycle} />
    </StoreDemo>
  );
}

/* ------------------------------- evidence ------------------------------- */

/** 行内角标：悬停出来源预览；句子为内联双语演示数据。 */
function EvidenceMarkersDemo() {
  const { locale } = useDemoLocale();
  const zh = locale === "zh-CN";
  return (
    <StoreDemo scenarioId="success">
      <div className="agent-turn__body">
        <p className="comp-evidence-line">
          {zh ? "本次拟募集资金不超过 12.8 亿元" : "Planned proceeds are capped at RMB 1.28B"}
          <EvidenceMarker index={1} />
          {zh ? "，较 2024 年方案上调约 18%" : ", up ~18% over the 2024 plan"}
          <EvidenceMarker index={2} />
          {zh ? "；补充流动资金比例上调至 30%。" : "; the working-capital share rose to 30%."}
          <EvidenceMarker index={5} />
        </p>
      </div>
    </StoreDemo>
  );
}

const EvidenceListDemo = () => (
  <StoreDemo scenarioId="success">
    <div className="agent-turn__body">
      <EvidenceList />
    </div>
  </StoreDemo>
);

/* ------------------------------- artifact ------------------------------- */

/** 产物卡：点击在中央工作台打开 markdown 预览；select 决定草稿 / 已定稿。 */
function ArtifactDemo({ select }: { select?: (scenario: Scenario) => PlaybackStep[] }) {
  const { dict, locale } = useDemoLocale();
  const scenario = useScenario("success");
  const store = useMemo(
    () => buildDemoStore(select ? select(scenario) : scenario.steps, locale),
    [scenario, select, locale],
  );
  const artifact = store.getState().artifacts[0];
  const [open, setOpen] = useState(false);
  if (!artifact) return null;
  return (
    <div className="agent-artifacts">
      <ArtifactCard artifact={artifact} onOpen={() => setOpen(true)} />
      <ContentModal
        open={open}
        onOpenChange={setOpen}
        overline={dict.components.notes.artifactPreview}
        title={artifact.logical_path}
      >
        <StreamingMarkdown text={artifact.preview_content ?? ""} renderCitation={() => null} />
      </ContentModal>
    </div>
  );
}

const ArtifactDraftDemo = () => <ArtifactDemo select={selectArtifactDraft} />;
const ArtifactPublishedDemo = () => <ArtifactDemo />;

/* ------------------------------- rich-content ------------------------------- */

const RichAllDemo = () => (
  <StoreDemo scenarioId="richviz">
    <StoreBlockView kind="text" />
  </StoreDemo>
);

/** 单张图表卡：ChartBlock 脱离正文直渲染；spec 为内联双语演示数据。 */
function RichChartDemo() {
  const { locale } = useDemoLocale();
  const zh = locale === "zh-CN";
  const source = zh
    ? `{ "type": "line", "title": "月度交付量对比", "sub": "2026 年 1–6 月 · 万辆", "unit": "万辆",
  "x": ["1月","2月","3月","4月","5月","6月"],
  "series": [
    { "name": "晨风汽车", "data": [3.2,3.5,4.1,3.9,4.6,5.2] },
    { "name": "岚湖汽车", "data": [2.8,2.9,3.3,3.6,3.4,3.8] }
  ], "source": "ERP 销售明细" }`
    : `{ "type": "line", "title": "Monthly Deliveries", "sub": "Jan–Jun 2026 · 10k units", "unit": "10k units",
  "x": ["Jan","Feb","Mar","Apr","May","Jun"],
  "series": [
    { "name": "Chenfeng Auto", "data": [3.2,3.5,4.1,3.9,4.6,5.2] },
    { "name": "Lanhu Auto", "data": [2.8,2.9,3.3,3.6,3.4,3.8] }
  ], "source": "ERP sales detail" }`;
  return <ChartBlock source={source} closed />;
}

/* ------------------------------- process-group ------------------------------- */

/** success 场景的 4 个工具块收进过程折叠组（耗时取 run 起止时间戳）。 */
function StoreProcessGroup({ withDuration }: { withDuration: boolean }) {
  const state = useRunState();
  const blocks = state.blocks.filter((b) => b.kind === "tool");
  if (blocks.length === 0) return null;
  const durationMs =
    withDuration && state.completedAt && state.startedAt ? state.completedAt - state.startedAt : undefined;
  return <ProcessGroup blocks={blocks} durationMs={durationMs} />;
}

const ProcessGroupDurationDemo = () => (
  <StoreDemo scenarioId="success">
    <StoreProcessGroup withDuration />
  </StoreDemo>
);
const ProcessGroupNoDurationDemo = () => (
  <StoreDemo scenarioId="success">
    <StoreProcessGroup withDuration={false} />
  </StoreDemo>
);

/* ------------------------------- user-message ------------------------------- */

function UserMessagePlainDemo() {
  const { locale } = useDemoLocale();
  const zh = locale === "zh-CN";
  return (
    <UserMessage
      text={
        zh
          ? "分析一下 XX 公司最近的三份定向增发公告，重点比对募资规模和定价机制。"
          : "Analyze XX Company's three recent private placement announcements, focusing on proceeds size and pricing mechanism."
      }
    />
  );
}

/** 带附件 + 行内编辑（编辑结果直接回写气泡）。 */
function UserMessageAttachmentDemo() {
  const { locale } = useDemoLocale();
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

/* ------------------------------- composer ------------------------------- */

/** 独立可输入，提交内容回显在下方。 */
function ComposerEchoDemo() {
  const { dict } = useDemoLocale();
  const [submitted, setSubmitted] = useState("");
  return (
    <>
      <Composer onSubmit={(value: ComposerSubmit) => setSubmitted(value.text)} />
      {submitted ? (
        <p className="comp-echo">{interpolate(dict.components.notes.composerEcho, { text: submitted })}</p>
      ) : null}
    </>
  );
}

const ComposerDisabledDemo = () => <Composer disabled />;

/* ------------------------------- cards ------------------------------- */

/** 进度 + 复核卡：可真实决策（approve / reject 后卡片转终态文案）。 */
function ReviewCardsDemo() {
  const { locale } = useDemoLocale();
  const zh = locale === "zh-CN";
  const progress: TaskProgress = {
    task_id: "task_demo",
    skill_id: "deep-research",
    skill_label: zh ? "深度研究" : "Deep research",
    stage_id: "stage_review",
    stage_label: zh ? "成果复核" : "Result review",
    status: "awaiting_review",
  };
  const baseRequest: TaskReview = {
    review_id: "rev_demo",
    task_id: "task_demo",
    title: zh ? "复核研究报告" : "Review the research report",
    summary: zh
      ? "报告已生成，含三份公告的口径比对结论；请确认是否进入发布阶段。"
      : "The report comparing the three announcements is ready; confirm whether to move on to publishing.",
    allowed_next_stages: [
      { id: "stage_publish", label: zh ? "发布结果" : "Publish results" },
      { id: "stage_revise", label: zh ? "修订后重审" : "Revise & re-review" },
    ],
    status: "pending",
  };
  const [decision, setDecision] = useState<{ value: TaskReviewDecision; nextStageId?: string } | null>(null);
  const request: TaskReview = decision
    ? {
        ...baseRequest,
        status: decision.value === "approve" ? "approved" : "rejected",
        decision: decision.value,
        next_stage_id: decision.nextStageId,
      }
    : baseRequest;
  const review: TaskReviewViewState = {
    request,
    settled: decision !== null,
    actionState: decision ? "succeeded" : "idle",
  };
  return (
    <>
      <TaskProgressCard progress={progress} />
      <TaskReviewCard
        review={review}
        progress={progress}
        onDecision={(value, nextStageId) => setDecision({ value, nextStageId })}
        readOnly={false}
      />
    </>
  );
}

/** 错误卡 + 连接浮条：点「重试」短暂进入重连中，再回落恢复失败（模拟重连不成）。 */
function StatusCardsDemo() {
  const { locale } = useDemoLocale();
  const zh = locale === "zh-CN";
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
    <>
      <RunErrorCard
        error={{
          code: "dependency_unavailable",
          message: zh
            ? "文档解析服务暂不可用，本轮无法继续"
            : "The document parsing service is temporarily unavailable; this run cannot continue",
          retryable: true,
        }}
        retryable
        onRetry={retry}
      />
      <ConnectionBanner
        connection={retrying ? "reconnecting" : "recovery_failed"}
        failure={{
          kind: "network",
          message: zh
            ? "网络连接已断开，快照恢复失败。"
            : "The network connection was lost; snapshot recovery failed.",
          retryable: true,
        }}
        onRetry={retry}
      />
    </>
  );
}

/* ------------------------------- 注册表 ------------------------------- */

export const COMPONENT_REGISTRY: Record<ComponentSlug, ComponentEntry> = {
  thread: {
    variants: [
      {
        labelKey: "streaming",
        code: `const store = buildDemoStore(success.steps, locale, true);

<RunStoreContext.Provider value={store}>
  <RunThread
    pastTurns={[]}
    liveUser={{ text: success.userPrompt, attachments: [] }}
    onSubmitInterrupt={submit}
    onRetryTurn={replay}
    onBranchTurn={branch}
    activeArtifact={null}
    onOpenArtifact={openArtifact}
    activeAgent={null}
    onOpenAgent={openAgent}
  />
</RunStoreContext.Provider>`,
        Demo: ThreadSuccessDemo,
      },
      {
        labelKey: "failed",
        code: `const store = buildDemoStore(fail.steps, locale, true);

<RunStoreContext.Provider value={store}>
  <RunThread pastTurns={[]} liveUser={liveUser} onRetryTurn={replay} {...rest} />
</RunStoreContext.Provider>`,
        Demo: ThreadFailDemo,
      },
    ],
    usage: `import { RunStoreContext, RunThread } from "@aidenhoey/agent-ui";

<RunStoreContext.Provider value={liveStore}>
  <RunThread
    pastTurns={pastTurns}
    liveUser={liveUser}
    onSubmitInterrupt={submitResolution}
    onRetryTurn={retryTurn}
    onBranchTurn={branchTurn}
    activeArtifact={activeArtifact}
    onOpenArtifact={openArtifact}
    activeAgent={activeAgent}
    onOpenAgent={openAgent}
  />
</RunStoreContext.Provider>`,
    props: [
      { name: "pastTurns", type: "Turn[]" },
      { name: "liveUser", type: "SentMessage" },
      { name: "onSubmitInterrupt", type: "(resolution: Record<string, unknown>) => void" },
      { name: "onRetryTurn", type: "(target: number | \"live\") => void" },
      { name: "onBranchTurn", type: "(target: number) => void" },
      { name: "onOpenArtifact", type: "(turnId, store, artifact) => void" },
    ],
  },

  message: {
    variants: [
      {
        labelKey: "streaming",
        code: `const steps = stepsUpToEvent(success, isTextDelta, 4);
const store = buildDemoStore(steps, locale, true);

<RunStoreContext.Provider value={store}>
  <TextBlock block={textBlock} />
</RunStoreContext.Provider>`,
        Demo: MessageStreamingDemo,
      },
      {
        labelKey: "completed",
        code: `const store = buildDemoStore(success.steps, locale); // replay：直出终态

<RunStoreContext.Provider value={store}>
  <TextBlock block={textBlock} />
</RunStoreContext.Provider>`,
        Demo: MessageCompletedDemo,
      },
    ],
    usage: `import { RunStoreContext, TextBlock } from "@aidenhoey/agent-ui";

<RunStoreContext.Provider value={store}>
  <TextBlock block={block} />
</RunStoreContext.Provider>`,
    props: [{ name: "block", type: "TextBlockView" }],
  },

  reasoning: {
    variants: [
      {
        labelKey: "thinking",
        code: `<ReasoningBlock
  block={{ block_id: "demo", kind: "reasoning", order: 0, status: "thinking" }}
/>`,
        Demo: ReasoningThinkingDemo,
      },
      {
        labelKey: "completed",
        code: `<ReasoningBlock
  block={{
    block_id: "demo",
    kind: "reasoning",
    order: 0,
    status: "done",
    durationMs: 4200,
    text: reasoningText,
  }}
/>`,
        Demo: ReasoningDoneDemo,
      },
    ],
    usage: `import { ReasoningBlock } from "@aidenhoey/agent-ui";

<ReasoningBlock block={block} />`,
    props: [{ name: "block", type: "ReasoningBlockView" }],
  },

  "tool-call": {
    variants: [
      {
        labelKey: "running",
        hint: "code.execute",
        code: `const steps = stepsUpToEvent(exec, isToolProgress);
const store = buildDemoStore(steps, locale, true);

<RunStoreContext.Provider value={store}>
  <ToolCallBlock block={execBlock} />
</RunStoreContext.Provider>`,
        Demo: ToolRunningDemo,
      },
      {
        labelKey: "completed",
        hint: "file.read",
        code: `const store = buildDemoStore(success.steps, locale);

<RunStoreContext.Provider value={store}>
  <ToolCallBlock block={readBlock} />
</RunStoreContext.Provider>`,
        Demo: ToolCompletedDemo,
      },
      {
        labelKey: "failed",
        hint: "file.read",
        code: `const store = buildDemoStore(fail.steps, locale);

<RunStoreContext.Provider value={store}>
  <ToolCallBlock block={readBlock} />
</RunStoreContext.Provider>`,
        Demo: ToolFailedDemo,
      },
    ],
    usage: `import { RunStoreContext, ToolCallBlock } from "@aidenhoey/agent-ui";

<RunStoreContext.Provider value={store}>
  <ToolCallBlock block={block} />
</RunStoreContext.Provider>`,
    props: [{ name: "block", type: "ToolBlock" }],
  },

  sandbox: {
    variants: [
      {
        labelKey: "running",
        code: `<SandboxBlock
  block={{ block_id: "demo", kind: "sandbox", order: 0, status: "running", stage: "running", percent: 46 }}
/>`,
        Demo: SandboxRunningDemo,
      },
      {
        labelKey: "preparing",
        code: `<SandboxBlock
  block={{ block_id: "demo", kind: "sandbox", order: 0, status: "running", stage: "preparing" }}
/>`,
        Demo: SandboxPreparingDemo,
      },
      {
        labelKey: "collecting",
        code: `<SandboxBlock
  block={{ block_id: "demo", kind: "sandbox", order: 0, status: "running", stage: "collecting-outputs", percent: 92 }}
/>`,
        Demo: SandboxCollectingDemo,
      },
      {
        labelKey: "completed",
        code: `<SandboxBlock
  block={{ block_id: "demo", kind: "sandbox", order: 0, status: "completed", exitCode: 0, durationMs: 8340, outputCount: 2 }}
/>`,
        Demo: SandboxCompletedDemo,
      },
      {
        labelKey: "failed",
        code: `<SandboxBlock
  block={{ block_id: "demo", kind: "sandbox", order: 0, status: "failed", failureCode: "deadline_exceeded", durationMs: 12000 }}
/>`,
        Demo: SandboxFailedDemo,
      },
    ],
    usage: `import { SandboxBlock } from "@aidenhoey/agent-ui";

<SandboxBlock block={block} />`,
    props: [{ name: "block", type: "SandboxBlockView" }],
  },

  interrupt: {
    variants: [
      {
        labelKey: "interactive",
        hint: "clarification",
        code: `const { head, tail } = splitAtPause(clarify);
const store = buildDemoStore(head, locale, true);

// 提交 = 把暂停后的剩余事件续播进 store（resolution 换成用户提交）
replayTail(store, tail, resolution);`,
        Demo: InterruptClarifyDemo,
      },
      {
        labelKey: "interactive",
        hint: "plan_approval",
        code: `const { head, tail } = splitAtPause(plan);
const store = buildDemoStore(head, locale, true);

replayTail(store, tail, resolution);`,
        Demo: InterruptPlanDemo,
      },
      {
        labelKey: "resolved",
        hint: "plan_approval",
        code: `const store = buildDemoStore(plan.steps, locale);
const block = store.getState().blocks.find((b) => b.kind === "interrupt");

<InterruptCard interrupt={block.interrupt} onSubmit={() => {}} />`,
        Demo: InterruptResolvedDemo,
      },
    ],
    usage: `import { InterruptCard } from "@aidenhoey/agent-ui";

<InterruptCard interrupt={interrupt} onSubmit={submitResolution} />`,
    props: [
      { name: "interrupt", type: "ActiveInterrupt" },
      { name: "onSubmit", type: "(resolution: Record<string, unknown>) => void" },
      { name: "readOnly", type: "boolean" },
    ],
  },

  todo: {
    variants: [
      {
        labelKey: "running",
        code: `const steps = stepsUpToEvent(success, isTodoDelta, 3);
const store = buildDemoStore(steps, locale, true);

<RunStoreContext.Provider value={store}>
  <TodoPanel />
</RunStoreContext.Provider>`,
        Demo: TodoRunningDemo,
      },
      {
        labelKey: "allCompleted",
        code: `const store = buildDemoStore(success.steps, locale);

<RunStoreContext.Provider value={store}>
  <TodoPanel />
</RunStoreContext.Provider>`,
        Demo: TodoAllDoneDemo,
      },
    ],
    usage: `import { RunStoreContext, TodoPanel } from "@aidenhoey/agent-ui";

<RunStoreContext.Provider value={store}>
  <TodoPanel />
</RunStoreContext.Provider>`,
    props: [],
  },

  evidence: {
    variants: [
      {
        labelKey: "markers",
        code: `<RunStoreContext.Provider value={store}>
  <p>
    Planned proceeds are capped at RMB 1.28B
    <EvidenceMarker index={1} />
    .
  </p>
</RunStoreContext.Provider>`,
        Demo: EvidenceMarkersDemo,
      },
      {
        labelKey: "sourceList",
        code: `<RunStoreContext.Provider value={store}>
  <EvidenceList />
</RunStoreContext.Provider>`,
        Demo: EvidenceListDemo,
      },
    ],
    usage: `import { EvidenceList, EvidenceMarker, RunStoreContext } from "@aidenhoey/agent-ui";

<RunStoreContext.Provider value={store}>
  <p>
    ...<EvidenceMarker index={1} />...
  </p>
  <EvidenceList />
</RunStoreContext.Provider>`,
    props: [
      { name: "EvidenceMarker · index", type: "number" },
      { name: "EvidenceList", type: "—" },
    ],
  },

  artifact: {
    variants: [
      {
        labelKey: "draft",
        code: `const steps = stepsUpToEvent(success, isArtifactDelta);
const store = buildDemoStore(steps, locale); // committed=false → 草稿态

<ArtifactCard artifact={store.getState().artifacts[0]} onOpen={openPreview} />`,
        Demo: ArtifactDraftDemo,
      },
      {
        labelKey: "published",
        code: `const store = buildDemoStore(success.steps, locale); // committed=true → 已定稿

<ArtifactCard artifact={store.getState().artifacts[0]} onOpen={openPreview} />`,
        Demo: ArtifactPublishedDemo,
      },
    ],
    usage: `import { ArtifactCard } from "@aidenhoey/agent-ui";

<ArtifactCard artifact={artifact} onOpen={openPreview} />`,
    props: [
      { name: "artifact", type: "ArtifactView" },
      { name: "active", type: "boolean" },
      { name: "onOpen", type: "(artifact: ArtifactView) => void" },
    ],
  },

  "rich-content": {
    variants: [
      {
        labelKey: "allFences",
        code: `const store = buildDemoStore(richviz.steps, locale);

<RunStoreContext.Provider value={store}>
  <TextBlock block={richTextBlock} />
</RunStoreContext.Provider>`,
        Demo: RichAllDemo,
      },
      {
        labelKey: "chartCard",
        code: `<ChartBlock source={chartSpecJson} closed />`,
        Demo: RichChartDemo,
      },
    ],
    usage: `import { ChartBlock, MermaidBlock, RichBlock } from "@aidenhoey/agent-ui";

<ChartBlock source={chartSpecJson} closed />
<MermaidBlock source={mermaidSource} closed />
<RichBlock kind="svg" source={svgMarkup} closed />`,
    props: [
      { name: "RichBlock · kind", type: "\"svg\" | \"html\"" },
      { name: "RichBlock · source", type: "string" },
      { name: "ChartBlock / MermaidBlock · source", type: "string" },
      { name: "closed", type: "boolean" },
    ],
  },

  "process-group": {
    variants: [
      {
        labelKey: "collapsed",
        hint: "durationMs",
        code: `const blocks = state.blocks.filter((b) => b.kind === "tool");

<ProcessGroup blocks={blocks} durationMs={completedAt - startedAt} />`,
        Demo: ProcessGroupDurationDemo,
      },
      {
        labelKey: "withoutDuration",
        code: `const blocks = state.blocks.filter((b) => b.kind === "tool");

<ProcessGroup blocks={blocks} />`,
        Demo: ProcessGroupNoDurationDemo,
      },
    ],
    usage: `import { ProcessGroup } from "@aidenhoey/agent-ui";

<ProcessGroup blocks={intermediateBlocks} durationMs={durationMs} />`,
    props: [
      { name: "blocks", type: "RunBlock[]" },
      { name: "durationMs", type: "number" },
    ],
  },

  "user-message": {
    variants: [
      {
        labelKey: "plain",
        code: `<UserMessage text={text} />`,
        Demo: UserMessagePlainDemo,
      },
      {
        labelKey: "withAttachment",
        code: `<UserMessage text={text} attachments={attachments} onEdit={setText} />`,
        Demo: UserMessageAttachmentDemo,
      },
    ],
    usage: `import { UserMessage } from "@aidenhoey/agent-ui";

<UserMessage text={text} attachments={attachments} onEdit={setText} />`,
    props: [
      { name: "text", type: "string" },
      { name: "attachments", type: "MessageAttachment[]" },
      { name: "onEdit", type: "(newText: string) => void" },
      { name: "draftKey", type: "string" },
    ],
  },

  composer: {
    variants: [
      {
        labelKey: "interactive",
        code: `const [submitted, setSubmitted] = useState("");

<Composer onSubmit={(value: ComposerSubmit) => setSubmitted(value.text)} />
{submitted ? <p>{submitted}</p> : null}`,
        Demo: ComposerEchoDemo,
      },
      {
        labelKey: "disabled",
        code: `<Composer disabled />`,
        Demo: ComposerDisabledDemo,
      },
    ],
    usage: `import { Composer, type ComposerSubmit } from "@aidenhoey/agent-ui";

<Composer onSubmit={(value: ComposerSubmit) => send(value)} />`,
    props: [
      { name: "onSubmit", type: "(value: ComposerSubmit) => void" },
      { name: "placeholder", type: "string" },
      { name: "disabled", type: "boolean" },
      { name: "busy", type: "boolean" },
    ],
  },

  cards: {
    variants: [
      {
        labelKey: "reviewFlow",
        code: `const [decision, setDecision] = useState(null);

<TaskProgressCard progress={progress} />
<TaskReviewCard
  review={toReviewView(request, decision)}
  progress={progress}
  onDecision={setDecision}
  readOnly={false}
/>`,
        Demo: ReviewCardsDemo,
      },
      {
        labelKey: "runStatus",
        code: `<RunErrorCard error={error} retryable={error.retryable} onRetry={retry} />
<ConnectionBanner connection="recovery_failed" failure={failure} onRetry={reconnect} />`,
        Demo: StatusCardsDemo,
      },
    ],
    usage: `import {
  ConnectionBanner,
  RunErrorCard,
  TaskProgressCard,
  TaskReviewCard,
} from "@aidenhoey/agent-ui";

<TaskProgressCard progress={progress} />
<TaskReviewCard review={review} progress={progress} onDecision={decide} readOnly={false} />
<RunErrorCard error={error} retryable={error.retryable} onRetry={retry} />
<ConnectionBanner connection={connection} failure={failure} onRetry={reconnect} />`,
    props: [
      { name: "TaskProgressCard · progress", type: "TaskProgress" },
      { name: "TaskReviewCard · review", type: "TaskReviewViewState" },
      { name: "TaskReviewCard · onDecision", type: "(decision, nextStageId?) => void" },
      { name: "RunErrorCard · error", type: "PublicError" },
      { name: "RunErrorCard · onRetry", type: "() => void" },
      { name: "ConnectionBanner · connection", type: "ConnectionState" },
      { name: "ConnectionBanner · onRetry", type: "() => void" },
    ],
  },
};
