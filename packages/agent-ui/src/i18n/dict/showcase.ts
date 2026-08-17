/**
 * showcase 域：组件展示页（/showcase）文案 —— 页面标题/描述、侧边栏导航项、
 * 各展示分节的标题与一句话描述、demo 变体标签与页内小组件文案。
 *
 * 归 app 壳层 agent 维护：接口与 en-US / zh-CN 两份值同构增补。
 * 注：demo 里展示的正文 / 附件名等演示数据内联双语（同 mocks/data.ts 约定），不进字典。
 */

/** 一个展示分节的文案。 */
export interface ShowcaseSectionCopy {
  /** 分节标题（组件名 + 简短定性，如 "TextBlock · 正文块"）。 */
  title: string;
  /** 一句话说明（该组件在 run 时间线里的职责与交互点）。 */
  description: string;
}

export interface ShowcaseDict {
  /** 页面标题（h1）。 */
  pageTitle: string;
  /** 页面简介（标题下一行）。 */
  pageDescription: string;
  /** 侧边栏账户区上方的导航项（跳 /showcase）。 */
  navItem: string;
  /** 页内锚点导航的 aria-label。 */
  tocAria: string;
  /** 各展示分节；键即页内锚点 id 与分节顺序的依据。 */
  sections: {
    text: ShowcaseSectionCopy;
    reasoning: ShowcaseSectionCopy;
    tool: ShowcaseSectionCopy;
    sandbox: ShowcaseSectionCopy;
    interrupt: ShowcaseSectionCopy;
    todo: ShowcaseSectionCopy;
    evidence: ShowcaseSectionCopy;
    artifact: ShowcaseSectionCopy;
    rich: ShowcaseSectionCopy;
    process: ShowcaseSectionCopy;
    userMessage: ShowcaseSectionCopy;
    status: ShowcaseSectionCopy;
    composer: ShowcaseSectionCopy;
  };
  /** demo 变体小标签（同节多状态并列展示时标注在 demo 框左上角）。 */
  variants: {
    streaming: string;
    thinking: string;
    done: string;
    running: string;
    completed: string;
    failed: string;
    interactive: string;
    resolved: string;
    preparing: string;
    collecting: string;
    reconnecting: string;
    recoveryFailed: string;
  };
  /** Composer demo 提交后的回显（interpolate：{text} = 提交的文本）。 */
  composerEcho: string;
  /** ArtifactCard demo 预览模态的 overline。 */
  artifactPreviewOverline: string;
}

export const enUS: ShowcaseDict = {
  pageTitle: "Component showcase",
  pageDescription:
    "A hands-on tour of the @diribo/agent-ui run-timeline components. Every demo renders real view states reduced from the library's built-in demo scenarios (buildScenarios), and is fully interactive.",
  navItem: "Components",
  tocAria: "Component sections",
  sections: {
    text: {
      title: "TextBlock · Body text",
      description:
        "The run's body output: streams in with a typewriter while live and settles when done; markdown and [n] citation markers render inline.",
    },
    reasoning: {
      title: "ReasoningBlock · Reasoning",
      description:
        "The safe projection of reasoning: a shimmering status line while thinking; once done it folds into a row that expands to the reasoning text.",
    },
    tool: {
      title: "ToolCallBlock · Tool calls",
      description:
        "Lifecycle of search / file / execute tool calls: spinner while running, result summary when completed, and the cause when failed.",
    },
    sandbox: {
      title: "SandboxBlock · Sandbox run",
      description:
        "The safe public projection of sandbox execution: staged progress with percent, a success summary, and stable failure codes.",
    },
    interrupt: {
      title: "InterruptCard · Human-in-the-loop",
      description:
        "Clarification and plan-approval cards. The forms really submit: on submit the scenario's remaining events replay into the store and the card flips to resolved.",
    },
    todo: {
      title: "TodoPanel · Task list",
      description:
        "The agent-maintained whole-list snapshot: collapsed to a one-line progress summary, expandable to the full list; fades away once everything is done.",
    },
    evidence: {
      title: "EvidenceMarker & EvidenceList · Citations",
      description:
        "Hover a [n] marker for a source preview; the run footer lists all sources and folds everything beyond the first two.",
    },
    artifact: {
      title: "ArtifactCard · Artifacts",
      description:
        "File cards produced by the run (draft / committed); click to open the centered workbench with a markdown preview.",
    },
    rich: {
      title: "RichBlock · Rich fences",
      description:
        "Chart / mermaid / svg / html fence cards inside the body text, taken from the richviz demo scenario; each supports source view and centered expansion.",
    },
    process: {
      title: "ProcessGroup · Process fold",
      description:
        "After a run completes, the intermediate steps fold into a one-line summary with duration; click to expand and review them step by step.",
    },
    userMessage: {
      title: "UserMessage · User message",
      description:
        "The user prompt bubble: attachment file cards, copy, and inline editing (⌘/Ctrl+Enter to submit, Esc to cancel).",
    },
    status: {
      title: "RunErrorCard & ConnectionBanner · Error & connection",
      description:
        "The run-failure error card (retryable) and the non-intrusive connection banner (reconnecting / recovery failed).",
    },
    composer: {
      title: "Composer · Input",
      description:
        "The Tiptap rich-text composer: Enter to send, Shift+Enter for a newline; the submitted text echoes below.",
    },
  },
  variants: {
    streaming: "Streaming",
    thinking: "Thinking",
    done: "Done (expandable)",
    running: "Running",
    completed: "Completed",
    failed: "Failed",
    interactive: "Interactive",
    resolved: "Resolved",
    preparing: "Preparing",
    collecting: "Collecting outputs",
    reconnecting: "Reconnecting",
    recoveryFailed: "Recovery failed",
  },
  composerEcho: "Submitted: {text}",
  artifactPreviewOverline: "Artifact preview",
};

