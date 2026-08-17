/**
 * Agent 输出公共事件类型层（wire 2 · PublicAPI 2.x）。
 *
 * 移植自 agent portal 的 protocol/events.ts：上游 generated contracts 的
 * 类型在此全部落地为手写的本地 TS 接口（逐字段按契约语义推导，见各注释）。
 * 与 SRC 的差异：
 * - 无 Ajv 运行时校验（writePublicRunEvent / asRunEvent 等 seam 全部删除），只留类型。
 * - 闭枚举里的 branded string（`string & (...)`）退化为 string，方便 mock 手写事件。
 * - 工具展示名 / 进行态文案不再硬编码，改由调用方传入 ToolCopy（见 i18n/dict/blocks.ts）。
 */

/* -------------------------------------------------------------------------- */
/* 基础标量与错误                                                                 */
/* -------------------------------------------------------------------------- */

/** 稳定错误码闭枚举（契约 StableErrorCode）。 */
export type StableErrorCode =
  | "invalid_message"
  | "unsupported_schema_version"
  | "unknown_internal_event"
  | "validation_failed"
  | "protocol_error"
  | "authorization_failed"
  | "user_not_registered"
  | "budget_exceeded"
  | "deadline_exceeded"
  | "model_error"
  | "tool_error"
  | "checkpoint_error"
  | "artifact_error"
  | "dependency_unavailable"
  | "cancelled"
  | "not_found"
  | "conflict"
  | "not_implemented"
  | "internal_error"
  | "asr_session_active"
  | "asr_rate_limited"
  | "asr_disabled";

export interface PublicError {
  code: StableErrorCode;
  message: string;
  retryable?: boolean;
  path?: string;
}

/** RuntimeProtocol wire schema 3 的非 Sandbox 块级失败错误（原样透传，不重写为 PublicError）。 */
export interface ProtocolError {
  code:
    | "invalid_message"
    | "unsupported_schema_version"
    | "unknown_internal_event"
    | "validation_failed"
    | "protocol_error"
    | "authorization_failed"
    | "budget_exceeded"
    | "deadline_exceeded"
    | "model_error"
    | "tool_error"
    | "checkpoint_error"
    | "artifact_error"
    | "dependency_unavailable"
    | "cancelled";
  message: string;
  path?: string;
  received_version?: number;
  supported_versions?: { min: number; max: number };
}

/* -------------------------------------------------------------------------- */
/* 证据 / 产物引用                                                                */
/* -------------------------------------------------------------------------- */

export interface EvidenceReference {
  evidence_id: string;
  /** Format: uri */
  url: string;
  title: string;
  provider: string;
  /** RFC3339 */
  retrieved_at: string;
  snippet?: string;
  content_digest?: string;
}

export interface ArtifactReference {
  artifact_id: string;
  logical_path: string;
  media_type: string;
  content_digest: string;
  size_bytes: number;
}

/* -------------------------------------------------------------------------- */
/* Interrupt 与 Resume                                                            */
/* -------------------------------------------------------------------------- */

/** v1 PlatformInterrupt；content / input_schema 的具体结构由后端按 interrupt_kind 定义。 */
export interface PlatformInterrupt {
  interrupt_id: string;
  interrupt_kind: "clarification" | "plan_approval";
  title: string;
  content: unknown;
  input_schema: Record<string, unknown>;
  /** RFC3339 */
  resume_expires_at: string;
}

/** clarification：一句自由文本答复。 */
export interface ClarificationResumeInput {
  answer: string;
}

/** plan_approval：approve 通过；revise 必须带 feedback；reject 拒绝。 */
export interface PlanApprovalResumeInput {
  decision: "approve" | "revise" | "reject";
  feedback?: string;
}

export type ResumeInput = ClarificationResumeInput | PlanApprovalResumeInput;

