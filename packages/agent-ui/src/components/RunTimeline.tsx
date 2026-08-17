import { useRunArtifactsSync } from "../hooks/useRunArtifactsSync.js";
import type { TaskReviewDecision } from "../protocol/entities.js";
import { useRunState } from "../state/store.js";
import type { ArtifactView, RunViewState } from "../state/view-types.js";
import { AgentActions } from "./AgentActions.js";
import { ArtifactCard } from "./ArtifactCard.js";
import { ConnectionBanner } from "./ConnectionBanner.js";
import { EvidenceList } from "./EvidenceList.js";
import { ProcessGroup } from "./ProcessGroup.js";
import { renderBlock, type RenderBlockOptions } from "./renderBlock.js";
import { RunErrorCard } from "./RunErrorCard.js";
import { TaskProgressCard } from "./TaskProgressCard.js";
import { TaskReviewCard } from "./TaskReviewCard.js";

/**
 * 决定块时间线怎么渲染：
 * - 仅在成功完成（completed）时，把"最后一段正文"前的普通过程块收进 ProcessGroup 折叠，
 *   最终正文和 sandbox 终态摘要留在外面全量展示。
 * - 进行中 / 等待用户 / 失败 / 取消 一律平铺，保证过程实时可见、便于排查。
 * - interrupt 卡（提问/计划）永不进折叠：已答复卡是用户需要回看的交互历史。
 */
function renderTimelineBody(state: RunViewState, blockOptions: RenderBlockOptions) {
  const { status } = state;
  const agentBlockIds = new Set(
    state.blocks.filter((block) => block.kind === "agent").map((block) => block.block_id),
  );
  // 只隐藏子 agent 的内部块；parentId 也用于表达 sandbox → tool 的公开生命周期归属，
  // 这类安全结果仍属于主时间线。
  const blocks = state.blocks.filter(
    (block) => !block.parentId || !agentBlockIds.has(block.parentId),
  );
  if (status !== "completed") {
    return blocks.map((block) => renderBlock(block, blockOptions));
  }

  // 定位最后一个正文块作为最终输出。
  let lastTextIdx = -1;
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i]!.kind === "text") {
      lastTextIdx = i;
      break;
    }
  }
  // 无正文，或正文即首块（其前无中间过程）——直接平铺兜底。
  if (lastTextIdx <= 0) {
    return blocks.map((block) => renderBlock(block, blockOptions));
  }

  const intermediateBlocks = blocks.slice(0, lastTextIdx);
  // Sandbox 结果是用户需要直接确认的安全摘要。历史 hydration 后若把它们收进
  // 默认关闭的 ProcessGroup，成功/失败卡会从 DOM 消失。保留在折叠组外，同时继续
  // 折叠推理、工具调用和早期正文。
  const sandboxSummaries = intermediateBlocks.filter((block) => block.kind === "sandbox");
  // 提问/计划卡是用户交互历史，同样永不收进折叠组。
  const interruptCards = intermediateBlocks.filter((block) => block.kind === "interrupt");
  const processBlocks = intermediateBlocks.filter(
    (block) => block.kind !== "sandbox" && block.kind !== "interrupt",
  );
  const finalBlocks = blocks.slice(lastTextIdx); // 最后一段正文及其后可能的尾块
  const durationMs =
    state.completedAt && state.startedAt ? state.completedAt - state.startedAt : undefined;

  return (
    <>
      {processBlocks.length > 0 ? (
        <ProcessGroup blocks={processBlocks} durationMs={durationMs} />
      ) : null}
      {sandboxSummaries.map((block) => renderBlock(block, blockOptions))}
      {interruptCards.map((block) => renderBlock(block, blockOptions))}
      {finalBlocks.map((block) => renderBlock(block, blockOptions))}
    </>
  );
}

/**
 * 一轮运行的块时间线。
 *
 * 与 SRC 的差异：useRunArtifactsSync 在库内是 mock 对齐的 no-op（无 REST 层，
 * 产物随事件流注入 state.artifacts）；保留调用点以对齐 SRC 结构，真实后端模式
 * 随 REST 层落地后由该钩子恢复「终态拉取产物列表合并」语义。
 */
export function RunTimeline({
  activeArtifactId,
  onOpenArtifact,
  onSubmitInterrupt,
  onRetry,
  onRetryConnection,
  onReloadConversation,
  onBranch,
  onTaskReviewDecision,
  interruptReadOnly,
  taskReviewReadOnly,
  readOnly = false,
}: {
  activeArtifactId?: string | undefined;
  onOpenArtifact: (a: ArtifactView) => void;
  onSubmitInterrupt: (resolution: Record<string, unknown>) => void;
  onRetry: () => void;
  onRetryConnection?: (() => void) | undefined;
  onReloadConversation?: (() => void) | undefined;
  onBranch: () => void;
  onTaskReviewDecision?: ((decision: TaskReviewDecision, nextStageId?: string) => void) | undefined;
  interruptReadOnly?: boolean | undefined;
  taskReviewReadOnly?: boolean | undefined;
  readOnly?: boolean;
}) {
  const state = useRunState();
  // 终态后把服务端产物列表合并进 state.artifacts（sandbox 产物不走事件流）；库内为 no-op。
  useRunArtifactsSync();

  const agentBlockIds = new Set(
    state.blocks.filter((block) => block.kind === "agent").map((block) => block.block_id),
  );
  // 复制载荷：本轮所有主时间线正文块拼接，仅排除子 agent 内部正文。
  const copyText = state.blocks
    .filter(
      (block) =>
        block.kind === "text"
        && (!block.parentId || !agentBlockIds.has(block.parentId)),
    )
    .map((b) => (b as { text: string }).text)
    .join("\n\n")
    .trim();

  return (
    <div
      className="agent-turn__body"
      data-run-id={state.runId ?? undefined}
      data-run-status={state.status}
    >
      <ConnectionBanner
        connection={state.connection}
        failure={state.recoveryFailure}
        onRetry={onRetryConnection}
        onReload={onReloadConversation}
      />
      {state.taskProgress ? <TaskProgressCard progress={state.taskProgress} /> : null}

      {state.taskReview ? (
        <TaskReviewCard
          review={state.taskReview}
          progress={state.taskProgress}
          onDecision={onTaskReviewDecision ?? (() => {})}
          readOnly={taskReviewReadOnly ?? readOnly}
        />
      ) : null}

      {renderTimelineBody(state, {
        onSubmitInterrupt,
        interruptReadOnly: interruptReadOnly ?? readOnly,
      })}

      {state.artifacts.length ? (
        <div className="agent-artifacts">
          {state.artifacts.map((a) => (
            <ArtifactCard
              key={a.block_id}
              artifact={a}
              active={a.block_id === activeArtifactId}
              onOpen={onOpenArtifact}
            />
          ))}
        </div>
      ) : null}

      <EvidenceList />

      {state.error ? (
        <RunErrorCard error={state.error} retryable={state.error.retryable} onRetry={onRetry} />
      ) : null}

      {state.status === "completed"
      && (!state.taskProgress || state.taskProgress.status === "completed" || state.taskProgress.status === "stopped")
      && !readOnly ? (
        <AgentActions copyText={copyText} onRetry={onRetry} onBranch={onBranch} />
      ) : null}
    </div>
  );
}
