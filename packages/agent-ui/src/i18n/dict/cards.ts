/**
 * cards 域：交互卡片（interrupt 提问/计划、taskReview 复核、taskProgress 进度、
 * todo 清单、evidence 来源、artifact 产物、runError 错误、connection 连接浮条、
 * processGroup 过程组、compaction 压缩标记）的文案。
 *
 * 带 `{var}` 占位的模板由组件侧 interpolate() 填充。
 */
export interface CardsDict {
  interrupt: {
    /** 已答复卡的标签 / 无摘要时的兜底。 */
    answered: string;
    /** 已答复卡的答复区标签。 */
    yourAnswer: string;
    /** fields 为空时兜底 textarea 的 label。 */
    yourReply: string;
    expandPlan: string;
    collapsePlan: string;
    /** 只读冻结副本的说明。 */
    frozenNote: string;
    /** 澄清表单提交按钮。 */
    submit: string;
    cancel: string;
    /** 计划审批：批准按钮。 */
    approve: string;
    /** 计划审批：进入调整态按钮。 */
    revise: string;
    /** 计划审批：提交调整意见按钮。 */
    submitRevision: string;
    feedbackPlaceholder: string;
    /** 「其他…」自定义选项。 */
    otherOption: string;
    otherOptionDesc: string;
    customInputPlaceholder: string;
    /** e.g. "{label}：自定义回复"（自定义输入框 aria-label）。 */
    customReplyAriaLabel: string;
    /** 决议摘要（已答复卡）。 */
    decisionApprove: string;
    decisionRevise: string;
    /** e.g. "已要求调整：{feedback}" */
    decisionReviseWithFeedback: string;
    decisionReject: string;
    /** e.g. "已拒绝计划：{feedback}" */
    decisionRejectWithFeedback: string;
    /** 本地乐观标注缺 feedback 时的兜底（"已要求调整：见会话"）。 */
    seeConversation: string;
  };
  taskReview: {
    chooseNextStage: string;
    /** e.g. "批准后进入："（后接阶段 label）。 */
    advanceAfterApproval: string;
    approveContinue: string;
    /** e.g. "批准并进入{stage}"（aria-label）。 */
    approveAndEnter: string;
    reject: string;
    rejectAriaLabel: string;
    submitting: string;
    /** e.g. "已批准，下一阶段：{stage}" */
    approvedNextStage: string;
    approved: string;
    rejected: string;
    expired: string;
    settledHandled: string;
    settledSyncing: string;
  };
  taskProgress: {
    /** e.g. "{skill} 进度"（aria-label）。 */
    ariaLabel: string;
    /** e.g. "当前阶段："（后接阶段 label）。 */
    currentStage: string;
    awaitingReviewNote: string;
    status: {
      running: string;
      awaitingReview: string;
      advancing: string;
      completed: string;
      stopped: string;
    };
  };
  todo: {
    title: string;
    /** e.g. "已完成全部 {total} 项" */
    allDone: string;
    pending: string;
  };
  evidence: {
    /** e.g. "来源 · {count}" */
    sourcesHead: string;
    /** e.g. "展开其余 {count} 条" */
    expandRest: string;
    /** e.g. "{provider} · 来源 {index}"（hover 卡提供方行）。 */
    sourceLabel: string;
    viewOriginal: string;
  };
  artifact: {
    committed: string;
    draft: string;
  };
  runError: {
    title: string;
    note: string;
    retry: string;
  };
  connection: {
    failureFallback: string;
    retry: string;
    reload: string;
    recovering: string;
    reconnecting: string;
  };
  processGroup: {
    completed: string;
    /** e.g. "已完成 · {seconds} 秒" */
    completedWithDuration: string;
  };
  compaction: {
    compacting: string;
    compacted: string;
  };
}

