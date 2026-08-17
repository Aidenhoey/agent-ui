/**
 * Run 状态 store —— 极简 external store（useSyncExternalStore），不引第三方状态库。
 *
 * - dispatch 在 store 层做 event_id 去重（重连/replay 重叠时天然幂等）。
 * - 组件通过 useRunState() 订阅；state 引用仅在变更时改变，避免无谓重渲。
 *   生产可换成按 block_id 的细粒度订阅，这里对原型规模够用。
 *
 * 与 SRC 的差异：RunSnapshot / TaskReviewDecisionResponse / RunArtifact 改由本地
 * protocol/entities 提供；createRunStore 接受可选 toolCopy（透传给 reducer，
 * 缺省 zhCN）。
 */

import { createContext, useContext, useSyncExternalStore } from "react";

import type {
  RunArtifact,
  RunSnapshot,
  TaskReviewDecision,
  TaskReviewDecisionResponse,
} from "../protocol/entities.js";
import type { PublicRunEvent, ToolCopy } from "../protocol/events.js";
import { reduceEvent } from "./reducer.js";
import type {
  ArtifactView,
  ConnectionState,
  RecoveryFailure,
  TaskReviewFailure,
  RunViewState,
} from "./view-types.js";
import { emptyRunState } from "./view-types.js";

/**
 * 服务端产物列表合并进视图：事件流已建块的产物优先（仅补 download_url，block 事件
 * wire 不携带该字段）；sandbox runner 产物不进事件流，以 artifact_id 为锚点合成已提交视图。
 */
function mergeServerArtifacts(
  current: ArtifactView[],
  list: readonly RunArtifact[],
): { artifacts: ArtifactView[]; changed: boolean } {
  if (list.length === 0) return { artifacts: current, changed: false };
  const knownIds = new Set(
    current
      .map((view) => view.artifact_ref?.artifact_id)
      .filter((id): id is string => id !== undefined),
  );
  let changed = false;
  const next = current.map((view) => {
    const refId = view.artifact_ref?.artifact_id;
    if (refId === undefined || view.download_url !== undefined) return view;
    const match = list.find((item) => item.artifact_id === refId);
    if (!match) return view;
    changed = true;
    return { ...view, download_url: match.download_url };
  });
  for (const item of list) {
    if (knownIds.has(item.artifact_id)) continue;
    knownIds.add(item.artifact_id);
    changed = true;
    next.push({
      block_id: item.artifact_id,
      logical_path: item.logical_path,
      media_type: item.media_type,
      size_bytes: item.size_bytes,
      content_digest: item.content_digest,
      artifact_ref: {
        artifact_id: item.artifact_id,
        logical_path: item.logical_path,
        media_type: item.media_type,
        size_bytes: item.size_bytes,
        content_digest: item.content_digest,
      },
      download_url: item.download_url,
      committed: true,
    });
  }
  return { artifacts: changed ? next : current, changed };
}

export interface RunStore {
  getState(): RunViewState;
  subscribe(listener: () => void): () => void;
  dispatch(event: PublicRunEvent): void;
  /** UI 提交答复后本地标注 resolution（用户自己的输入）；block.completed 到达时置 resolved。 */
  annotateResolution(interruptId: string, resolution: Record<string, unknown>): void;
  setConnection(connection: ConnectionState): void;
  setRecoveryFailure(failure: RecoveryFailure): void;
  /** Seed immutable Run identity metadata before the SSE begins. */
  applyRunSnapshot(snapshot: RunSnapshot): void;
  /**
   * Merge the authoritative artifact list (GET /runs/:id/artifacts) into view state.
   * Sandbox-runner outputs never appear as artifact block events; after a run reaches a
   * terminal status the client fetches the list once and merges it here. Event-sourced
   * entries win; they only gain download_url. No-op when nothing changes.
   */
  applyRunArtifacts(artifacts: RunArtifact[]): void;
  setTaskReviewActionPending(
    reviewId: string,
    decision: TaskReviewDecision,
    nextStageId?: string,
  ): void;
  setTaskReviewActionFailure(reviewId: string, failure: TaskReviewFailure): void;
  applyTaskReviewDecision(response: TaskReviewDecisionResponse): void;
  /**
   * Atomically install a validated transcript projection and seed the live continuation boundary.
   * Callers must build the projection in a temporary store first.
   */
  replaceReplay(
    snapshot: RunViewState,
    events: PublicRunEvent[],
    runId: string,
    snapshotSequence: number,
  ): void;
  /**
   * Consume a schema-valid but unknown SSE event without projecting UI state.
   * Hydrated stores still advance their strict continuation cursor.
   */
  skipReplayEvent(event: { run_id: string; event_id: string; sequence: number }): void;
  /** Highest accepted public sequence, including live events and unknown compatible envelopes. */
  getReplayCursor(): number | null;
  reset(): void;
}

