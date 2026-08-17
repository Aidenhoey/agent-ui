/**
 * pages/components/demo-utils.ts —— 组件页 demo 的 store 构造 / 截断 / 续播纯逻辑工具。
 *
 * 提炼自同目录 _showcase-reference.tsx（该文件保留作完整参考，这里只收无 JSX 的部分）：
 * - buildDemoStore：把 buildScenarios(locale) 的演示剧本逐事件灌进 createRunStore；
 *   live=true 保持 "live" 连接（TextBlock 打字机生效），否则落 "replay" 直出终态。
 * - stepsUpToPause / stepsUpToEvent / isBlockEvent：半途态截断（流式正文 / 工具运行中 /
 *   todo 进行中 / interrupt 悬停等待输入）。
 * - splitAtPause + replayTail：可交互 interrupt demo 的暂停切分与提交续播 —— interrupt
 *   闭合事件的 resolution 换成用户的真实提交，卡片转已答复、run 推进到完成。
 * 带 JSX 的 demo 原语（StoreDemo / InteractiveInterruptDemo 等）集中在 registry.tsx。
 */

import { useMemo } from "react";

import {
  buildScenarios,
  createRunStore,
  dictionaries,
  useLocale,
  type LocaleCode,
  type PlaybackStep,
  type PublicRunEvent,
  type RunStore,
  type Scenario,
} from "@diribo/agent-ui";

/** 把一段事件流灌进真实 run store；live=true 保持 "live" 连接（打字机生效），否则落 "replay"。 */
export function buildDemoStore(steps: PlaybackStep[], locale: LocaleCode, live = false): RunStore {
  const store = createRunStore({ toolCopy: dictionaries[locale].blocks.tool });
  for (const step of steps) store.dispatch(step.event);
  if (!live) store.setConnection("replay");
  return store;
}

/** 截到首个 pauseAfter 步骤（含）—— interrupt 悬停等待用户输入的半途态。 */
export function stepsUpToPause(scenario: Scenario): PlaybackStep[] {
  const index = scenario.steps.findIndex((step) => step.pauseAfter);
  return index >= 0 ? scenario.steps.slice(0, index + 1) : scenario.steps;
}

/** 截到第 occurrence 个匹配事件（含）。 */
export function stepsUpToEvent(
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
export function isBlockEvent(event: PublicRunEvent, kind: string, eventType: string): boolean {
  return event.event_type === eventType && (event.payload as { kind?: string }).kind === kind;
}

/** 按首个 pauseAfter 切分：head 含暂停步骤（interrupt 悬停等待输入），tail 为其后剩余事件。 */
export function splitAtPause(scenario: Scenario): { head: PlaybackStep[]; tail: PlaybackStep[] } {
  const index = scenario.steps.findIndex((step) => step.pauseAfter);
  return index >= 0
    ? { head: scenario.steps.slice(0, index + 1), tail: scenario.steps.slice(index + 1) }
    : { head: scenario.steps, tail: [] };
}

/**
 * 提交后续播 tail：interrupt 闭合事件的 resolution 换成用户真实提交
 * （wire 剧本值 → 本地字段级值），卡片转已答复、run 推进到完成。
 */
export function replayTail(store: RunStore, tail: PlaybackStep[], resolution: Record<string, unknown>): void {
  for (const step of tail) {
    const event = step.event;
    if (isBlockEvent(event, "interrupt", "block.completed")) {
      store.dispatch({
        ...event,
        payload: { ...(event.payload as Record<string, unknown>), resolution },
      } as PublicRunEvent);
    } else {
      store.dispatch(event);
    }
  }
}

/** 当前 locale 的演示剧本（随 locale 重建；事件时间戳 / 序列号随之刷新）。 */
export function useScenarios(): Scenario[] {
  const { locale } = useLocale();
  return useMemo(() => buildScenarios(locale), [locale]);
}

/** 取单条剧本；未知 id 回落第一条（六条剧本 id 固定，正常不会触发）。 */
export function useScenario(id: string): Scenario {
  const scenarios = useScenarios();
  return scenarios.find((scenario) => scenario.id === id) ?? scenarios[0]!;
}