/* -------------------------------------------------------------------------- */
/* Run 用量 / Task 跨 Run 进度与人工复核                                           */
/* -------------------------------------------------------------------------- */

export interface RunUsage {
  model_tokens: number;
  estimated_cost_microusd: number;
  model_calls: number;
  tool_calls: number;
  web_bytes: number;
  artifact_bytes: number;
  active_duration_ms: number;
}

/** 可跨 Run 恢复的最小 Task 产品投影。task_id 是不透明关联。 */
export interface TaskProgress {
  task_id: string;
  skill_id: string;
  skill_label: string;
  stage_id: string;
  stage_label: string;
  status: "running" | "awaiting_review" | "advancing" | "completed" | "stopped";
}

export type TaskReviewStatus = "pending" | "approved" | "rejected" | "expired";

export interface TaskAllowedNextStage {
  id: string;
  label: string;
}

/** 安全复核投影；只携带不透明关联、产品文案、允许的下一阶段和终态决策。 */
export interface TaskReview {
  review_id: string;
  task_id: string;
  title: string;
  summary: string;
  allowed_next_stages: TaskAllowedNextStage[];
  status: TaskReviewStatus;
  decision?: "approve" | "reject";
  next_stage_id?: string;
}

/* -------------------------------------------------------------------------- */
/* Sandbox 安全公共投影                                                           */
/* -------------------------------------------------------------------------- */

/** 契约 SandboxRunnerProfile 为 branded 闭枚举；本地化退化为 string（mock 可自由取值）。 */
export type SandboxRunnerProfile = string;

export type SandboxProgressStage = "preparing" | "running" | "collecting-outputs";

export type SandboxFailureCode =
  | "cancelled"
  | "deadline_exceeded"
  | "tool_error"
  | "artifact_error"
  | "budget_exceeded"
  | "dependency_unavailable";

/** 契约按 code 锁定 message 文案；本地化只保留 code 闭枚举 + 自由 message（渲染只读 code）。 */
export interface SandboxFailureError {
  code: SandboxFailureCode;
  message: string;
}

/** media_type 契约为一期为闭枚举 MIME；本地化退化为 string。 */
export interface SandboxArtifactDraft {
  draft_id: string;
  logical_path: string;
  media_type: string;
  content_digest: string;
  size_bytes: number;
}

/* -------------------------------------------------------------------------- */
/* Envelope 与 14 种 wire 2 事件                                                  */
/* -------------------------------------------------------------------------- */

export interface EventEnvelope {
  schema_version: 2;
  event_id: string;
  run_id: string;
  /** run 内严格单调递增（SafeCursor）；store 去重 fallback 与 view order 钩子。 */
  sequence: number;
  occurred_at: string; // RFC3339
}

/* ---- Run 生命周期 ---- */

export interface RunStartedPayload {
  status: "running";
}

/** resumed / waiting_for_user / cancelled / expired 的操作型 payload（契约开放扩展位）。 */
export interface RunOperationalPayload {
  [key: string]: unknown;
}

export interface RunCompletedPayload {
  status: "completed";
  summary?: string;
  usage?: RunUsage;
}

export interface RunFailedPayload {
  status: "failed";
  error: PublicError;
  usage?: RunUsage;
}

export interface RunStartedEvent extends EventEnvelope {
  event_type: "run.started";
  payload: RunStartedPayload;
}
export interface RunResumedEvent extends EventEnvelope {
  event_type: "run.resumed";
  payload: RunOperationalPayload;
}
export interface RunWaitingForUserEvent extends EventEnvelope {
  event_type: "run.waiting_for_user";
  payload: RunOperationalPayload;
}
export interface RunCompletedEvent extends EventEnvelope {
  event_type: "run.completed";
  payload: RunCompletedPayload;
}
export interface RunCancelledEvent extends EventEnvelope {
  event_type: "run.cancelled";
  payload: RunOperationalPayload;
}
export interface RunFailedEvent extends EventEnvelope {
  event_type: "run.failed";
  payload: RunFailedPayload;
}
export interface RunExpiredEvent extends EventEnvelope {
  event_type: "run.expired";
  payload: RunOperationalPayload;
}

