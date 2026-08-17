/**
 * components 域：文档站组件页（/components/:slug）模板文案 —— 页内分区标签
 * （preview / code / replay / variant / installation / usage / props / examples）
 * 与 14 个组件条目的名称 + 一句话描述。
 *
 * 归组件页 agent 维护：接口与 en-US / zh-CN 两份值同构增补；页面正文文案在
 * app 侧页面文件内补，不进本域（本域只承载模板标签与组件元信息）。
 */

/** 组件页 slug（路由参数 /components/:slug 与侧导航、components 记录共用）。 */
export type ComponentSlug =
  | "thread"
  | "message"
  | "reasoning"
  | "tool-call"
  | "sandbox"
  | "interrupt"
  | "todo"
  | "evidence"
  | "artifact"
  | "rich-content"
  | "process-group"
  | "user-message"
  | "composer"
  | "cards";

/** 侧导航 / 索引页的组件顺序（键序即展示序）。 */
export const COMPONENT_SLUGS: readonly ComponentSlug[] = [
  "thread",
  "message",
  "reasoning",
  "tool-call",
  "sandbox",
  "interrupt",
  "todo",
  "evidence",
  "artifact",
  "rich-content",
  "process-group",
  "user-message",
  "composer",
  "cards",
];

/** 单个组件条目：展示名 + 一句话描述。 */
export interface ComponentEntryCopy {
  /** 组件展示名（如 "Thread · 运行线程"）。 */
  title: string;
  /** 一句话描述（组件在 run 时间线里的职责）。 */
  description: string;
}

/** demo 变体标签的键（registry 每个变体的 labelKey 指向这里）。 */
export type ComponentVariantKey =
  | "streaming"
  | "completed"
  | "failed"
  | "running"
  | "thinking"
  | "resolved"
  | "interactive"
  | "preparing"
  | "collecting"
  | "draft"
  | "published"
  | "plain"
  | "withAttachment"
  | "allCompleted"
  | "markers"
  | "sourceList"
  | "allFences"
  | "chartCard"
  | "collapsed"
  | "withoutDuration"
  | "reviewFlow"
  | "runStatus"
  | "disabled";

export interface ComponentsDict {
  /** 组件页模板的分区 / 控件标签。 */
  labels: {
    /** live demo 与源码的切换 tab。 */
    preview: string;
    code: string;
    /** 重播 demo（重建 store 重演场景）。 */
    replay: string;
    /** demo 变体小标签前缀（流式 / 运行中 / 失败…）。 */
    variant: string;
    installation: string;
    usage: string;
    props: string;
    examples: string;
  };
  /** 组件元信息：键即 slug（与路由参数一致）。 */
  components: Record<ComponentSlug, ComponentEntryCopy>;
  /** demo 变体小标签（流式 / 运行中 / 失败 / 已答复…）。 */
  variants: Record<ComponentVariantKey, string>;
  /** 模板辅助文案。 */
  notes: {
    /** installation 命令块下的说明（shadcn registry 即将支持）。 */
    installation: string;
    /** composer demo 提交回显（{text} 插值）。 */
    composerEcho: string;
    /** 产物预览模态的 overline。 */
    artifactPreview: string;
    /** 无 props 组件（store 驱动）的 props 区说明。 */
    propsEmpty: string;
  };
  /** props 简表表头。 */
  propsTable: {
    name: string;
    type: string;
    description: string;
  };
  /** 各组件 props 描述：props[slug][propName]，propName 与 registry 属性行 name 一致。 */
  props: Record<ComponentSlug, Record<string, string>>;
}

