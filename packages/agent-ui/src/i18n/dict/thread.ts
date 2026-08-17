/**
 * thread 域：线程容器组（RunThread / ThreadNav / UserMessage / AgentActions /
 * SubagentPanel / ArtifactPanel / ImageLightbox / ConversationArtifactsMenu /
 * RightPanel 外壳）的文案。
 *
 * 通用动作（复制 / 取消 / 关闭 / 下载 / 展开等）复用 common 域；工具与产物状态
 * （运行中 / 草稿 / 已定稿…）复用 blocks 域；本域只收容器与面板特有的文案。
 * `{placeholder}` 由 interpolate 填充。
 */
export interface ThreadDict {
  /** 「回到底部」悬浮按钮的 aria-label。 */
  jumpToBottom: string;
  /** 会话右缘轮次导航（ThreadNav）。 */
  nav: {
    ariaLabel: string;
    /** 该轮用户消息无文字时的菜单占位。 */
    emptyText: string;
    /** 刻度 aria-label，e.g. "跳到第 {n} 轮提问"。 */
    jumpToTurn: string;
  };
  /** 用户消息气泡（UserMessage）。 */
  userMessage: {
    /** Skill 徽标区的 aria-label。 */
    skillRegionAria: string;
    /** 图片缩略图按钮 aria-label，e.g. "查看图片 {name}"。 */
    viewImage: string;
    /** 编辑按钮与编辑态 textarea 的 aria-label。 */
    editAria: string;
    /** 编辑态提交按钮。 */
    send: string;
    copyAria: string;
  };
  /** 轮次末尾操作行（AgentActions）。 */
  agentActions: {
    copyAria: string;
    retryAria: string;
    branch: string;
    branchAria: string;
  };
  /** 子 agent 详情面板（SubagentPanel）。 */
  subagentPanel: {
    close: string;
    /** 头部副标题（无模型名时）。 */
    subtitle: string;
    /** 头部副标题（带模型名），e.g. "委托子任务 · {model}"。 */
    subtitleWithModel: string;
    /** e.g. "{count} 个步骤"。 */
    stepCount: string;
    /** e.g. "耗时 {seconds} 秒"。 */
    duration: string;
    taskTitle: string;
    processTitle: string;
    resultTitle: string;
    /** 运行中且无内部步骤。 */
    emptyRunning: string;
    /** 已结束且无内部步骤。 */
    emptySettled: string;
    citationsAria: string;
    citationsTitle: string;
  };
  /** 产物预览面板（ArtifactPanel，裁剪版：列表 + 文本预览）。 */
  artifactPanel: {
    close: string;
    /** 头部副标题（产物来源位置）。 */
    location: string;
    listTitle: string;
    previewTitle: string;
    /** 定稿产物无内联预览时的说明（blob 预览已随 FileWorkspace 一起裁剪）。 */
    noInlinePreview: string;
    /** 产物类型标签（kindLabel 的取值）。 */
    kinds: {
      sheet: string;
      document: string;
      pdf: string;
      file: string;
    };
  };
  /** 图片灯箱（ImageLightbox）。 */
  lightbox: {
    ariaLabel: string;
    prev: string;
    next: string;
  };
  /** 会话级产物下拉菜单（ConversationArtifactsMenu）。 */
  artifactsMenu: {
    /** 触发按钮文案（无产物时单独显示，有产物后拼 " {count}"）。 */
    label: string;
    emptyTitle: string;
    menuLabel: string;
    /** 条目元信息里的轮次序号，e.g. "第 {n} 轮"。 */
    turnIndex: string;
    /** 行内下载按钮 aria-label，e.g. "下载 {name}"。 */
    download: string;
  };
  /** 右侧面板通用外壳（RightPanel）。 */
  rightPanel: {
    resizeAria: string;
  };
}

