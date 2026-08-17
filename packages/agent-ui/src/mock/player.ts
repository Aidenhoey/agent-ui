/**
 * Mock 事件流播放器 —— 按相对延迟把脚本事件依次 dispatch 进 store，
 * 模拟真实 SSE 时序（含 text.delta 的逐句节奏）。
 *
 * 支持在标记了 pauseAfter 的步骤后暂停（用于 interrupt：等 UI 提交后 resume 续播）。
 * 这是"验证手感"的驱动器，不参与生产逻辑。
 *
 * 与 SRC 的差异：RunPlayer 显式 extends runtime 的 RunPlayerLike 依赖接口，
 * 保证经 createRunRuntime(config.createPlayer) 注入时形状始终匹配。
 */

import type { PublicRunEvent } from "../protocol/events.js";
import type { RunPlayerLike } from "../runtime/runRuntime.js";
import type { RunStore } from "../state/store.js";

export interface PlaybackStep {
  delayMs: number;
  event: PublicRunEvent;
  /** 播完此步后暂停，交给 UI（如 interrupt.raised）。 */
  pauseAfter?: boolean | undefined;
}

export type PlayerPhase = "idle" | "playing" | "paused" | "done";

export interface RunPlayer extends RunPlayerLike {
  getPhase(): PlayerPhase;
}

export function createRunPlayer(
  store: RunStore,
  steps: PlaybackStep[],
  opts: { speed?: number; onPause?: () => void; onDone?: () => void; onPhase?: (p: PlayerPhase) => void } = {},
): RunPlayer {
  const speed = opts.speed ?? 1;
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let phase: PlayerPhase = "idle";

  const setPhase = (p: PlayerPhase) => {
    phase = p;
    opts.onPhase?.(p);
  };

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const runNext = () => {
    const step = steps[index];
    if (index >= steps.length || !step) {
      setPhase("done");
      opts.onDone?.();
      return;
    }
    timer = setTimeout(() => {
      store.dispatch(step.event);
      index += 1;
      if (step.pauseAfter) {
        setPhase("paused");
        opts.onPause?.();
        return;
      }
      runNext();
    }, Math.max(0, step.delayMs / speed));
  };

  return {
    play() {
      clear();
      index = 0;
      store.reset();
      setPhase("playing");
      runNext();
    },
    resume() {
      if (phase !== "paused") return;
      setPhase("playing");
      runNext();
    },
    stop() {
      clear();
      setPhase("idle");
    },
    getPhase: () => phase,
  };
}