export const enUS: ComponentsDict = {
  labels: {
    preview: "Preview",
    code: "Code",
    replay: "Replay",
    variant: "Variant",
    installation: "Installation",
    usage: "Usage",
    props: "Props",
    examples: "Examples",
  },
  components: {
    thread: {
      title: "Thread · Run thread",
      description:
        "The full run timeline: user prompt, streamed blocks, process fold, artifacts and error states composed into one scrollable thread.",
    },
    message: {
      title: "Message · Text block",
      description:
        "The run's body output: streams in with a typewriter while live and settles when done; markdown and [n] citation markers render inline.",
    },
    reasoning: {
      title: "ReasoningBlock · Reasoning",
      description:
        "The safe projection of reasoning: a shimmering status line while thinking; once done it folds into a row that expands to the reasoning text.",
    },
    "tool-call": {
      title: "ToolCallBlock · Tool calls",
      description:
        "Lifecycle of search / file / execute tool calls: spinner while running, result summary when completed, and the cause when failed.",
    },
    sandbox: {
      title: "SandboxBlock · Sandbox run",
      description:
        "The safe public projection of sandbox execution: staged progress with percent, a success summary, and stable failure codes.",
    },
    interrupt: {
      title: "InterruptCard · Human-in-the-loop",
      description:
        "Clarification and plan-approval cards that really submit: on submit the scenario's remaining events replay into the store and the card flips to resolved.",
    },
    todo: {
      title: "TodoPanel · Task list",
      description:
        "The agent-maintained whole-list snapshot: collapsed to a one-line progress summary, expandable to the full list; fades away once everything is done.",
    },
    evidence: {
      title: "EvidenceMarker & EvidenceList · Citations",
      description:
        "Hover a [n] marker for a source preview; the run footer lists all sources and folds everything beyond the first two.",
    },
    artifact: {
      title: "ArtifactCard · Artifacts",
      description:
        "File cards produced by the run (draft / committed); click to open the centered workbench with a markdown preview.",
    },
    "rich-content": {
      title: "RichBlock · Rich content",
      description:
        "Chart / mermaid / svg / html fence cards inside the body text; each supports source view and centered expansion.",
    },
    "process-group": {
      title: "ProcessGroup · Process fold",
      description:
        "After a run completes, the intermediate steps fold into a one-line summary with duration; click to expand and review them step by step.",
    },
    "user-message": {
      title: "UserMessage · User message",
      description:
        "The user prompt bubble: attachment file cards, copy, and inline editing (⌘/Ctrl+Enter to submit, Esc to cancel).",
    },
    composer: {
      title: "Composer · Input",
      description:
        "The Tiptap rich-text composer: Enter to send, Shift+Enter for a newline, attachments and skill nodes included.",
    },
    cards: {
      title: "Cards · Status & error cards",
      description:
        "The run-failure error card (retryable), the non-intrusive connection banner, and task progress / review cards.",
    },
  },
  variants: {
    streaming: "Streaming",
    completed: "Completed",
    failed: "Failed",
    running: "Running",
    thinking: "Thinking",
    resolved: "Resolved",
    interactive: "Interactive",
    preparing: "Preparing",
    collecting: "Collecting outputs",
    draft: "Draft",
    published: "Published",
    plain: "Plain text",
    withAttachment: "With attachment",
    allCompleted: "All done · auto-dismiss",
    markers: "Inline markers",
    sourceList: "Source list",
    allFences: "chart · mermaid · svg · html",
    chartCard: "Single chart card",
    collapsed: "Collapsed",
    withoutDuration: "Without duration",
    reviewFlow: "Progress & review",
    runStatus: "Error & connection",
    disabled: "Disabled",
  },
  notes: {
    installation:
      "Registry support is coming soon — once published, this command installs the component source into your project.",
    composerEcho: "Submitted: {text}",
    artifactPreview: "Artifact preview",
    propsEmpty: "No props — this component reads its data from RunStoreContext.",
  },
  propsTable: {
    name: "Name",
    type: "Type",
    description: "Description",
  },
  props: {
    thread: {
      pastTurns: "History turns rendered as frozen snapshots above the live turn.",
      liveUser: "The current turn's user prompt (SentMessage: text, attachments, skill echo).",
      onSubmitInterrupt: "Called with the field-level resolution when the live interrupt card submits.",
      onRetryTurn: "Retry a turn: an index for history turns, \"live\" for the current one.",
      onBranchTurn: "Branch a new conversation from a history turn.",
      onOpenArtifact: "Open an artifact in the workbench; receives the turn id, store and artifact.",
    },
    message: {
      block: "Text block view data; the typewriter plays by itself while the store connection is \"live\".",
    },
    reasoning: {
      block: "Reasoning view data: \"thinking\" renders the shimmer line; \"done\" folds into an expandable row with durationMs.",
    },
    "tool-call": {
      block: "Tool view data: status running / completed / failed drives the spinner, the result summary or the failure cause.",
    },
    sandbox: {
      block: "Sandbox public projection: stage + percent while running, exitCode / outputCount on success, failureCode on failure.",
    },
    interrupt: {
      interrupt: "The active interrupt projection (clarification form or plan approval); carries its resolution once answered.",
      onSubmit: "Called with the resolution object; the remaining scenario events then replay into the store and close the card.",
      readOnly: "Freeze the card (history turns); leave unset to render an interactive unresolved card.",
    },
    todo: {},
    evidence: {
      "EvidenceMarker · index": "The citation number shown by the marker; source data comes from the run store.",
      EvidenceList: "No props — lists every source of the run from the store and folds all but the first two.",
    },
    artifact: {
      artifact: "Artifact view data: committed=false renders the draft style, true the published style.",
      active: "Marks the card as the one currently open in the workbench.",
      onOpen: "Called when the card is clicked — open the centered preview modal here.",
    },
    "rich-content": {
      "RichBlock · kind": "Fence language rendered by RichBlock: svg / html.",
      "RichBlock · source": "The raw svg / html markup.",
      "ChartBlock / MermaidBlock · source": "A chart JSON spec or mermaid source.",
      closed: "Whether the fence closed while streaming; an unclosed fence renders the source view.",
    },
    "process-group": {
      blocks: "The intermediate blocks to fold (reasoning / tool calls / early text).",
      durationMs: "Optional run duration shown in the summary line.",
    },
    "user-message": {
      text: "The prompt text; overlong content collapses behind an expander.",
      attachments: "File / image attachments rendered as cards above the text.",
      onEdit: "Enables inline editing; called with the new text on submit.",
      draftKey: "Draft-registry key that preserves the editing state across SPA navigation.",
    },
    composer: {
      onSubmit: "Called with a ComposerSubmit (text, attachments, skill, idempotency key).",
      placeholder: "Overrides the placeholder; defaults to the built-in localized copy.",
      disabled: "Disables input and sending entirely.",
      busy: "Agent busy: typing stays enabled while the main button switches to Stop.",
    },
    cards: {
      "TaskProgressCard · progress": "TaskProgress projection: skill label, current stage and lifecycle status.",
      "TaskReviewCard · review": "TaskReviewViewState: the review request plus the local action state.",
      "TaskReviewCard · onDecision": "Called with approve / reject and the chosen next stage.",
      "RunErrorCard · error": "The run failure (code, message, retryable).",
      "RunErrorCard · onRetry": "Retry callback shown when the error is retryable.",
      "ConnectionBanner · connection": "Connection state; the banner only renders for reconnecting / recovery_failed.",
      "ConnectionBanner · onRetry": "Manual reconnect callback for recovery_failed.",
    },
  },
};