export const zhCN: ShowcaseDict = {
  pageTitle: "组件展示",
  pageDescription:
    "逐个展示 @diribo/agent-ui 的 run 时间线组件：demo 数据由库内演示剧本（buildScenarios）归约成真实视图状态渲染，全部可交互。",
  navItem: "组件",
  tocAria: "组件分节导航",
  sections: {
    text: {
      title: "TextBlock · 正文块",
      description: "run 的正文输出：live 时打字机逐字推进、完成后定格；markdown 与 [n] 引用角标内联渲染。",
    },
    reasoning: {
      title: "ReasoningBlock · 推理块",
      description: "推理过程的安全投影：思考中为微光状态行，完成后收成一行，可展开查看推理原文。",
    },
    tool: {
      title: "ToolCallBlock · 工具调用",
      description: "检索 / 读写 / 执行等工具调用的生命周期：运行中转圈、完成给结果摘要、失败带原因。",
    },
    sandbox: {
      title: "SandboxBlock · 沙箱运行",
      description: "沙箱执行的安全公共投影：分阶段进度与百分比、成功摘要、稳定失败码。",
    },
    interrupt: {
      title: "InterruptCard · 人机交互卡",
      description: "澄清提问与计划审批：表单可真实提交 —— 提交后把场景剩余事件续播进 store，卡片随即转为已答复。",
    },
    todo: {
      title: "TodoPanel · 任务清单",
      description: "agent 维护的整单快照：收起为一行进度摘要，展开看全单；全部完成后自动收起淡出。",
    },
    evidence: {
      title: "EvidenceMarker & EvidenceList · 来源引用",
      description: "正文 [n] 角标悬停出来源预览；run 末尾汇总全部来源，两条之外折叠收起。",
    },
    artifact: {
      title: "ArtifactCard · 产物卡",
      description: "run 产出的文件卡片（草稿 / 已定稿），点击在中央工作台打开 markdown 预览。",
    },
    rich: {
      title: "RichBlock · 富内容围栏",
      description: "正文内的 chart / mermaid / svg / html 四种围栏卡（取自 richviz 演示场景），每张可切源码、居中展开。",
    },
    process: {
      title: "ProcessGroup · 过程折叠",
      description: "run 完成后把中间过程收进一行摘要（含耗时），点击展开逐步回看。",
    },
    userMessage: {
      title: "UserMessage · 用户消息",
      description: "用户提问气泡：附件文件卡、复制与行内编辑（⌘/Ctrl+Enter 提交，Esc 取消）。",
    },
    status: {
      title: "RunErrorCard & ConnectionBanner · 错误与连接",
      description: "运行失败错误卡（可重试重演）与非侵入式连接状态浮条（重连中 / 恢复失败）。",
    },
    composer: {
      title: "Composer · 输入框",
      description: "Tiptap 富文本输入框：Enter 发送、Shift+Enter 换行；提交内容回显在下方。",
    },
  },
  variants: {
    streaming: "流式",
    thinking: "思考中",
    done: "已完成（可展开）",
    running: "运行中",
    completed: "已完成",
    failed: "失败",
    interactive: "可交互",
    resolved: "已答复",
    preparing: "准备环境",
    collecting: "收集产物",
    reconnecting: "重连中",
    recoveryFailed: "恢复失败",
  },
  composerEcho: "已提交：{text}",
  artifactPreviewOverline: "产物预览",
};