export const enUS: CardsDict = {
  interrupt: {
    answered: "Answered",
    yourAnswer: "Your answer",
    yourReply: "Your reply",
    expandPlan: "Expand plan",
    collapsePlan: "Collapse plan",
    frozenNote: "This copy is frozen at the point where the turn waited for user input.",
    submit: "Submit and continue",
    cancel: "Cancel",
    approve: "Approve and continue",
    revise: "Revise plan",
    submitRevision: "Submit change requests",
    feedbackPlaceholder: "Describe how to adjust the plan… (⌘/Ctrl + Enter to submit)",
    otherOption: "Other…",
    otherOptionDesc: "Type a custom reply",
    customInputPlaceholder: "Type a custom reply…",
    customReplyAriaLabel: "{label}: custom reply",
    decisionApprove: "Plan approved, executing as planned",
    decisionRevise: "Changes requested for the plan",
    decisionReviseWithFeedback: "Changes requested: {feedback}",
    decisionReject: "Plan rejected, not executed",
    decisionRejectWithFeedback: "Plan rejected: {feedback}",
    seeConversation: "see conversation",
  },
  taskReview: {
    chooseNextStage: "Choose the next stage",
    advanceAfterApproval: "After approval: ",
    approveContinue: "Approve and continue",
    approveAndEnter: "Approve and enter {stage}",
    reject: "Send back",
    rejectAriaLabel: "Send back and stop the Skill",
    submitting: "Submitting review decision",
    approvedNextStage: "Approved, next stage: {stage}",
    approved: "Approved, advancing to the next stage.",
    rejected: "Sent back; the Skill will not advance.",
    expired: "Review expired; no further action possible.",
    settledHandled: "Review handled; the Skill has stopped.",
    settledSyncing: "Review handled by the server; syncing the latest stage.",
  },
  taskProgress: {
    ariaLabel: "{skill} progress",
    currentStage: "Current stage: ",
    awaitingReviewNote:
      "This run has finished, but the Skill is not complete yet; please complete the review below first.",
    status: {
      running: "Running",
      awaitingReview: "Waiting for your review",
      advancing: "Advancing to the next stage",
      completed: "Skill completed",
      stopped: "Skill stopped",
    },
  },
  todo: {
    title: "Task list",
    allDone: "All {total} items completed",
    pending: "Not started",
  },
  evidence: {
    sourcesHead: "Sources · {count}",
    expandRest: "Show {count} more",
    sourceLabel: "{provider} · Source {index}",
    viewOriginal: "View original",
  },
  artifact: {
    committed: "Saved",
    draft: "Draft",
  },
  runError: {
    title: "Run interrupted",
    note: "Generated content and file copies have been preserved.",
    retry: "Retry this run",
  },
  connection: {
    failureFallback: "Connection recovery failed; please reload the conversation.",
    retry: "Retry connection",
    reload: "Reload conversation",
    recovering: "Restoring output from the authoritative snapshot…",
    reconnecting: "Connection lost, reconnecting…",
  },
  processGroup: {
    completed: "Completed",
    completedWithDuration: "Completed · {seconds}s",
  },
  compaction: {
    compacting: "Compacting context",
    compacted: "Context compacted",
  },
};

export const zhCN: CardsDict = {
  interrupt: {
    answered: "已答复",
    yourAnswer: "你的答复",
    yourReply: "你的回复",
    expandPlan: "展开计划",
    collapsePlan: "收起计划",
    frozenNote: "此副本在该轮等待用户输入处已冻结。",
    submit: "提交并继续",
    cancel: "取消",
    approve: "批准并继续",
    revise: "调整计划",
    submitRevision: "提交调整意见",
    feedbackPlaceholder: "说明希望怎么调整这个计划…（⌘/Ctrl + Enter 提交）",
    otherOption: "其他…",
    otherOptionDesc: "输入自定义回复",
    customInputPlaceholder: "输入自定义回复…",
    customReplyAriaLabel: "{label}：自定义回复",
    decisionApprove: "已批准计划，按计划执行",
    decisionRevise: "已要求调整计划",
    decisionReviseWithFeedback: "已要求调整：{feedback}",
    decisionReject: "已拒绝计划，未执行",
    decisionRejectWithFeedback: "已拒绝计划：{feedback}",
    seeConversation: "见会话",
  },
  taskReview: {
    chooseNextStage: "选择下一阶段",
    advanceAfterApproval: "批准后进入：",
    approveContinue: "批准并继续",
    approveAndEnter: "批准并进入{stage}",
    reject: "退回",
    rejectAriaLabel: "退回并停止 Skill",
    submitting: "正在提交复核决定",
    approvedNextStage: "已批准，下一阶段：{stage}",
    approved: "已批准，正在进入下一阶段。",
    rejected: "已退回，Skill 不会继续推进。",
    expired: "复核已过期，无法继续处理。",
    settledHandled: "复核已处理，Skill 已停止。",
    settledSyncing: "复核已由服务端处理，正在同步最新阶段。",
  },
  taskProgress: {
    ariaLabel: "{skill} 进度",
    currentStage: "当前阶段：",
    awaitingReviewNote: "当前 Run 已结束，但整个 Skill 尚未完成；请先完成下方复核。",
    status: {
      running: "运行中",
      awaitingReview: "等待你的复核",
      advancing: "正在进入下一阶段",
      completed: "Skill 已完成",
      stopped: "Skill 已停止",
    },
  },
  todo: {
    title: "任务清单",
    allDone: "已完成全部 {total} 项",
    pending: "待开始",
  },
  evidence: {
    sourcesHead: "来源 · {count}",
    expandRest: "展开其余 {count} 条",
    sourceLabel: "{provider} · 来源 {index}",
    viewOriginal: "查看原文",
  },
  artifact: {
    committed: "已保存",
    draft: "草稿",
  },
  runError: {
    title: "本轮运行中断",
    note: "已生成的内容与文件副本均已保留。",
    retry: "重试本轮",
  },
  connection: {
    failureFallback: "连接恢复失败，请重新加载会话。",
    retry: "重试连接",
    reload: "重新加载会话",
    recovering: "正在从权威快照恢复输出…",
    reconnecting: "连接中断，正在重连…",
  },
  processGroup: {
    completed: "已完成",
    completedWithDuration: "已完成 · {seconds} 秒",
  },
  compaction: {
    compacting: "正在压缩上下文",
    compacted: "上下文已压缩",
  },
};
