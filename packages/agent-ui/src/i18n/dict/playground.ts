/**
 * playground 域：演练场页（/playground）文案 —— 页面标题 / 描述、场景选择器、
 * 重播控件与连接状态标签；对话区与产物预览弹窗的辅助文案由本域一并承载。
 *
 * 归 playground 页 agent 维护：接口与 en-US / zh-CN 两份值同构增补。
 * 注：场景名直接取 buildScenarios(locale) 返回的 Scenario.label（已随 locale
 * 双语），本域不重复承载；页面其余正文文案由页面 agent 在 app 侧补。
 */
export interface PlaygroundDict {
  /** 页面标题（h1）。 */
  title: string;
  /** 页面简介（标题下一行）。 */
  description: string;
  /** 场景选择器的标签与 aria-label；选项文本用 Scenario.label。 */
  scenarioLabel: string;
  scenarioSelectAria: string;
  /** 重播按钮：重建 store 重演当前场景。 */
  replay: string;
  /** 对话区（固定高、内部滚动容器）的 aria-label。 */
  conversationAria: string;
  /** 产物预览弹窗的 overline 文案。 */
  artifactPreviewOverline: string;
  /** 连接 / 播放状态小标签。 */
  status: {
    live: string;
    /** 播放暂停在 interrupt 暂停点、等待用户提交。 */
    waiting: string;
    replay: string;
    completed: string;
  };
}

export const enUS: PlaygroundDict = {
  title: "Playground",
  description:
    "Pick a demo scenario and watch the full run timeline play out live — streaming text, tool calls, interrupts and artifacts, all reduced from the library's built-in event scripts.",
  scenarioLabel: "Scenario",
  scenarioSelectAria: "Demo scenario",
  replay: "Replay",
  conversationAria: "Demo conversation",
  artifactPreviewOverline: "Artifact preview",
  status: {
    live: "Live",
    waiting: "Waiting",
    replay: "Replay",
    completed: "Completed",
  },
};

export const zhCN: PlaygroundDict = {
  title: "演练场",
  description:
    "挑一条演示剧本，看完整 run 时间线实时播放 —— 流式正文、工具调用、人机交互与产物，全部由库内置事件脚本归约渲染。",
  scenarioLabel: "场景",
  scenarioSelectAria: "演示场景",
  replay: "重播",
  conversationAria: "演示对话",
  artifactPreviewOverline: "产物预览",
  status: {
    live: "实时",
    waiting: "等待输入",
    replay: "回放",
    completed: "已完成",
  },
};
