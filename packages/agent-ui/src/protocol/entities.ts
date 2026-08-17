/**
 * 产品侧实体类型（最小必需集）。
 *
 * 移植自 agent-portal 的 entities/types.ts，裁剪掉 Project / FileCopy /
 * VisibilityScope / WorkspaceMember 系（不随本次复刻迁移）。
 * 与 SRC 的结构差异：SRC 的 entities/types.ts ↔ state/view-types.ts 存在循环
 * import（Conversation.turns 引用 RunViewState，view-types 引用 TaskReview 系）。
 * 本文件不 import view-types —— ConversationTurn 的 state 用泛型参数表达，
 * 由消费方（history/mock 层）传入 state 层的 RunViewState，循环就此解开。
 */

import type {
  PlatformInterrupt,
  PublicError,
  RunUsage,
  TaskProgress,
  TaskReview,
} from "./events.js";

/** entities 语境下的复核请求 / 决策别名（契约 TaskReview 的安全产品投影）。 */
export type TaskReviewRequest = TaskReview;
export type TaskReviewDecision = "approve" | "reject";

/** POST /task-reviews/:id/decision 的响应（契约 TaskReviewDecisionResponse）。 */
export interface TaskReviewDecisionResponse {
  schema_version: number;
  review: TaskReview;
  task_progress: TaskProgress;
  new_run_id?: string;
}

/** 会话/历史列表用的实体侧 Run 状态（比 view 层多 queued / needs_review）。 */
export type RunStatus =
  | "queued"
  | "running"
  | "waiting_for_user"
  | "completed"
  | "needs_review"
  | "failed"
  | "cancelled";

/** GET /runs/:id 的最小安全快照（契约 RunSnapshot 裁剪掉 execution/fence/游标内部位）。 */
export interface RunSnapshot {
  schema_version: number;
  run_id: string;
  conversation_id: string;
  turn_index: number;
  task_progress?: TaskProgress;
  status:
    | "queued"
    | "running"
    | "waiting_for_user"
    | "cancelling"
    | "completed"
    | "failed"
    | "cancelled"
    | "expired";
  stream_url?: string;
  pending_interrupt?: PlatformInterrupt;
  summary?: string;
  usage: RunUsage;
  artifacts: RunArtifact[];
  created_at: string;
  updated_at: string;
  error?: PublicError;
}

/** GET /runs/:id/artifacts 的服务端产物列表项（契约 Artifact）。 */
export interface RunArtifact {
  artifact_id: string;
  logical_path: string;
  /** 任意 MIME（sandbox 渲染产物可为 image/png、application/pdf 等）。 */
  media_type: string;
  size_bytes: number;
  content_digest: string;
  download_url: string;
}

/** 动态 Skill 稳定 id（由受审 catalog 交集下发）；开放 string，不硬编码闭集合。 */
export type SkillId = string;

/** 绑定到 agent-run mock 事件流的场景标识。 */
export type AgentScenarioId = "success" | "clarify" | "plan" | "exec" | "richviz" | "fail";

export interface RunStep {
  id: string;
  label: string;
  state: "pending" | "active" | "completed" | "failed";
}

/** 消息内联附件：区分「图片」（缩略预览 + 灯箱放大）与「文件」（卡片）。 */
export type AttachmentKind = "image" | "file";

export interface MessageAttachment {
  id: string;
  name: string;
  kind: AttachmentKind;
  /** kind === "image"：缩略图与灯箱放大的图源（用户上传时由 URL.createObjectURL 生成）。 */
  url?: string;
  /** kind === "file"：展示用的文件类型标签，如 "PDF" / "XLSX"。 */
  fileType?: string;
  /** 展示用的文件大小，如 "1.2 MB"。 */
  size?: string;
}

/** 用户已发送消息的最小表示：文本 + 内联附件。 */
export interface SentMessage {
  text: string;
  attachments: MessageAttachment[];
  /** 本轮显式授权的服务端资源 id；后续新 Run 不隐式继承。 */
  inputFileIds?: string[];
  /** 首次 CreateRun 与同轮重试复用，避免重复创建。 */
  idempotencyKey?: string;
  /** 发送该轮时绑定的单一 Skill id（零或一），供重试历史轮 / 分支会话沿用，并在消息气泡上回显。 */
  skillId?: SkillId;
  /** 发送时 Skill 的显示名（来自目录或 execution summary）；当前目录下线时仍能回显历史。 */
  skillLabel?: string;
  /** 发送该轮时用户选择的思考强度档位 id，供重试历史轮 / 分支会话沿用原轮档位。 */
  effort?: string;
  /** 服务端自动推进 Task Stage 时的新 Run；时间线不伪造一条新的用户消息。 */
  taskContinuation?: boolean;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "agent";
  author: string;
  content: string;
  skillId?: SkillId;
  /** 用户发送时携带的内联附件（图片 / 文件）。 */
  attachments?: MessageAttachment[];
  runSteps?: RunStep[];
}

/**
 * 一轮历史：用户消息 + 该轮结束时的运行视图快照。
 * state 的具体类型由消费方参数化（通常为 state/view-types 的 RunViewState）；
 * 默认 unknown —— 本文件刻意不 import state 层，以此解开 SRC 的循环依赖。
 */
export interface ConversationTurn<TState = unknown> {
  user: SentMessage;
  state: TState;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  title: string;
  ownerId: string;
  updatedAt: string;
  runStatus: RunStatus;
  messages: ConversationMessage[];
  /** 原型阶段：进入会话时回放的 agent 场景流。 */
  scenarioId?: AgentScenarioId;
  /** 原型 mock：被压缩的较早历史轮数（turns 下标 [0, compactedBefore)）。 */
  compactedBefore?: number;
  /** 原型 mock：压缩进行中，压缩标记显示"正在压缩上下文"流光态。 */
  compacting?: boolean;
  /** 原型 mock：预置的多轮历史，用于直接展示上下文压缩等长会话效果。 */
  turns?: ConversationTurn[];
}
