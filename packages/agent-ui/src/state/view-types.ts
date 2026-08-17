/**
 * 渲染视图状态 —— reducer 把细粒度事件流折叠成的"块时间线"。
 *
 * 事件是渲染的输入，块（Block）才是渲染单元。live / 断线重连 / 历史 replay
 * 都归约到同一棵 RunViewState，组件层按 block 类型分发渲染即可。
 */

import type {
  ArtifactReference,
  BrowserActionKind,
  EvidenceReference,
  InterruptProjection,
  PlatformInterrupt,
  PublicError,
  RunUsage,
  SandboxFailureCode,
  SandboxProgressStage,
  TaskProgress,
  TaskReview,
  TodoStatus,
  ToolKind,
} from "../protocol/events.js";
import type {
  TaskReviewDecision,
  TaskReviewRequest,
} from "../protocol/entities.js";

export type RunStatus =
  | "idle"
  | "running"
  | "waiting_user"
  | "completed"
  | "failed"
  | "cancelled";

export type ConnectionState =
  | "live"
  | "reconnecting"
  | "replay"
  | "recovering"
  | "recovery_failed";

export interface RecoveryFailure {
  kind: "network" | "forbidden" | "not_found" | "gone" | "invalid" | "stalled";
  message: string;
  retryable: boolean;
}

export type BlockKind = "text" | "reasoning" | "tool" | "browser" | "agent" | "sandbox" | "interrupt";

interface BlockBase {
  block_id: string;
  kind: BlockKind;
  /** 首个相关事件的 sequence；一期无读取者，保留作未来乱序兜底钩子（不排序，见 issue 决策 5）。 */
  order: number;
  /** 非空 = 这是某个子 agent 的内部块，挂在该父 agent 块（block_id）之下；顶层块留空。 */
  parentId?: string | undefined;
}

export interface TextBlock extends BlockBase {
  kind: "text";
  text: string;
  streaming: boolean;
}

/**
 * 推理活动的公开投影：生命周期 + 原文。
 *
 * live SSE 阶段 reducer 累积 reasoning delta 文本；持久 transcript 不保留
 * block.delta(reasoning) 原文，因此历史回放时 text 为空，组件降级为纯状态行。
 */
export interface ReasoningBlock extends BlockBase {
  kind: "reasoning";
  status: "thinking" | "done" | "failed";
  text?: string | undefined;
  startedAt?: number | undefined;
  completedAt?: number | undefined;
  durationMs?: number | undefined;
}

/**
 * Sandbox 的安全公共投影。
 *
 * 刻意只保留闭合阶段、稳定失败码和数值摘要；runner/provider、代码/命令、
 * stdout/stderr、原始错误文本、输出路径与 digest 均不得进入 view state。
 */
export interface SandboxBlock extends BlockBase {
  kind: "sandbox";
  status: "running" | "completed" | "failed";
  stage?: SandboxProgressStage | undefined;
  percent?: number | undefined;
  durationMs?: number | undefined;
  /** completed 契约固定为 0；failed 的非零值只作为安全数值投影保留。 */
  exitCode?: number | undefined;
  /** 只记录安全输出数量，不把 draft 路径、digest 或内部键带进状态。 */
  outputCount?: number | undefined;
  failureCode?: SandboxFailureCode | undefined;
}

export type ToolStatus = "running" | "completed" | "failed";

export interface ToolBlock extends BlockBase {
  kind: "tool";
  status: ToolStatus;
  toolName: string;
  /** 由 tool_name 前端派生（wire 无 tool_kind 字段）；未知工具回退 generic。 */
  toolKind: ToolKind;
  /** tool_name 的展示名映射；未知工具即 tool_name 本身。 */
  title: string;
  statusText?: string | undefined; // ← block.progress.message
  resultPreview?: string | undefined; // ← block.completed.output_summary
  error?: PublicError | undefined; // ← block.failed.error（ProtocolError 透出）
  /* 以下字段一期 wire 无源，保留可选项、UI 空值降级渲染（二期再接）。 */
  inputPreview?: string | undefined;
  evidenceIds?: string[] | undefined;
  detailRef?: string | undefined;
  willRetry?: boolean | undefined;
  /** execute：运行的命令行（终端卡展示）。 */
  command?: string | undefined;
  /** execute：累计的程序输出（仅保留尾部，防无界增长）。 */
  outputLines?: string[] | undefined;
  /** execute：进程退出码。 */
  exitCode?: number | undefined;
}

/** 浏览器会话中的单个动作（导航/点击/输入/滚动/截图…）。二期落点。 */
export interface BrowserAction {
  id: string;
  kind: BrowserActionKind;
  label: string;
  url?: string | undefined;
  pageTitle?: string | undefined;
  target?: string | undefined;
  value?: string | undefined;
  status: "running" | "done";
}

/** 浏览器操作块（二期落点）：agent 自动操作浏览器的一段会话，累积一串动作。 */
export interface BrowserBlock extends BlockBase {
  kind: "browser";
  status: ToolStatus;
  title: string;
  currentUrl?: string | undefined;
  pageTitle?: string | undefined;
  actions: BrowserAction[];
  resultPreview?: string | undefined;
  pageCount?: number | undefined;
  error?: PublicError | undefined;
  willRetry?: boolean | undefined;
}

/** 子 agent 块（三期落点）：内部步骤块以 parentId 指回本块，由详情面板渲染。 */
export interface AgentBlock extends BlockBase {
  kind: "agent";
  status: ToolStatus;
  title: string;
  task?: string | undefined;
  model?: string | undefined;
  statusText?: string | undefined;
  resultPreview?: string | undefined;
  stepCount?: number | undefined;
  durationMs?: number | undefined;
  evidenceIds?: string[] | undefined;
  error?: PublicError | undefined;
  willRetry?: boolean | undefined;
}