/* ---- Task 跨 Run 进度与人工复核 ---- */

export interface TaskReviewRequiredPayload {
  task_progress: TaskProgress;
  review: TaskReview;
}

export interface TaskStageUpdatedPayload {
  task_progress: TaskProgress;
  review_id?: string;
}

export interface TaskReviewRequiredEvent extends EventEnvelope {
  event_type: "task.review.required";
  payload: TaskReviewRequiredPayload;
}

export interface TaskStageUpdatedEvent extends EventEnvelope {
  event_type: "task.stage.updated";
  payload: TaskStageUpdatedPayload;
}

/* ---- 块级事件（payload 按 kind 判别）---- */

export type BlockKind = "text" | "tool" | "evidence" | "artifact" | "interrupt" | "reasoning" | "todo" | "sandbox";

export type NonSandboxBlockKind = "text" | "tool" | "evidence" | "artifact" | "interrupt" | "reasoning" | "todo";

interface BlockPayloadBase {
  block_id: string;
  /** 非空 = 挂在某个父 agent 块之下的子块。 */
  parent_block_id?: string;
}

export type BlockStartedPayload =
  | (BlockPayloadBase & { kind: "text" })
  | (BlockPayloadBase & { kind: "tool"; tool_call_id: string; tool_name: string })
  | (BlockPayloadBase & { kind: "evidence"; evidence: EvidenceReference })
  | (BlockPayloadBase & { kind: "artifact"; logical_path: string; media_type: string })
  | (BlockPayloadBase & { kind: "interrupt"; interrupt: PlatformInterrupt })
  | (BlockPayloadBase & { kind: "reasoning" })
  | (BlockPayloadBase & { kind: "todo" })
  | (BlockPayloadBase & { kind: "sandbox"; runner_profile: SandboxRunnerProfile });

export type BlockDeltaPayload =
  | (BlockPayloadBase & { kind: "text"; text: string })
  | (BlockPayloadBase & {
      kind: "artifact";
      /** 全量快照（非增量）。 */
      content: string;
      truncated: boolean;
      size_bytes: number;
      content_digest: string;
    })
  | (BlockPayloadBase & { kind: "reasoning"; text: string })
  | (BlockPayloadBase & {
      kind: "todo";
      /** 整单快照：每次 delta 全量覆盖。 */
      items: { id: string; text: string; status: "pending" | "in_progress" | "completed" }[];
    });

export type BlockProgressPayload =
  | (BlockPayloadBase & { kind: NonSandboxBlockKind; message: string; percent?: number })
  | (BlockPayloadBase & { kind: "sandbox"; message: SandboxProgressStage; percent?: number });

export type BlockCompletedPayload =
  | (BlockPayloadBase & { kind: "text" })
  | (BlockPayloadBase & { kind: "tool"; output_summary?: string })
  | (BlockPayloadBase & { kind: "evidence" })
  | (BlockPayloadBase & { kind: "artifact"; artifact: ArtifactReference })
  | (BlockPayloadBase & { kind: "interrupt"; resolution?: ResumeInput })
  | (BlockPayloadBase & { kind: "reasoning"; duration_ms?: number })
  | (BlockPayloadBase & { kind: "todo" })
  | (BlockPayloadBase & {
      kind: "sandbox";
      runner_profile: SandboxRunnerProfile;
      duration_ms: number;
      exit_code: 0;
      outputs: SandboxArtifactDraft[];
    });

export type BlockFailedPayload =
  | (BlockPayloadBase & {
      kind: "text" | "evidence" | "artifact" | "interrupt" | "reasoning" | "todo";
      error: ProtocolError;
    })
  | (BlockPayloadBase & { kind: "tool"; error: ProtocolError; retryable?: boolean })
  | (BlockPayloadBase & {
      kind: "sandbox";
      runner_profile: SandboxRunnerProfile;
      duration_ms?: number;
      exit_code?: number;
      error: SandboxFailureError;
    });