export class RunSequenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RunSequenceError";
  }
}

export interface CreateRunStoreOptions {
  /** 工具展示名 / 进行态文案（reducer 用）；缺省 zhCN。 */
  toolCopy?: ToolCopy;
}

export function createRunStore(options: CreateRunStoreOptions = {}): RunStore {
  let state = emptyRunState();
  const listeners = new Set<() => void>();
  const seen = new Set<string>();
  let replayRunId: string | null = null;
  let replayCursor: number | null = null;
  /** 服务端产物列表（applyRunArtifacts 写入）；replaceReplay 重建视图时重新合并，见 mergeServerArtifacts。 */
  let syncedArtifacts: RunArtifact[] = [];

  const emit = () => {
    for (const l of listeners) l();
  };
  const commit = (next: RunViewState) => {
    if (next !== state) {
      state = next;
      emit();
    }
  };
  const consumeReplayEnvelope = (
    event: { run_id: string; event_id: string; sequence: number },
  ): boolean => {
    const key = event.event_id || `${event.run_id}:${event.sequence}`;
    if (replayRunId === null) {
      if (seen.has(key)) return false;
      if (replayCursor !== null && event.sequence <= replayCursor) {
        throw new RunSequenceError(
          `live sequence 回退或冲突：当前 ${replayCursor}，实际 ${event.sequence}`,
        );
      }
      seen.add(key);
      replayCursor = event.sequence;
      return true;
    }
    if (event.run_id !== replayRunId) {
      throw new RunSequenceError(
        `续流 run_id 不匹配：期望 ${replayRunId}，实际 ${event.run_id}`,
      );
    }
    if (replayCursor !== null && event.sequence <= replayCursor) {
      // SSE reconnect may replay the exact boundary event. Only an event already consumed
      // by hydration is a harmless duplicate; a new id at an old sequence is corruption.
      if (seen.has(key)) return false;
      throw new RunSequenceError(
        `续流 sequence 回退或冲突：当前 ${replayCursor}，实际 ${event.sequence}`,
      );
    }
    if (seen.has(key)) return false;
    seen.add(key);
    replayCursor = event.sequence;
    return true;
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(event) {
      if (!consumeReplayEnvelope(event)) return;
      commit(reduceEvent(state, event, options.toolCopy));
    },
    annotateResolution(interruptId, resolution) {
      const it = state.interrupt;
      if (!it || it.interrupt_id !== interruptId) return;
      // 本地乐观标注：interrupt 卡在 blocks 里的历史视图同步打标（block.completed
      // 未携带 resolution 时的补齐；wire 携带后以 wire 为准）。
      const blocks = state.blocks.map((b) =>
        b.kind === "interrupt" && b.interrupt.interrupt_id === interruptId
          ? { ...b, interrupt: { ...b.interrupt, resolution } }
          : b,
      );
      commit({ ...state, interrupt: { ...it, resolution }, blocks });
    },
    setConnection(connection) {
      commit({
        ...state,
        connection,
        recoveryFailure: connection === "recovery_failed" ? state.recoveryFailure : null,
      });
    },
    setRecoveryFailure(failure) {
      commit({ ...state, connection: "recovery_failed", recoveryFailure: failure });
    },
    applyRunSnapshot(snapshot) {
      const nextStatus =
        snapshot.status === "completed"
          ? "completed"
          : snapshot.status === "failed" || snapshot.status === "expired"
            ? "failed"
            : snapshot.status === "cancelled"
              ? "cancelled"
              : snapshot.status === "waiting_for_user"
                ? "waiting_user"
                : "running";
      const terminal =
        nextStatus === "completed" || nextStatus === "failed" || nextStatus === "cancelled";
      commit({
        ...state,
        runId: snapshot.run_id,
        taskProgress: snapshot.task_progress ?? state.taskProgress,
        ...(snapshot.task_progress
          && state.taskReview
          && state.taskReview.request.task_id !== snapshot.task_progress.task_id
          ? { taskReview: null }
          : {}),
        status: nextStatus,
        ...(terminal && state.interrupt && !state.interrupt.resolved
          ? { interrupt: { ...state.interrupt, resolved: true } }
          : {}),
        ...(terminal && state.blocks.some((b) => b.kind === "interrupt" && !b.interrupt.resolved)
          ? {
              blocks: state.blocks.map((b) =>
                b.kind === "interrupt" && !b.interrupt.resolved
                  ? { ...b, interrupt: { ...b.interrupt, resolved: true } }
                  : b,
              ),
            }
          : {}),
      });
    },
    applyRunArtifacts(list) {
      // 列表是 replay 持久状态：历史分页/恢复会 replaceReplay 重建视图，
      // 每次重建都按同一规则重新合并，产物不会被事件页冲掉。
      syncedArtifacts = list;
      const merged = mergeServerArtifacts(state.artifacts, syncedArtifacts);
      if (merged.changed) commit({ ...state, artifacts: merged.artifacts });
    },
    setTaskReviewActionPending(reviewId, decision, nextStageId) {
      const review = state.taskReview;
      if (!review || review.request.review_id !== reviewId || review.settled) return;
      commit({
        ...state,
        taskReview: {
          ...review,
          actionState: "pending",
          pendingDecision: decision,
          ...(nextStageId ? { pendingNextStageId: nextStageId } : {}),
          failure: undefined,
        },
      });
    },
    setTaskReviewActionFailure(reviewId, failure) {
      const review = state.taskReview;
      if (!review || review.request.review_id !== reviewId || review.settled) return;
      commit({
        ...state,
        taskReview: {
          ...review,
          actionState: "failed",
          pendingDecision: undefined,
          pendingNextStageId: undefined,
          failure,
        },
      });
    },
    applyTaskReviewDecision(response) {
      const current = state.taskReview;
      if (
        current
        && (
          current.request.review_id !== response.review.review_id
          || current.request.task_id !== response.review.task_id
        )
      ) {
        return;
      }
      commit({
        ...state,
        taskProgress: response.task_progress,
        taskReview: {
          request: response.review,
          settled: response.review.status !== "pending",
          actionState: "succeeded",
        },
      });
    },
    replaceReplay(snapshot, events, runId, snapshotSequence) {
      seen.clear();
      for (const event of events) {
        seen.add(event.event_id || `${event.run_id}:${event.sequence}`);
      }
      replayRunId = runId;
      replayCursor = snapshotSequence;
      // 重放重建视图时保留已同步的服务端产物（历史分页逐页重建，不得冲掉）。
      const merged = mergeServerArtifacts(snapshot.artifacts, syncedArtifacts);
      commit({ ...snapshot, artifacts: merged.artifacts, connection: "replay" });
    },
    skipReplayEvent(event) {
      consumeReplayEnvelope(event);
    },
    getReplayCursor: () => replayCursor,
    reset() {
      seen.clear();
      replayRunId = null;
      replayCursor = null;
      syncedArtifacts = [];
      commit(emptyRunState());
    },
  };
}

