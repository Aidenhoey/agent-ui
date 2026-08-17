import { createContext } from "react";

export interface SubagentPanelValue {
  /** 当前在右侧详情栏打开的子 agent 块 id；未打开为 null。 */
  activeAgentId: string | null;
  openAgent: (blockId: string) => void;
}

/**
 * 时间线里的子 agent 卡片借此打开右侧详情栏。
 * renderBlock 是纯分发函数且被 ProcessGroup 复用，用 context 穿透避免层层传参；
 * 默认 no-op，块在无面板宿主（如单测）下渲染也不报错。
 */
export const SubagentPanelContext = createContext<SubagentPanelValue>({
  activeAgentId: null,
  openAgent: () => {},
});