export interface BlockStartedEvent extends EventEnvelope {
  event_type: "block.started";
  payload: BlockStartedPayload;
}
export interface BlockDeltaEvent extends EventEnvelope {
  event_type: "block.delta";
  payload: BlockDeltaPayload;
}
export interface BlockProgressEvent extends EventEnvelope {
  event_type: "block.progress";
  payload: BlockProgressPayload;
}
export interface BlockCompletedEvent extends EventEnvelope {
  event_type: "block.completed";
  payload: BlockCompletedPayload;
}
export interface BlockFailedEvent extends EventEnvelope {
  event_type: "block.failed";
  payload: BlockFailedPayload;
}

export type PublicRunEvent =
  | RunStartedEvent
  | RunResumedEvent
  | RunWaitingForUserEvent
  | RunCompletedEvent
  | RunCancelledEvent
  | RunFailedEvent
  | RunExpiredEvent
  | TaskReviewRequiredEvent
  | TaskStageUpdatedEvent
  | BlockStartedEvent
  | BlockDeltaEvent
  | BlockProgressEvent
  | BlockCompletedEvent
  | BlockFailedEvent;

export type PublicRunEventType = PublicRunEvent["event_type"];

/* -------------------------------------------------------------------------- */
/* 工具名 → 渲染分类（一期 wire 只有 tool_call_id + tool_name，分类前端派生）      */
/* -------------------------------------------------------------------------- */

/** 工具类别 → 决定图标与进行时文案模板；未知值回退 generic（前向兼容降级保留）。 */
export type ToolKind = "search" | "knowledge" | "file_read" | "file_write" | "execute" | "skill" | "generic";

export function classifyToolKind(toolName: string): ToolKind {
  const n = toolName.toLowerCase();
  // sks 知识库检索族：与通用 web 检索区分，单独成类以驱动 book-search 图标与「知识库检索」文案。
  // 必须置于通用 search 规则之前，否则含 search 的名字会被 search 抢先命中。
  if (n.startsWith("mcp.sks.") && n.includes("search")) return "knowledge";
  if (n.includes("search")) return "search";
  if (n.includes("read")) return "file_read";
  if (n.includes("write")) return "file_write";
  if (n.includes("exec") || n.includes("python") || n.includes("shell") || n.includes("bash") || n.includes("code")) {
    return "execute";
  }
  if (n.includes("skill")) return "skill";
  return "generic";
}

/** 进行态文案：prefix 为未美化工具的前缀（拼「原始名」），verbatim 为美化工具自带宾语的整句。 */
export interface ToolRunningText {
  prefix: string;
  verbatim: string;
}

/**
 * 工具文案包（i18n/dict/blocks.ts 的 tool 节满足此形状）：
 * 展示名映射 + 各 ToolKind 的进行态文案。函数不再持有硬编码文案。
 */
export interface ToolCopy {
  /** 已知 tool_name 的展示名；未知工具回退为 tool_name 本身（不伪造文案）。 */
  displayNames: Record<string, string>;
  /** sks 知识库检索族统一展示名，避免族内每新增一个检索工具都要补白名单。 */
  knowledgeDisplayName: string;
  runningText: Record<ToolKind, ToolRunningText>;
}

export function toolDisplayName(toolName: string, copy: ToolCopy): string {
  const exact = copy.displayNames[toolName];
  if (exact) return exact;
  if (classifyToolKind(toolName) === "knowledge") return copy.knowledgeDisplayName;
  return toolName;
}

/**
 * 进行态文案：被美化为动词性短语的工具（title !== toolName）用 verbatim 整句，
 * 避免「正在检索「网络检索」」式动词重复；未美化工具保留「原始名」以标识具体工具。
 */
