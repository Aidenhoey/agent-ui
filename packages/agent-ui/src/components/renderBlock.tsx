import type { RunBlock } from "../state/view-types.js";
import { BrowserBlock } from "./blocks/BrowserBlock.js";
import { InterruptBlockCard } from "./blocks/InterruptBlockCard.js";
import { ReasoningBlock } from "./blocks/ReasoningBlock.js";
import { SandboxBlock } from "./blocks/SandboxBlock.js";
import { SubagentBlock } from "./blocks/SubagentBlock.js";
import { TextBlock } from "./blocks/TextBlock.js";
import { ToolCallBlock } from "./blocks/ToolCallBlock.js";

export interface RenderBlockOptions {
  /** interrupt 卡交互提交回调；未传时卡按已答复/只读降级渲染。 */
  onSubmitInterrupt?: (resolution: Record<string, unknown>) => void;
  /** interrupt 卡只读（历史轮 / 会话副本）；未传时按已答复卡渲染。 */
  interruptReadOnly?: boolean;
}

/** 按块类型分发渲染。RunTimeline、ProcessGroup 与子 agent 详情面板共用，抽出以避免循环依赖。 */
export function renderBlock(block: RunBlock, options?: RenderBlockOptions) {
  switch (block.kind) {
    case "text":
      return <TextBlock key={block.block_id} block={block} />;
    case "reasoning":
      return <ReasoningBlock key={block.block_id} block={block} />;
    case "tool":
      return <ToolCallBlock key={block.block_id} block={block} />;
    case "browser":
      return <BrowserBlock key={block.block_id} block={block} />;
    case "agent":
      return <SubagentBlock key={block.block_id} block={block} />;
    case "sandbox":
      return <SandboxBlock key={block.block_id} block={block} />;
    case "interrupt":
      return (
        <InterruptBlockCard
          key={block.block_id}
          block={block}
          onSubmit={options?.onSubmitInterrupt ?? (() => {})}
          readOnly={options?.interruptReadOnly ?? true}
        />
      );
  }
}
