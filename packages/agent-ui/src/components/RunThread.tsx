import { ArrowDown } from "lucide-react";

import { useStickToBottom } from "../hooks/useStickToBottom.js";
import { useLocale } from "../i18n/locale-context.js";
import type { SentMessage } from "../protocol/entities.js";
import { RunStoreContext, useRunState, useRunStore, type RunStore } from "../state/store.js";
import type { ArtifactView } from "../state/view-types.js";
import { RunTimeline } from "./RunTimeline.js";
import { SubagentPanelContext } from "./subagent-panel-context.js";
import { ThreadNav, type ThreadNavItem } from "./ThreadNav.js";
import { UserMessage } from "./UserMessage.js";

/** 一轮会话：用户提问 + 归约后的运行状态（历史轮为冻结快照 store，live 轮为实时 store）。 */
export interface Turn {
  id: string;
  user: SentMessage;
  store: RunStore;
}

/** 定位某个面板归属的轮次与块 id（同场景多轮重演时 id 会重复，故需带 turnId 消歧）。 */
export interface PanelTarget {
  turnId: string;
  id: string;
}

/**
 * 一个会话的多轮主体：历史轮（冻结）+ 当前 live 轮，共用一个滚动容器。
 * 每轮包在自己的 RunStore / 子 agent 面板上下文里，块组件（RunTimeline 等）无需改动即可按轮渲染。
 */
export function RunThread({
  pastTurns,
  liveUser,
  onSubmitInterrupt,
  onRetryTurn,
  onBranchTurn,
  activeArtifact,
  onOpenArtifact,
  activeAgent,
  onOpenAgent,
}: {
  pastTurns: Turn[];
  /** 当前 live 轮的用户提问（已在宿主处兜底，恒非空）。 */
  liveUser: SentMessage;
  onSubmitInterrupt: (resolution: Record<string, unknown>) => void;
  /** 重试某轮：历史轮传其下标，live 轮传 "live"。 */
  onRetryTurn: (target: number | "live") => void;
  onBranchTurn: (target: number) => void;
  activeArtifact: PanelTarget | null;
  onOpenArtifact: (turnId: string, store: RunStore, artifact: ArtifactView) => void;
  activeAgent: PanelTarget | null;
  onOpenAgent: (turnId: string, store: RunStore, blockId: string) => void;
}) {
  const { dict } = useLocale();
  const liveStore = useRunStore();
  const liveState = useRunState();
  const { ref, onScroll, showJump, scrollToBottom } = useStickToBottom(liveState);

  const liveTurn: Turn = { id: "live", user: liveUser, store: liveStore };
  const turns: Turn[] = [...pastTurns, liveTurn];
  const lastIndex = turns.length - 1;

  const navItems: ThreadNavItem[] = turns.map((turn, index) => ({ index, text: turn.user.text }));

  return (
    <>
      <div className="conversation-scroll agent-scroll" ref={ref} onScroll={onScroll}>
        <div className="agent-thread">
          {turns.map((turn, index) => {
            const isLive = index === lastIndex;
            return (
              <RunStoreContext.Provider key={turn.id} value={turn.store}>
                <SubagentPanelContext.Provider
                  value={{
                    activeAgentId: activeAgent?.turnId === turn.id ? activeAgent.id : null,
                    openAgent: (blockId) => onOpenAgent(turn.id, turn.store, blockId),
                  }}
                >
                  <div
                    className="agent-thread__turn"
                    data-thread-anchor={index}
                    id={`thread-anchor-${index}`}
                  >
                    {turn.user.taskContinuation ? null : (
                      <UserMessage
                        text={turn.user.text}
                        attachments={turn.user.attachments}
                        skillId={turn.user.skillId}
                        skillLabel={turn.user.skillLabel}
                      />
                    )}
                    <div className="agent-turn agent-turn--assistant">
                      <RunTimeline
                        activeArtifactId={
                          activeArtifact?.turnId === turn.id ? activeArtifact.id : undefined
                        }
                        onOpenArtifact={(artifact) => onOpenArtifact(turn.id, turn.store, artifact)}
                        onSubmitInterrupt={isLive ? onSubmitInterrupt : () => {}}
                        onRetry={() => onRetryTurn(isLive ? "live" : index)}
                        onBranch={() => onBranchTurn(index)}
                      />
                    </div>
                  </div>
                </SubagentPanelContext.Provider>
              </RunStoreContext.Provider>
            );
          })}
        </div>

        {/* sticky 底座：贴滚动视口底部居中悬浮，随内容滚动而不随内容位移。 */}
        <div className="agent-jump-dock">
          {showJump ? (
            <button type="button" className="agent-jump" onClick={scrollToBottom} aria-label={dict.thread.jumpToBottom}>
              <ArrowDown className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {turns.length >= 2 ? <ThreadNav items={navItems} scrollRef={ref} /> : null}
    </>
  );
}