export function formatToolRunningLabel(
  kind: ToolKind,
  title: string,
  toolName: string,
  copy: ToolCopy,
): string {
  const cfg = copy.runningText[kind] ?? copy.runningText.generic;
  const body = title !== toolName ? cfg.verbatim : `${cfg.prefix}「${title}」`;
  return `${body}…`;
}

/* -------------------------------------------------------------------------- */
/* Interrupt 渲染投影：content / input_schema（wire 自由 JSON）→ 组件结构         */
/* -------------------------------------------------------------------------- */

export type InterruptKind = PlatformInterrupt["interrupt_kind"];

/** input_schema.fields 的元素（portal 侧约定子集），据此动态渲染表单。 */
export interface InterruptField {
  name: string;
  label: string;
  type: "text" | "textarea" | "single_choice" | "multi_choice";
  required?: boolean;
  /** single_choice / multi_choice 的候选项；description 为可选说明文字（选项卡副标题）。 */
  options?: { value: string; label: string; description?: string }[];
  placeholder?: string;
}

export interface PlanStep {
  id: string;
  title: string;
  detail?: string;
}

/** ActiveInterrupt 的渲染侧投影：prompt / fields / plan / markdown 从 content / input_schema 宽松读出。 */
export interface InterruptProjection {
  prompt: string;
  fields?: InterruptField[];
  plan?: PlanStep[];
  /** plan_approval 的计划正文（markdown）；canonical 与 legacy 形状均可能携带。 */
  markdown?: string | undefined;
}

const INTERRUPT_FIELD_TYPES = new Set<InterruptField["type"]>(["text", "textarea", "single_choice", "multi_choice"]);

function projectFields(raw: unknown): InterruptField[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const fields: InterruptField[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    if (typeof f.name !== "string" || typeof f.label !== "string") continue;
    const options = Array.isArray(f.options)
      ? f.options.flatMap((o) => {
          if (!o || typeof o !== "object") return [];
          const opt = o as Record<string, unknown>;
          if (typeof opt.value !== "string" || typeof opt.label !== "string") return [];
          return [
            {
              value: opt.value,
              label: opt.label,
              ...(typeof opt.description === "string" ? { description: opt.description } : {}),
            },
          ];
        })
      : undefined;
    const rawType =
      typeof f.type === "string" && INTERRUPT_FIELD_TYPES.has(f.type as InterruptField["type"])
        ? (f.type as InterruptField["type"])
        : "text";
    // choice 无 options 时降级为 textarea（legacy 空壳 / 选项-in-question 兜底）
    const effectiveType: InterruptField["type"] =
      (rawType === "single_choice" || rawType === "multi_choice") && !(options && options.length)
        ? "textarea"
        : rawType;
    fields.push({
      name: f.name,
      label: f.label,
      type: effectiveType,
      ...(typeof f.required === "boolean" ? { required: f.required } : {}),
      ...(options && options.length ? { options } : {}),
      ...(typeof f.placeholder === "string" ? { placeholder: f.placeholder } : {}),
    });
  }
  return fields.length ? fields : undefined;
}

/**
 * JSON-Schema 兜底：当 canonical 的 input_schema.fields 读不出时，从
 * input_schema.properties（{ [name]: schema }）派生表单字段。
 * - schema.enum 为非空字符串数组 → single_choice（options 由 enum 值映射）。
 * - 否则 schema.type === "string"（或无 type）→ text。
 * required 取自 input_schema.required（字符串数组）；label 取 schema.title /
 * schema.description / name 兜底。这是 legacy runtime 形状（properties.answer.enum）
 * 的容错投影，canonical 的 fields 数组始终优先（见 projectInterrupt）。
 */