export const zhCN: ComponentsDict = {
  labels: {
    preview: "预览",
    code: "代码",
    replay: "重播",
    variant: "变体",
    installation: "安装",
    usage: "用法",
    props: "属性",
    examples: "示例",
  },
  components: {
    thread: {
      title: "Thread · 运行线程",
      description: "完整 run 时间线：用户提问、流式块、过程折叠、产物与错误态组合成一条可滚动线程。",
    },
    message: {
      title: "Message · 正文块",
      description: "run 的正文输出：live 时打字机逐字推进、完成后定格；markdown 与 [n] 引用角标内联渲染。",
    },
    reasoning: {
      title: "ReasoningBlock · 推理块",
      description: "推理过程的安全投影：思考中为微光状态行，完成后收成一行，可展开查看推理原文。",
    },
    "tool-call": {
      title: "ToolCallBlock · 工具调用",
      description: "检索 / 读写 / 执行等工具调用的生命周期：运行中转圈、完成给结果摘要、失败带原因。",
    },
    sandbox: {
      title: "SandboxBlock · 沙箱运行",
      description: "沙箱执行的安全公共投影：分阶段进度与百分比、成功摘要、稳定失败码。",
    },
    interrupt: {
      title: "InterruptCard · 人机交互卡",
      description: "澄清提问与计划审批：表单可真实提交 —— 提交后把场景剩余事件续播进 store，卡片随即转为已答复。",
    },
    todo: {
      title: "TodoPanel · 任务清单",
      description: "agent 维护的整单快照：收起为一行进度摘要，展开看全单；全部完成后自动收起淡出。",
    },
    evidence: {
      title: "EvidenceMarker & EvidenceList · 来源引用",
      description: "正文 [n] 角标悬停出来源预览；run 末尾汇总全部来源，两条之外折叠收起。",
    },
    artifact: {
      title: "ArtifactCard · 产物卡",
      description: "run 产出的文件卡片（草稿 / 已定稿），点击在中央工作台打开 markdown 预览。",
    },
    "rich-content": {
      title: "RichBlock · 富内容围栏",
      description: "正文内的 chart / mermaid / svg / html 四种围栏卡，每张可切源码、居中展开。",
    },
    "process-group": {
      title: "ProcessGroup · 过程折叠",
      description: "run 完成后把中间过程收进一行摘要（含耗时），点击展开逐步回看。",
    },
    "user-message": {
      title: "UserMessage · 用户消息",
      description: "用户提问气泡：附件文件卡、复制与行内编辑（⌘/Ctrl+Enter 提交，Esc 取消）。",
    },
    composer: {
      title: "Composer · 输入框",
      description: "Tiptap 富文本输入框：Enter 发送、Shift+Enter 换行，支持附件与技能节点。",
    },
    cards: {
      title: "Cards · 状态与错误卡",
      description: "运行失败错误卡（可重试重演）、非侵入式连接状态浮条，以及任务进度 / 复核卡。",
    },
  },
  variants: {
    streaming: "流式中",
    completed: "已完成",
    failed: "失败",
    running: "运行中",
    thinking: "思考中",
    resolved: "已答复",
    interactive: "可交互",
    preparing: "准备中",
    collecting: "收集产物",
    draft: "草稿",
    published: "已发布",
    plain: "纯文本",
    withAttachment: "带附件",
    allCompleted: "全部完成 · 自动收起",
    markers: "行内角标",
    sourceList: "来源列表",
    allFences: "chart · mermaid · svg · html",
    chartCard: "单张图表卡",
    collapsed: "折叠",
    withoutDuration: "无耗时",
    reviewFlow: "进度与复核",
    runStatus: "错误与连接",
    disabled: "禁用",
  },
  notes: {
    installation: "registry 支持即将上线 —— 发布后，该命令会把组件源码装入你的工程。",
    composerEcho: "已提交：{text}",
    artifactPreview: "产物预览",
    propsEmpty: "无 props —— 该组件的数据来自 RunStoreContext。",
  },
  propsTable: {
    name: "名称",
    type: "类型",
    description: "描述",
  },
  props: {
    thread: {
      pastTurns: "历史轮次，以冻结快照渲染在 live 轮之上。",
      liveUser: "当前轮的用户提问（SentMessage：正文、附件、技能回显）。",
      onSubmitInterrupt: "live 轮 interrupt 卡提交时回调，携带字段级 resolution。",
      onRetryTurn: "重试某轮：历史轮传下标，当前轮传 \"live\"。",
      onBranchTurn: "从历史轮分支出新会话。",
      onOpenArtifact: "在工作台打开产物，回调携带轮次 id、store 与产物。",
    },
    message: {
      block: "正文块视图数据；store 连接为 \"live\" 时打字机自动播放。",
    },
    reasoning: {
      block: "推理块视图数据：\"thinking\" 渲染微光状态行；\"done\" 收成可展开行并带 durationMs 耗时。",
    },
    "tool-call": {
      block: "工具块视图数据：status 为 running / completed / failed，分别呈现转圈、结果摘要或失败原因。",
    },
    sandbox: {
      block: "沙箱安全投影：运行中带 stage 与 percent，完成带 exitCode / outputCount，失败带 failureCode。",
    },
    interrupt: {
      interrupt: "当前 interrupt 投影（澄清表单或计划审批），答复后内含 resolution。",
      onSubmit: "提交 resolution 时回调；随后场景剩余事件续播进 store 并闭合卡片。",
      readOnly: "冻结卡片（历史轮）；未答复且非只读时渲染可交互表单。",
    },
    todo: {},
    evidence: {
      "EvidenceMarker · index": "角标显示的引用序号；来源数据来自 run store。",
      EvidenceList: "无 props —— 从 store 汇总本轮全部来源，两条之外折叠收起。",
    },
    artifact: {
      artifact: "产物视图数据：committed=false 呈草稿态，true 呈已定稿态。",
      active: "标记当前正在工作台打开的产物卡。",
      onOpen: "点击卡片时回调 —— 在此打开居中预览模态。",
    },
    "rich-content": {
      "RichBlock · kind": "RichBlock 渲染的围栏语言：svg / html。",
      "RichBlock · source": "svg / html 标记原文。",
      "ChartBlock / MermaidBlock · source": "chart 的 JSON spec 或 mermaid 源码。",
      closed: "流式过程中围栏是否闭合；未闭合渲染源码视图。",
    },
    "process-group": {
      blocks: "要折叠的中间块（推理 / 工具调用 / 早期正文）。",
      durationMs: "可选的运行耗时，显示在摘要行。",
    },
    "user-message": {
      text: "提问正文；超长内容自动折叠。",
      attachments: "文件 / 图片附件，以卡片渲染在正文上方。",
      onEdit: "启用行内编辑；提交时携带新文本回调。",
      draftKey: "草稿注册表键，跨 SPA 导航保留编辑状态。",
    },
    composer: {
      onSubmit: "提交时回调，携带 ComposerSubmit（正文、附件、技能、幂等键）。",
      placeholder: "覆盖占位文案；缺省用内置本地化文案。",
      disabled: "完全禁用输入与发送。",
      busy: "agent 忙碌：仍可输入，主按钮切换为停止。",
    },
    cards: {
      "TaskProgressCard · progress": "TaskProgress 投影：技能名、当前阶段与生命周期状态。",
      "TaskReviewCard · review": "TaskReviewViewState：复核请求加本地操作状态。",
      "TaskReviewCard · onDecision": "回调携带 approve / reject 与所选下一阶段。",
      "RunErrorCard · error": "运行失败信息（code、message、retryable）。",
      "RunErrorCard · onRetry": "错误可重试时展示的重试回调。",
      "ConnectionBanner · connection": "连接状态；仅 reconnecting / recovery_failed 时渲染浮条。",
      "ConnectionBanner · onRetry": "recovery_failed 时的手动重连回调。",
    },
  },
};
