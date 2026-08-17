/**
 * Run runtime —— 路由无关的 Run 控制器（接口骨架）。
 *
 * 移植自 agent-portal 的 runtime/runRuntime.ts，Wave 0 只交付 mock 模式：
 * - send → 调 createPlayer 工厂拿 mock player 并 play（player 由后续 mock agent 交付）；
 * - stop → 本地合成 run.cancelled + player.stop()；
 * - submitInterrupt → store.annotateResolution 乐观标注 + player.resume()；
 * - adoptRun → store.reset + applyRunSnapshot。
 * 真实后端模式（createRun / SSE / resumeRun / recovery）不实现，只保留接口形状与
 * TODO 锚点；config.useMock 缺省视为 true，传 false 会在 send 时抛错（防误用）。
 */

import type { RunSnapshot } from "../protocol/entities.js";
import type { PublicRunEvent, ToolCopy } from "../protocol/events.js";
import { createRunStore, type RunStore } from "../state/store.js";

/**
 * mock 事件播放器依赖接口（dependency seam）：runtime 不 import 具体 player 实现，
 * 由 config.createPlayer 注入。mock player 交付方需满足此形状（play/resume/stop）。
 */
export interface RunPlayerLike {
  play(): void;
  resume(): void;
  stop(): void;
}

let uiSeq = 900_000;
function mkEvent(runId: string, type: string, payload: unknown): PublicRunEvent {
  uiSeq += 1;
  return {
    schema_version: 2,
    event_id: `evt_ui_${uiSeq}`,
    run_id: runId,
    sequence: uiSeq,
    occurred_at: new Date().toISOString(),
    event_type: type,
    payload,
  } as unknown as PublicRunEvent;
}

export interface AgentRunController {
  store: RunStore;
  send: (
    prompt: string,
    effort?: string,
    skillId?: string,
    inputFileIds?: string[],
    idempotencyKey?: string,
  ) => void;
  stop: () => void;
  submitInterrupt: (resolution: Record<string, unknown>) => void;
  retryConnection: () => void;
  adoptRun: (snapshot: RunSnapshot) => void;
}

export interface RunRuntimeConfig {
  /** 缺省 true；false = 真实后端模式（Wave 0 未实现，send 会抛错）。 */
  useMock?: boolean | undefined;
  store?: RunStore;
  /** 工具展示文案（透传 createRunStore；store 外给时忽略）。 */
  toolCopy?: ToolCopy;
  conversationId?: string | null | undefined;
  onRunCreated?: ((snapshot: RunSnapshot) => void) | undefined;
  onFirstRunStateChange?: ((status: "creating" | "failed") => void) | undefined;
  /**
   * mock 播放器工厂：每次 send 调用一次并 play。
   * TODO(mock agent)：实现 createRunPlayer(store, steps, opts) 后在壳层注入。
   */
  createPlayer?: ((store: RunStore) => RunPlayerLike) | undefined;
}

export interface RunRuntimeUpdate {
  conversationId?: string | null | undefined;
  onRunCreated?: RunRuntimeConfig["onRunCreated"] | undefined;
  onFirstRunStateChange?: RunRuntimeConfig["onFirstRunStateChange"] | undefined;
  createPlayer?: RunRuntimeConfig["createPlayer"] | undefined;
}

export interface RunRuntime extends AgentRunController {
  update(config: RunRuntimeUpdate): void;
  dispose(reason: string): void;
  isDisposed(): boolean;
}

/**
 * A route-independent Run owner. React consumers may attach and detach freely; only
 * the registry (or the standalone hook adapter) decides when this object is disposed.
 */
export function createRunRuntime(initialConfig: RunRuntimeConfig): RunRuntime {
  let config = { ...initialConfig };
  const useMock = config.useMock ?? true;
  const store = config.store ?? createRunStore({ ...(config.toolCopy ? { toolCopy: config.toolCopy } : {}) });
  let player: RunPlayerLike | null = null;
  let disposed = false;

  const controller: RunRuntime = {
    store,
    send: (_prompt, _effort, _skillId, _inputFileIds, _idempotencyKey) => {
      if (disposed) return;
      if (!useMock) {
        // TODO(real 模式)：createRun → applyRunSnapshot → SSE 续流（recovery）。
        throw new Error("createRunRuntime: 真实后端模式尚未实现，请使用 mock 模式");
      }
      player?.stop();
      store.reset();
      player = config.createPlayer?.(store) ?? null;
      player?.play();
    },
    stop: () => {
      if (disposed) return;
      const { runId } = store.getState();
      if (runId) store.dispatch(mkEvent(runId, "run.cancelled", { reason: "user_stop" }));
      player?.stop();
      // TODO(real 模式)：cancelRun(runId, "user_stop") → applyRunSnapshot。
    },
    submitInterrupt: (resolution) => {
      if (disposed) return;
      const state = store.getState();
      if (!state.interrupt || !state.runId) return;
      store.annotateResolution(state.interrupt.interrupt_id, resolution);
      player?.resume();
      // TODO(real 模式)：toResumeInput + resumeRun → applyRunSnapshot → 续流。
    },
    retryConnection: () => {
      // TODO(real 模式)：recovery 重连；mock 模式无连接可重试。
    },
    adoptRun: (snapshot) => {
      if (disposed) return;
      if (config.conversationId && snapshot.conversation_id !== config.conversationId) {
        throw new Error("待接管 Run 返回了不匹配的 conversation_id");
      }
      config.conversationId = snapshot.conversation_id;
      player?.stop();
      player = null;
      store.reset();
      store.applyRunSnapshot(snapshot);
      // TODO(real 模式)：applyRunSnapshot 后接 SSE 续流。
    },
    update: (next) => {
      if (disposed) return;
      if (
        next.conversationId
        && config.conversationId
        && next.conversationId !== config.conversationId
      ) {
        throw new Error("不能把 Run runtime 重新绑定到其它 conversation_id");
      }
      config = { ...config, ...next };
    },
    dispose: (_reason) => {
      if (disposed) return;
      disposed = true;
      player?.stop();
      player = null;
    },
    isDisposed: () => disposed,
  };

  return controller;
}