function projectFieldsFromJsonSchema(schema: unknown): InterruptField[] | undefined {
  if (!schema || typeof schema !== "object") return undefined;
  const s = schema as Record<string, unknown>;
  const properties = s.properties;
  if (!properties || typeof properties !== "object") return undefined;
  const required = Array.isArray(s.required) ? s.required.filter((r): r is string => typeof r === "string") : [];
  const fields: InterruptField[] = [];
  for (const [name, rawProp] of Object.entries(properties as Record<string, unknown>)) {
    if (!rawProp || typeof rawProp !== "object") continue;
    const prop = rawProp as Record<string, unknown>;
    const label =
      typeof prop.title === "string"
        ? prop.title
        : typeof prop.description === "string"
          ? prop.description
          : name;
    const isRequired = required.includes(name);
    if (Array.isArray(prop.enum)) {
      const options = prop.enum
        .filter((v): v is string => typeof v === "string")
        .map((v) => ({ value: v, label: v }));
      if (options.length) {
        fields.push({
          name,
          label,
          type: "single_choice",
          ...(isRequired ? { required: true } : {}),
          options,
        });
        continue;
      }
    }
    if (prop.type === "string" || prop.type === undefined) {
      fields.push({
        name,
        label,
        type: "text",
        ...(isRequired ? { required: true } : {}),
      });
    }
  }
  return fields.length ? fields : undefined;
}

function projectPlan(raw: unknown): PlanStep[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const steps: PlanStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    if (typeof s.id !== "string" || typeof s.title !== "string") continue;
    steps.push({
      id: s.id,
      title: s.title,
      ...(typeof s.detail === "string" ? { detail: s.detail } : {}),
    });
  }
  return steps.length ? steps : undefined;
}

/**
 * wire PlatformInterrupt → 渲染投影。兼容两种形状：
 * - canonical：clarification 的 prompt 在 content.prompt、表单字段在 input_schema.fields；
 *   plan_approval 的正文在 content.markdown。
 * - legacy（现存 DB 数据）：clarification 的 prompt 在 content.question、字段在
 *   input_schema.properties（JSON-Schema）；plan_approval 的正文同样在 content.markdown。
 * prompt 读取优先级：content.prompt → content.question → content.markdown（兜底）→ content 字符串。
 * fields 读取优先级：input_schema.fields（canonical）→ input_schema.properties 派生（legacy）。
 * 形状不符时宽松降级（空 prompt / 无字段），不阻断事件流。
 */
export function projectInterrupt(interrupt: PlatformInterrupt): InterruptProjection {
  const content = interrupt.content;
  let prompt = "";
  let markdown: string | undefined;
  let plan: PlanStep[] | undefined;
  if (typeof content === "string") {
    prompt = content;
  } else if (content && typeof content === "object") {
    const c = content as Record<string, unknown>;
    if (typeof c.prompt === "string") prompt = c.prompt;
    else if (typeof c.question === "string") prompt = c.question;
    else if (typeof c.markdown === "string") prompt = c.markdown;
    if (typeof c.markdown === "string") markdown = c.markdown;
    plan = projectPlan(c.plan);
  }
  const schema = interrupt.input_schema as Record<string, unknown>;
  const fields = projectFields(schema.fields) ?? projectFieldsFromJsonSchema(schema);
  return {
    prompt,
    ...(fields ? { fields } : {}),
    ...(plan ? { plan } : {}),
    ...(markdown ? { markdown } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/* 二期 / 三期落点的组件侧类型（一期 wire 无生产者；保留供渲染器前向兼容）            */
/* -------------------------------------------------------------------------- */

/** 浏览器动作类别（二期 browser 块）；未知值回退 navigate。 */
export type BrowserActionKind =
  | "navigate"
  | "click"
  | "type"
  | "scroll"
  | "extract"
  | "screenshot"
  | "wait";

/** TODO 清单项状态（二期 todo 块；view 层整单快照）。 */
export type TodoStatus = "pending" | "in_progress" | "completed";
