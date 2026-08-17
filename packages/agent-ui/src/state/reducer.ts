/**
 * RunStreamReducer —— 纯函数：把一条公共事件折叠进 RunViewState。
 *
 * 事件面：wire 2 的 5 种块事件（按 payload.kind 判别投影）+ 7 种 run 生命周期事件。
 * 幂等原则：块按 block_id upsert，证据/产物按各自 id upsert。
 * 同一事件重复到达（重连/replay 重叠）经此函数得到同一结果；
 * event_id 级别的去重放在 store 层。
 *
 * reasoning 只投影生命周期（原始 delta 文本在此边界丢弃）；todo delta
 * 按整单快照覆盖。未知事件 / kind 静默忽略，保证后续已知事件仍可消费。
 *
 * 与 SRC 的差异：工具展示名不再取硬编码中文表，而是由参数传入 ToolCopy
 * （缺省 zhCN，见 i18n/dict/blocks.ts）；reducer 本体保持纯函数。
 */

import { zhCN as defaultBlocksDict } from "../i18n/dict/blocks.js";
import {
  classifyToolKind,
  projectInterrupt,
  toolDisplayName,
  type ProtocolError,
  type PublicRunEvent,
  type ToolCopy,
} from "../protocol/events.js";
import {
  emptyRunState,
  type ArtifactView,
  type InterruptBlock,
  type ReasoningBlock,
  type RunBlock,
  type RunViewState,
  type SandboxBlock,
  type TextBlock,
  type ToolBlock,
} from "./view-types.js";

function occurredAtMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** 在有序块列表中 upsert 一个块：存在则就地更新，不存在则按 order 追加。 */
function upsertBlock<T extends RunBlock>(
  blocks: RunBlock[],
  blockId: string,
  order: number,
  create: () => T,
  update: (prev: T) => T,
): RunBlock[] {
  const idx = blocks.findIndex((b) => b.block_id === blockId);
  if (idx === -1) {
    return [...blocks, create()];
  }
  const next = blocks.slice();
  next[idx] = update(next[idx] as T);
  return next;
}

/** 产物集合 upsert（按 block_id）。 */
function upsertArtifact(
  artifacts: ArtifactView[],
  blockId: string,
  create: () => ArtifactView,
  update: (prev: ArtifactView) => ArtifactView,
): ArtifactView[] {
  const idx = artifacts.findIndex((a) => a.block_id === blockId);
  if (idx === -1) return [...artifacts, create()];
  const next = artifacts.slice();
  next[idx] = update(next[idx]!);
  return next;
}

/**
 * 终态隐式闭块（锚点 §3.3 兜底）：终态事件到达时未闭合块强制落终态。
 * text 停流、tool running → completed（中性闭合，不伪造 error）；
 * reasoning/sandbox running 按 Run 结局闭合。
 */
function closeOpenBlocks(
  blocks: RunBlock[],
  reasoningStatus: "done" | "failed",
  completedAt: number,
): RunBlock[] {
  return blocks.map((b) => {
    if (b.kind === "text" && b.streaming) return { ...b, streaming: false };
    if (b.kind === "tool" && b.status === "running") return { ...b, status: "completed" as const, statusText: undefined };
    if (b.kind === "reasoning" && b.status === "thinking") {
      return { ...b, status: reasoningStatus, completedAt };
    }
    if (b.kind === "sandbox" && b.status === "running") {
      return {
        ...b,
        status: reasoningStatus === "done" ? ("completed" as const) : ("failed" as const),
        stage: undefined,
        percent: undefined,
      };
    }
    if (b.kind === "interrupt" && !b.interrupt.resolved) {
      // 终态兜底：run 结束未收到 block.completed 的提问/计划卡按已答复闭合。
      return { ...b, interrupt: { ...b.interrupt, resolved: true } };
    }
    return b;
  });
}

function closeTodoLifecycle(
  state: RunViewState,
  status: "completed" | "failed",
  completedAt: number,
): RunViewState["todoLifecycle"] {
  return state.todoLifecycle.status === "running"
    ? { ...state.todoLifecycle, status, completedAt }
    : state.todoLifecycle;
}

/** run.failed / run.expired 的 error 宽松读取（契约外扩展位不入类型）。 */
function lenientError(payload: Record<string, unknown>): RunViewState["error"] {
  const raw = payload.error;
  if (!raw || typeof raw !== "object") return null;
  const err = raw as { code?: unknown; message?: unknown; retryable?: unknown; path?: unknown };
  if (typeof err.code !== "string" || typeof err.message !== "string") return null;
  return {
    code: err.code,
    message: err.message,
    retryable: payload.retryable === true || err.retryable === true,
    ...(typeof err.path === "string" ? { path: err.path } : {}),
  } as RunViewState["error"];
}