export const enUS: ThreadDict = {
  jumpToBottom: "Back to bottom",
  nav: {
    ariaLabel: "Conversation turns",
    emptyText: "(no text)",
    jumpToTurn: "Jump to turn {n}",
  },
  userMessage: {
    skillRegionAria: "Skill bound to this turn",
    viewImage: "View image {name}",
    editAria: "Edit message",
    send: "Send",
    copyAria: "Copy message",
  },
  agentActions: {
    copyAria: "Copy reply",
    retryAria: "Retry this turn",
    branch: "Branch",
    branchAria: "Branch a new conversation from this turn",
  },
  subagentPanel: {
    close: "Close subagent details",
    subtitle: "Delegated subtask",
    subtitleWithModel: "Delegated subtask · {model}",
    stepCount: "{count} steps",
    duration: "Took {seconds}s",
    taskTitle: "Task",
    processTitle: "Execution",
    resultTitle: "Conclusion",
    emptyRunning: "The subagent is starting; no steps yet…",
    emptySettled: "No internal steps were recorded for this run.",
    citationsAria: "Subagent sources",
    citationsTitle: "Contributing sources",
  },
  artifactPanel: {
    close: "Close artifact preview",
    location: "Conversation / Agent artifact",
    listTitle: "Artifacts",
    previewTitle: "Content preview",
    noInlinePreview: "This artifact has no inline preview; download it to view.",
    kinds: {
      sheet: "Sheet",
      document: "Document",
      pdf: "PDF",
      file: "File",
    },
  },
  lightbox: {
    ariaLabel: "Image preview",
    prev: "Previous",
    next: "Next",
  },
  artifactsMenu: {
    label: "Artifacts",
    emptyTitle: "No artifacts in this conversation yet",
    menuLabel: "Artifacts in this conversation",
    turnIndex: "Turn {n}",
    download: "Download {name}",
  },
  rightPanel: {
    resizeAria: "Drag to resize the right panel",
  },
};

export const zhCN: ThreadDict = {
  jumpToBottom: "回到底部",
  nav: {
    ariaLabel: "会话轮次导航",
    emptyText: "（无文字）",
    jumpToTurn: "跳到第 {n} 轮提问",
  },
  userMessage: {
    skillRegionAria: "本轮绑定的 Skill",
    viewImage: "查看图片 {name}",
    editAria: "编辑消息",
    send: "发送",
    copyAria: "复制消息",
  },
  agentActions: {
    copyAria: "复制回复",
    retryAria: "重试本轮",
    branch: "分支",
    branchAria: "从本轮分支出新会话",
  },
  subagentPanel: {
    close: "关闭子 Agent 详情",
    subtitle: "委托子任务",
    subtitleWithModel: "委托子任务 · {model}",
    stepCount: "{count} 个步骤",
    duration: "耗时 {seconds} 秒",
    taskTitle: "任务",
    processTitle: "执行过程",
    resultTitle: "结论",
    emptyRunning: "子 Agent 正在启动，尚未产生执行步骤…",
    emptySettled: "本次执行没有记录内部步骤。",
    citationsAria: "子 Agent 引用来源",
    citationsTitle: "贡献的来源",
  },
  artifactPanel: {
    close: "关闭产物预览",
    location: "会话 / Agent 产物",
    listTitle: "产物列表",
    previewTitle: "内容预览",
    noInlinePreview: "该产物没有内联预览，可下载后查看。",
    kinds: {
      sheet: "表格",
      document: "文档",
      pdf: "PDF",
      file: "文件",
    },
  },
  lightbox: {
    ariaLabel: "图片预览",
    prev: "上一张",
    next: "下一张",
  },
  artifactsMenu: {
    label: "产物",
    emptyTitle: "本会话还没有产物",
    menuLabel: "本会话产物",
    turnIndex: "第 {n} 轮",
    download: "下载 {name}",
  },
  rightPanel: {
    resizeAria: "拖动调整右侧面板宽度",
  },
};