/**
 * 只读快照 store —— 把某一轮运行结束时的 RunViewState 定格为不可变视图。
 * 多轮会话里，历史轮用它复用同一套块组件渲染：getState 恒返回定格快照，
 * subscribe 为空（永不通知，历史轮渲染后不再重算），写操作全部 no-op。
 *
 * connection 强制落 "replay"：冻结快照不是实时输出，TextBlock 等组件据此跳过打字机动画。
 */
export function createFrozenStore(snapshot: RunViewState): RunStore {
  const frozen: RunViewState = { ...snapshot, connection: "replay" };
  return {
    getState: () => frozen,
    subscribe: () => () => {},
    dispatch: () => {},
    annotateResolution: () => {},
    setConnection: () => {},
    setRecoveryFailure: () => {},
    applyRunSnapshot: () => {},
    applyRunArtifacts: () => {},
    setTaskReviewActionPending: () => {},
    setTaskReviewActionFailure: () => {},
    applyTaskReviewDecision: () => {},
    replaceReplay: () => {},
    skipReplayEvent: () => {},
    getReplayCursor: () => null,
    reset: () => {},
  };
}

export const RunStoreContext = createContext<RunStore | null>(null);

export function useRunStore(): RunStore {
  const store = useContext(RunStoreContext);
  if (!store) throw new Error("useRunStore must be used within RunStoreContext");
  return store;
}

/** 订阅整棵状态树；引用仅在 dispatch 产生变更时改变。 */
export function useRunState(): RunViewState {
  const store = useRunStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