export type RunBlock = TextBlock | ReasoningBlock | ToolBlock | BrowserBlock | AgentBlock | SandboxBlock | InterruptBlock;

/**
 * interrupt 卡片集合视图：既有渲染路径读 state.interrupt（当前可交互卡），
 * 历史卡在 blocks 里按序渲染；两者以 interrupt_id 对齐。
 */

/**
 * 产物视图：block.started(artifact) 建块、delta 携带全量快照更新预览、
 * completed 携带 ArtifactReference 落定稿。block_id 是渲染锚点（取代原 draft_id/revision）。
 *
 * 另一来源是服务端合并：sandbox runner 产出的产物不进事件流，run 终态后由
 * useRunArtifactsSync 拉 GET /runs/:id/artifacts 经 store.applyRunArtifacts 合并进来，
 * 此时 block_id 即 artifact_id、committed 恒为 true、无 preview_content（面板按 download_url 拉 blob 预览）。
 */
export interface ArtifactView {
  block_id: string;
  logical_path: string;
  media_type: string;
  size_bytes?: number | undefined;
  /** delta 的全量快照内容（截断时以 content_digest 为准按需拉取，一期直接内联）。 */
  preview_content?: string | undefined;
  truncated?: boolean | undefined;
  content_digest?: string | undefined;
  /** completed 携带的定稿引用（artifact_id / digest / size）。 */
  artifact_ref?: ArtifactReference | undefined;
  /** 服务端列表给出的下载路径（/v1/runs/:runId/artifacts/:artifactId，307 到对象存储）。 */
  download_url?: string | undefined;
  committed: boolean;
}

/** agent 维护的任务清单项（整单快照的一行）。 */
export interface TodoItem {
  id: string;
  text: string;
  status: TodoStatus;
}

/** 当前 todo 块的公开生命周期；清单内容仍以 todos 最新整单快照为权威。 */
export interface TodoLifecycle {
  blockId: string | null;
  status: "idle" | "running" | "completed" | "failed";
  startedAt?: number | undefined;
  completedAt?: number | undefined;
}

export interface ActiveInterrupt extends PlatformInterrupt, InterruptProjection {
  resolved: boolean;
  /** plan_approval 的计划正文（markdown）；reducer spread projectInterrupt 结果带入。 */
  markdown?: string | undefined;
  /**
   * 用户对该卡的答复。live 路径由 store.annotateResolution 本地乐观标注；
   * block.completed(interrupt) 到达后以 wire 的 resolution 为准（服务端持久化，
   * replay/hydration 不丢失）。格式与 ResumeInput 一致。
   */
  resolution?: Record<string, unknown> | undefined;
}

/**
 * 提问卡/计划卡作为块并入时间线（block.started 建块、block.completed 落答复）。
 * 多张卡按 sequence 与正文/工具块严格排序；已答复卡保留展示问题与用户答复。
 * state.interrupt 仍保留为「当前可交互卡」指针（submitInterrupt/只读冻结用），
 * 渲染统一走 blocks，避免单槽位替换丢历史。
 */
export interface InterruptBlock extends BlockBase {
  kind: "interrupt";
  interrupt: ActiveInterrupt;
}

export interface TaskReviewFailure {
  kind: "stale" | "forbidden" | "gone" | "unavailable" | "network" | "invalid";
  message: string;
  retryable: boolean;
}

/** 复核卡的服务端投影与纯 UI 请求状态；request 字段始终只来自 PublicAPI。 */
export interface TaskReviewViewState {
  request: TaskReviewRequest;
  /** task.stage.updated 可证明该 review 已处理，但不会据此猜测 approve/reject。 */
  settled: boolean;
  actionState: "idle" | "pending" | "succeeded" | "failed";
  pendingDecision?: TaskReviewDecision | undefined;
  pendingNextStageId?: string | undefined;
  failure?: TaskReviewFailure | undefined;
}

export interface RunViewState {
  runId: string | null;
  taskProgress: TaskProgress | null;
  taskReview: TaskReviewViewState | null;
  status: RunStatus;
  /** 有序块列表（渲染直接遍历）。 */
  blocks: RunBlock[];
  evidences: Record<string, EvidenceReference>;
  /** 正文引用出现顺序 → 角标序号（[1] [2] …）。 */
  evidenceOrder: string[];
  artifacts: ArtifactView[];
  /** agent 维护的任务清单；每个 todo delta 都整体替换此快照。 */
  todos: TodoItem[];
  todoLifecycle: TodoLifecycle;
  interrupt: ActiveInterrupt | null;
  error: (PublicError & { retryable: boolean }) | null;
  /** Public aggregate usage. Snapshot hydration always supplies it; live terminal events may supply it. */
  usage?: RunUsage | undefined;
  summary?: string | undefined;
  connection: ConnectionState;
  /** Transport/snapshot recovery failure; never aliases the business Run error. */
  recoveryFailure: RecoveryFailure | null;
  /** run 起始时间戳（ms），用于底部状态条的计时。 */
  startedAt?: number | undefined;
  /** run 完成时间戳（ms），用于完成后过程组折叠摘要的耗时展示。 */
  completedAt?: number | undefined;
}

export function emptyRunState(): RunViewState {
  return {
    runId: null,
    taskProgress: null,
    taskReview: null,
    status: "idle",
    blocks: [],
    evidences: {},
    evidenceOrder: [],
    artifacts: [],
    todos: [],
    todoLifecycle: { blockId: null, status: "idle" },
    interrupt: null,
    error: null,
    usage: undefined,
    connection: "live",
    recoveryFailure: null,
  };
}
