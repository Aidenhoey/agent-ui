/**
 * pages/playground/PlaygroundPage.tsx —— 演练场页（/playground）。
 *
 * 选一条 buildScenarios(locale) 的演示剧本，用 createRunStore + createRunPlayer
 * 在固定高的对话区里实时播放完整 run 时间线（RunStoreContext.Provider + RunTimeline，
 * 与会话页同一套渲染路径）。interrupt 剧本播到 pauseAfter 暂停点停住，InterruptCard
 * 提交后 store.annotateResolution + player.resume() 续播到终态（与库 runRuntime
 * mock 同语义；wire 闭合事件携带的 resolution 以 wire 为准）。
 *
 * 底部 Composer 可输入：发送 = 以输入文本为用户消息重播当前场景；播放中主按钮
 * 变停止 → player.stop()。状态全部页内 useState/useRef，无全局 runtime；
 * 场景 / locale 切换或重播都会重建 store + player 并自动播放（事件信封时间戳
 * 随 buildScenarios 重建刷新，可安全重播，见 scripts.ts 注释）。
 */

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import {
  buildScenarios,
  Composer,
  ContentModal,
  createRunPlayer,
  createRunStore,
  dictionaries,
  RunStoreContext,
  RunTimeline,
  StreamingMarkdown,
  useLocale,
  useRunState,
  UserMessage,
  type ArtifactView,
  type ComposerSubmit,
  type MessageAttachment,
  type PlayerPhase,
} from "@diribo/agent-ui";

import { RotateCcw } from "../../lib/icons.js";

/** 播放中跟随 store 的每次 dispatch 把对话区滚到底部。 */
function AutoScroll({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const state = useRunState();
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state, scrollRef]);
  return null;
}

export function PlaygroundPage() {
  const { dict, locale } = useLocale();
  const t = dict.playground;

  const scenarios = useMemo(() => buildScenarios(locale), [locale]);
  const [scenarioId, setScenarioId] = useState("success");
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0]!;

  // 用户气泡：缺省场景 userPrompt；Composer 发送后以实际输入重播。按 场景+locale
  // 归账 —— 切场景 / 切语言后键不匹配，自动回落到对应语言的 userPrompt。
  const promptKey = `${scenario.id}:${locale}`;
  const [customPrompt, setCustomPrompt] = useState<{
    key: string;
    text: string;
    attachments: MessageAttachment[];
  } | null>(null);
  const isCustom = customPrompt !== null && customPrompt.key === promptKey;
  const userText = isCustom ? customPrompt.text : scenario.userPrompt;
  const userAttachments = isCustom ? customPrompt.attachments : undefined;

  // store + player 成对重建：切场景 / 切语言 / 重播（seed 递增）；重建后 effect 自动播放。
  const [seed, setSeed] = useState(0);
  const [phase, setPhase] = useState<PlayerPhase>("idle");
  const runtime = useMemo(() => {
    const store = createRunStore({ toolCopy: dictionaries[locale].blocks.tool });
    const player = createRunPlayer(store, scenario.steps, { onPhase: setPhase });
    return { store, player };
  }, [scenario, locale, seed]);

  useEffect(() => {
    runtime.player.play();
    return () => runtime.player.stop();
  }, [runtime]);

  const replay = () => setSeed((value) => value + 1);

  // interrupt 提交 = 本地乐观标注 resolution + 续播暂停点之后的剩余事件到终态。
  const submitInterrupt = (resolution: Record<string, unknown>) => {
    const current = runtime.store.getState().interrupt;
    if (current) runtime.store.annotateResolution(current.interrupt_id, resolution);
    runtime.player.resume();
  };

  const sendPrompt = (value: ComposerSubmit) => {
    setCustomPrompt({ key: promptKey, text: value.text, attachments: value.attachments });
    replay();
  };

  // 播放 / 悬停等待都算忙碌：Composer 主按钮切「停止」。
  const busy = phase === "playing" || phase === "paused";
  const statusLabel =
    phase === "playing"
      ? t.status.live
      : phase === "paused"
        ? t.status.waiting
        : phase === "done"
          ? t.status.completed
          : null;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [previewArtifact, setPreviewArtifact] = useState<ArtifactView | null>(null);

  return (
    <section className="docs-page pg-page" aria-labelledby="playground-title">
      <h1 id="playground-title">{t.title}</h1>
      <p className="docs-page__desc">{t.description}</p>

      <div className="pg-toolbar">
        <div className="pg-scenarios" role="group" aria-label={t.scenarioSelectAria}>
          <span className="pg-scenarios__label">{t.scenarioLabel}</span>
          {scenarios.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === scenario.id ? "pg-chip pg-chip--active" : "pg-chip"}
              aria-pressed={item.id === scenario.id}
              onClick={() => setScenarioId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="pg-toolbar__side">
          {statusLabel ? (
            <span className="pg-status" data-phase={phase}>
              {statusLabel}
            </span>
          ) : null}
          <button type="button" className="pg-replay" onClick={replay}>
            <RotateCcw size={14} aria-hidden="true" />
            {t.replay}
          </button>
        </div>
      </div>

      <div className="pg-conversation" role="region" aria-label={t.conversationAria}>
        <div className="pg-conversation__scroll" ref={scrollRef}>
          <UserMessage text={userText} attachments={userAttachments} />
          <RunStoreContext.Provider value={runtime.store}>
            <AutoScroll scrollRef={scrollRef} />
            {/* readOnly 隐藏轮末操作行（复制/重试/分支无宿主语义）；interrupt 保持可交互。 */}
            <RunTimeline
              readOnly
              interruptReadOnly={false}
              onOpenArtifact={setPreviewArtifact}
              onSubmitInterrupt={submitInterrupt}
              onRetry={replay}
              onBranch={() => {}}
            />
          </RunStoreContext.Provider>
        </div>
      </div>

      <div className="pg-composer">
        <Composer busy={busy} onStop={() => runtime.player.stop()} onSubmit={sendPrompt} />
      </div>

      <ContentModal
        open={previewArtifact !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewArtifact(null);
        }}
        overline={t.artifactPreviewOverline}
        title={previewArtifact?.logical_path ?? ""}
      >
        <StreamingMarkdown text={previewArtifact?.preview_content ?? ""} renderCitation={() => null} />
      </ContentModal>
    </section>
  );
}
