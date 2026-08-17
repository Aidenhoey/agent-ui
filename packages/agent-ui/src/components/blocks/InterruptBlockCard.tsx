import type { InterruptBlock } from "../../state/view-types.js";
import { InterruptCard } from "../InterruptCard.js";

/**
 * 时间线里的提问卡/计划卡：作为块按 sequence 与正文/工具块排序渲染。
 * resolved 显示已答复摘要（含用户选择）；未 resolved 且可交互时渲染表单。
 */
export function InterruptBlockCard({
  block,
  onSubmit,
  readOnly,
}: {
  block: InterruptBlock;
  onSubmit: (resolution: Record<string, unknown>) => void;
  readOnly?: boolean;
}) {
  const readOnlyFlag = readOnly === true;
  return (
    <InterruptCard
      interrupt={block.interrupt}
      onSubmit={onSubmit}
      readOnly={readOnlyFlag}
    />
  );
}