export function reduceEvent(
  state: RunViewState,
  event: PublicRunEvent,
  toolCopy: ToolCopy = defaultBlocksDict.tool,
): RunViewState {
  switch (event.event_type) {
    /* ---- Run 生命周期 ---- */
    case "run.started":
      return {
        ...state,
        runId: event.run_id,
        status: "running",
        error: null,
        connection: "live",
        startedAt: occurredAtMs(event.occurred_at),
        completedAt: undefined,
        usage: undefined,
      };
    case "run.resumed":
      // 用户已答复、后端续跑：回到运行态（interrupt 由 block.completed 置 resolved）。
      return { ...state, status: "running" };
    case "run.waiting_for_user":
      return { ...state, status: "waiting_user" };
    case "run.completed": {
      const completedAt = occurredAtMs(event.occurred_at);
      return {
        ...state,
        status: "completed",
        connection: "replay",
        summary: event.payload.summary,
        usage: event.payload.usage ?? state.usage,
        completedAt,
        blocks: closeOpenBlocks(state.blocks, "done", completedAt),
        todoLifecycle: closeTodoLifecycle(state, "completed", completedAt),
      };
    }
    case "run.cancelled": {
      const completedAt = occurredAtMs(event.occurred_at);
      return {
        ...state,
        status: "cancelled",
        connection: "replay",
        blocks: closeOpenBlocks(state.blocks, "failed", completedAt),
        todoLifecycle: closeTodoLifecycle(state, "failed", completedAt),
      };
    }
    case "run.failed": {
      const completedAt = occurredAtMs(event.occurred_at);
      // retryable 不进契约：宽松读取 payload 扩展位（缺省 false，与退役桥接行为一致）。
      return {
        ...state,
        status: "failed",
        connection: "replay",
        error: lenientError(event.payload as unknown as Record<string, unknown>),
        usage: event.payload.usage ?? state.usage,
        blocks: closeOpenBlocks(state.blocks, "failed", completedAt),
        todoLifecycle: closeTodoLifecycle(state, "failed", completedAt),
      };
    }
    case "run.expired": {
      const completedAt = occurredAtMs(event.occurred_at);
      // control-plane 自合成的保留事件：映射终态 failed，无 error 时置 null 走空值路径。
      return {
        ...state,
        status: "failed",
        connection: "replay",
        error: lenientError(event.payload),
        blocks: closeOpenBlocks(state.blocks, "failed", completedAt),
        todoLifecycle: closeTodoLifecycle(state, "failed", completedAt),
      };
    }

    /* ---- Task 跨 Run 进度与人工复核 ---- */
    case "task.review.required":
      return {
        ...state,
        taskProgress: event.payload.task_progress,
        taskReview: {
          request: event.payload.review,
          settled: event.payload.review.status !== "pending",
          actionState: event.payload.review.status === "pending" ? "idle" : "succeeded",
        },
      };
    case "task.stage.updated": {
      const review = state.taskReview;
      const taskReview = review
        && event.payload.review_id
        && review.request.review_id === event.payload.review_id
        ? {
            ...review,
            settled: true,
            actionState: "succeeded" as const,
            pendingDecision: undefined,
            pendingNextStageId: undefined,
            failure: undefined,
          }
        : review;
      return {
        ...state,
        taskProgress: event.payload.task_progress,
        taskReview,
      };
    }

    /* ---- 块：started ---- */
    case "block.started": {
      const { payload } = event;
      switch (payload.kind) {
        case "text":
          return {
            ...state,
            blocks: upsertBlock<TextBlock>(
              state.blocks,
              payload.block_id,
              event.sequence,
              () => ({
                kind: "text",
                block_id: payload.block_id,
                order: event.sequence,
                parentId: payload.parent_block_id,
                text: "",
                streaming: true,
              }),
              (prev) => ({ ...prev, streaming: true }),
            ),
          };
        case "tool":
          return {
            ...state,
            blocks: upsertBlock<ToolBlock>(
              state.blocks,
              payload.block_id,
              event.sequence,
              () => ({
                kind: "tool",
                block_id: payload.block_id,
                order: event.sequence,
                parentId: payload.parent_block_id,
                status: "running",
                toolName: payload.tool_name,
                toolKind: classifyToolKind(payload.tool_name),
                title: toolDisplayName(payload.tool_name, toolCopy),
              }),
              (prev) => ({
                ...prev,
                status: "running",
                toolName: payload.tool_name,
                toolKind: classifyToolKind(payload.tool_name),
                title: toolDisplayName(payload.tool_name, toolCopy),
              }),
            ),
          };
        case "evidence": {
          // 原子块：started 携带全量 EvidenceReference，completed 忽略。
          const ref = payload.evidence;
          const inOrder = state.evidenceOrder.includes(ref.evidence_id);
          return {
            ...state,
            evidences: { ...state.evidences, [ref.evidence_id]: ref },
            evidenceOrder: inOrder ? state.evidenceOrder : [...state.evidenceOrder, ref.evidence_id],
          };
        }
        case "artifact":
          return {
            ...state,
            artifacts: upsertArtifact(
              state.artifacts,
              payload.block_id,
              () => ({
                block_id: payload.block_id,
                logical_path: payload.logical_path,
                media_type: payload.media_type,
                committed: false,
              }),
              (prev) => ({ ...prev, logical_path: payload.logical_path, media_type: payload.media_type }),
            ),
          };
        case "interrupt":
          // 提问卡/计划卡作为块并入时间线：按 sequence 与正文/工具块排序，
          // 多张卡不互相替换；state.interrupt 保留为当前可交互卡指针。
          return {
            ...state,
            interrupt: { ...payload.interrupt, ...projectInterrupt(payload.interrupt), resolved: false },
            blocks: upsertBlock<InterruptBlock>(
              state.blocks,
              payload.block_id,
              event.sequence,
              () => ({
                kind: "interrupt",
                block_id: payload.block_id,
                order: event.sequence,
                parentId: payload.parent_block_id,
                interrupt: {
                  ...payload.interrupt,
                  ...projectInterrupt(payload.interrupt),
                  resolved: false,
                },
              }),
              (prev) => ({
                ...prev,
                interrupt: {
                  ...payload.interrupt,
                  ...projectInterrupt(payload.interrupt),
                  ...(prev.interrupt.resolved ? { resolution: prev.interrupt.resolution } : {}),
                  resolved: prev.interrupt.resolved,
                },
              }),
            ),
          };
        case "reasoning": {
          const startedAt = occurredAtMs(event.occurred_at);
          return {
            ...state,
            blocks: upsertBlock<ReasoningBlock>(
              state.blocks,
              payload.block_id,
              event.sequence,
              () => ({
                kind: "reasoning",
                block_id: payload.block_id,
                order: event.sequence,
                parentId: payload.parent_block_id,
                status: "thinking",
                startedAt,
                text: "",
              }),
              (prev) => ({
                ...prev,
                status: "thinking",
                startedAt: prev.startedAt ?? startedAt,
                completedAt: undefined,
                durationMs: undefined,
              }),
            ),
          };
        }
        case "todo": {
          const startedAt = occurredAtMs(event.occurred_at);
          return {
            ...state,
            todoLifecycle: {
              blockId: payload.block_id,
              status: "running",
              startedAt,
            },
          };
        }
        case "sandbox":
          return {
            ...state,
            blocks: upsertBlock<SandboxBlock>(
              state.blocks,
              payload.block_id,
              event.sequence,
              () => ({
                kind: "sandbox",
                block_id: payload.block_id,
                order: event.sequence,
                parentId: payload.parent_block_id,
                status: "running",
                stage: "preparing",
              }),
              (prev) => ({
                ...prev,
                status: "running",
                stage: "preparing",
                percent: undefined,
                durationMs: undefined,
                exitCode: undefined,
                outputCount: undefined,
                failureCode: undefined,
              }),
            ),
          };
        default:
          // 前向兼容：未知未来 kind 不阻断后续事件。
          return state;
      }
    }

    /* ---- 块：delta ---- */
    case "block.delta": {
      const { payload } = event;
      switch (payload.kind) {
        case "text":
          // replay 容错 upsert：续传从块中段进入时 delta 可直接建块。
          return {
            ...state,
            blocks: upsertBlock<TextBlock>(
              state.blocks,
              payload.block_id,
              event.sequence,
              () => ({
                kind: "text",
                block_id: payload.block_id,
                order: event.sequence,
                parentId: payload.parent_block_id,
                text: payload.text,
                streaming: true,
              }),
              (prev) => ({ ...prev, text: prev.text + payload.text, streaming: true }),
            ),
          };
        case "artifact":
          // delta 携带全量快照（非增量）。
          return {
            ...state,
            artifacts: upsertArtifact(
              state.artifacts,
              payload.block_id,
              () => ({
                block_id: payload.block_id,
                logical_path: "",
                media_type: "text/markdown" as const,
                size_bytes: payload.size_bytes,
                preview_content: payload.content,
                truncated: payload.truncated,
                content_digest: payload.content_digest,
                committed: false,
              }),
              (prev) => ({
                ...prev,
                size_bytes: payload.size_bytes,
                preview_content: payload.content,
                truncated: payload.truncated,
                content_digest: payload.content_digest,
              }),
            ),
          };
        case "reasoning": {
          const startedAt = occurredAtMs(event.occurred_at);
          return {
            ...state,
            blocks: upsertBlock<ReasoningBlock>(
              state.blocks,
              payload.block_id,
              event.sequence,
              () => ({
                kind: "reasoning",
                block_id: payload.block_id,
                order: event.sequence,
                parentId: payload.parent_block_id,
                status: "thinking",
                startedAt,
                text: payload.text,
              }),
              (prev) => ({
                ...prev,
                text: (prev.text ?? "") + payload.text,
              }),
            ),
          };
        }
        case "todo": {
          const startedAt = occurredAtMs(event.occurred_at);
          return {
            ...state,
            // 只复制公开清单字段，避免兼容解码时的未知扩展进入 view state。
            todos: payload.items.map(({ id, text, status }) => ({ id, text, status })),
            todoLifecycle: {
              blockId: payload.block_id,
              status: "running",
              startedAt:
                state.todoLifecycle.blockId === payload.block_id
                  ? (state.todoLifecycle.startedAt ?? startedAt)
                  : startedAt,
            },
          };
        }
        default:
          return state;
      }
    }

    /* ---- 块：progress ---- */
    case "block.progress": {
      const { payload } = event;
      switch (payload.kind) {
        case "tool":
          return {
            ...state,
            blocks: state.blocks.map((b) =>
              b.block_id === payload.block_id && b.kind === "tool" ? { ...b, statusText: payload.message } : b,
            ),
          };
        case "sandbox":
          return {
            ...state,
            blocks: upsertBlock<SandboxBlock>(
              state.blocks,
              payload.block_id,
              event.sequence,
              () => ({
                kind: "sandbox",
                block_id: payload.block_id,
                order: event.sequence,
                parentId: payload.parent_block_id,
                status: "running",
                stage: payload.message,
                percent: payload.percent,
              }),
              (prev) => ({
                ...prev,
                status: "running",
                stage: payload.message,
                percent: payload.percent,
                durationMs: undefined,
                exitCode: undefined,
                outputCount: undefined,
                failureCode: undefined,
              }),
            ),
          };
        default:
          return state;
      }
    }

    /* ---- 块：completed ---- */
    case "block.completed": {
      const { payload } = event;
      switch (payload.kind) {
        case "text":
          return {
            ...state,
            blocks: state.blocks.map((b) =>
              b.block_id === payload.block_id && b.kind === "text" ? { ...b, streaming: false } : b,
            ),
          };
        case "tool":
          return {
            ...state,
            blocks: state.blocks.map((b) =>
              b.block_id === payload.block_id && b.kind === "tool"
                ? { ...b, status: "completed" as const, statusText: undefined, resultPreview: payload.output_summary }
                : b,
            ),
          };
        case "artifact": {
          const ref = payload.artifact;
          return {
            ...state,
            artifacts: upsertArtifact(
              state.artifacts,
              payload.block_id,
              () => ({
                block_id: payload.block_id,
                logical_path: ref.logical_path,
                media_type: ref.media_type,
                size_bytes: ref.size_bytes,
                content_digest: ref.content_digest,
                artifact_ref: ref,
                committed: true,
              }),
              (prev) => ({
                ...prev,
                logical_path: ref.logical_path,
                media_type: ref.media_type,
                size_bytes: ref.size_bytes,
                content_digest: ref.content_digest,
                artifact_ref: ref,
                committed: true,
              }),
            ),
          };
        }
        case "interrupt":
          // wire 携带用户答复（resolution）时以此为准（服务端持久化，replay 一致）；
          // 否则保持本地 annotateResolution 的乐观标注。
          return {
            ...state,
            interrupt: state.interrupt && !state.interrupt.resolved
              ? {
                  ...state.interrupt,
                  resolved: true,
                  ...(payload.resolution
                    ? { resolution: payload.resolution as unknown as Record<string, unknown> }
                    : {}),
                }
              : state.interrupt,
            blocks: state.blocks.map((b) =>
              b.block_id === payload.block_id && b.kind === "interrupt"
                ? {
                    ...b,
                    interrupt: {
                      ...b.interrupt,
                      resolved: true,
                      ...(payload.resolution
                        ? { resolution: payload.resolution as unknown as Record<string, unknown> }
                        : {}),
                    },
                  }
                : b,
            ),
          };
        case "reasoning": {
          const completedAt = occurredAtMs(event.occurred_at);
          return {
            ...state,
            blocks: upsertBlock<ReasoningBlock>(
              state.blocks,
              payload.block_id,
              event.sequence,
              () => ({
                kind: "reasoning",
                block_id: payload.block_id,
                order: event.sequence,
                parentId: payload.parent_block_id,
                status: "done",
                completedAt,
                durationMs: payload.duration_ms,
              }),
              (prev) => ({
                ...prev,
                status: "done",
                completedAt,
                durationMs: payload.duration_ms,
              }),
            ),
          };
        }
        case "todo": {
          const completedAt = occurredAtMs(event.occurred_at);
          return {
            ...state,
            todoLifecycle: {
              blockId: payload.block_id,
              status: "completed",
              startedAt:
                state.todoLifecycle.blockId === payload.block_id
                  ? state.todoLifecycle.startedAt
                  : undefined,
              completedAt,
            },
          };
        }
        case "sandbox":
          return {
            ...state,
            blocks: upsertBlock<SandboxBlock>(
              state.blocks,
              payload.block_id,
              event.sequence,
              () => ({
                kind: "sandbox",
                block_id: payload.block_id,
                order: event.sequence,
                parentId: payload.parent_block_id,
                status: "completed",
                durationMs: payload.duration_ms,
                exitCode: payload.exit_code,
                outputCount: payload.outputs.length,
              }),
              (prev) => ({
                ...prev,
                status: "completed",
                stage: undefined,
                percent: undefined,
                durationMs: payload.duration_ms,
                exitCode: payload.exit_code,
                outputCount: payload.outputs.length,
                failureCode: undefined,
              }),
            ),
          };
        default:
          // evidence（原子块，completed 无信息量）/ 未知未来 kind。
          return state;
      }
    }

    /* ---- 块：failed ---- */
    case "block.failed": {
      const { payload } = event;
      switch (payload.kind) {
        case "tool": {
          const error: ProtocolError = payload.error;
          return {
            ...state,
            blocks: state.blocks.map((b) =>
              b.block_id === payload.block_id && b.kind === "tool"
                ? { ...b, status: "failed" as const, statusText: undefined, error: { code: error.code, message: error.message } }
                : b,
            ),
          };
        }
        case "reasoning": {
          const completedAt = occurredAtMs(event.occurred_at);
          return {
            ...state,
            blocks: upsertBlock<ReasoningBlock>(
              state.blocks,
              payload.block_id,
              event.sequence,
              () => ({
                kind: "reasoning",
                block_id: payload.block_id,
                order: event.sequence,
                parentId: payload.parent_block_id,
                status: "failed",
                completedAt,
              }),
              (prev) => ({ ...prev, status: "failed", completedAt }),
            ),
          };
        }
        case "todo": {
          const completedAt = occurredAtMs(event.occurred_at);
          return {
            ...state,
            todoLifecycle: {
              blockId: payload.block_id,
              status: "failed",
              startedAt:
                state.todoLifecycle.blockId === payload.block_id
                  ? state.todoLifecycle.startedAt
                  : undefined,
              completedAt,
            },
          };
        }
        case "sandbox":
          return {
            ...state,
            blocks: upsertBlock<SandboxBlock>(
              state.blocks,
              payload.block_id,
              event.sequence,
              () => ({
                kind: "sandbox",
                block_id: payload.block_id,
                order: event.sequence,
                parentId: payload.parent_block_id,
                status: "failed",
                durationMs: payload.duration_ms,
                exitCode: payload.exit_code,
                failureCode: payload.error.code,
              }),
              (prev) => ({
                ...prev,
                status: "failed",
                stage: undefined,
                percent: undefined,
                durationMs: payload.duration_ms,
                exitCode: payload.exit_code,
                outputCount: undefined,
                failureCode: payload.error.code,
              }),
            ),
          };
        default:
          return state;
      }
    }

    default:
      // 前向兼容：未知事件静默忽略，不破坏已渲染内容。
      return state;
  }
}

export function reduceAll(events: PublicRunEvent[], toolCopy?: ToolCopy): RunViewState {
  return events.reduce((state, event) => reduceEvent(state, event, toolCopy), emptyRunState());
}
