/**
 * composer 域：输入框（Composer/ThreadComposer）的文案 —— 斜杠菜单、附件 chip、
 * 思考强度档位、发送/停止主按钮、排队消息，以及本地 Skill 目录。
 *
 * 语音输入（ASR）在本次复刻中被砍掉，本域不含语音相关文案。
 * `skills` 是双语 mock 数据目录：composerConfig.ts 的本地常量配置经 useLocale
 * 从本字典读取，因此改目录只需改这里（接口与 en-US / zh-CN 两份值保持同构）。
 */
export interface ComposerDict {
  /** 编辑器 aria-label（role="textbox"）。 */
  editorAria: string;
  /** 首页等未显式传 placeholder 时的默认占位。 */
  defaultPlaceholder: string;
  /** 「+」按钮 aria-label。 */
  addContextAria: string;
  /** "/" 斜杠菜单。 */
  slash: {
    listboxAria: string;
    /** 底部快捷键提示：↑↓ 选择。 */
    footSelect: string;
    /** 底部快捷键提示：↵ 确认。 */
    footConfirm: string;
    /** 底部快捷键提示：esc 关闭。 */
    footClose: string;
    /** 命令项「上传附件」。 */
    attachName: string;
    attachDescription: string;
  };
  /** 附件 chip 的状态读数与操作 aria。 */
  attachments: {
    /** chip 列表容器 aria-label。 */
    chipsAria: string;
    /** 无扩展名文件的类型标签兜底。 */
    fileTypeFallback: string;
    statusLocal: string;
    statusUploading: string;
    statusProcessing: string;
    statusFailed: string;
    statusCancelled: string;
    /** 取消上传后 chip 的 error 文案（attachmentState 的 cancelled 态由 Composer 注入本句）。 */
    cancelledNotice: string;
    /** e.g. "重试上传 {name}" */
    retryAria: string;
    /** e.g. "取消上传 {name}" */
    cancelAria: string;
    /** e.g. "移除附件 {name}" */
    removeAria: string;
    /** 超出单次选择上限的提示。 */
    limitNotice: string;
  };
  /** 「+」下拉菜单。 */
  menu: {
    attach: string;
    selectSkill: string;
    skillLoading: string;
    skillUnavailable: string;
    skillEmpty: string;
  };
  /** 思考强度档位（label 是表现层职责；config 只携带 id）。 */
  effort: {
    /** 下拉标题「思考强度」。 */
    label: string;
    /** 触发按钮 aria，e.g. "思考强度：{label}" */
    aria: string;
    /** 档位 id → 展示名；未知 id 回退 id 本身（composerConfig 处理）。 */
    levels: {
      low: string;
      medium: string;
      high: string;
      max: string;
    };
  };
  /** 发送按钮 aria。 */
  sendAria: string;
  /** busy 时发送按钮 aria（消息入队）。 */
  enqueueAria: string;
  /** busy 时发送按钮 title（解释排队语义）。 */
  enqueueTitle: string;
  /** 停止按钮 aria。 */
  stopAria: string;
  /** 提交前校验与上传失败的通知（composer-notice）。 */
  notices: {
    waitAttachments: string;
    attachmentsUnavailable: string;
    tempExpired: string;
    uploadIncomplete: string;
    uploadFailed: string;
  };
  /** 首页案例列表容器 aria-label。 */
  casesAria: string;
  /** Skill chip（编辑器 inline 节点视图）。 */
  skillChip: {
    /** 节点缺 id/label 时的兜底名。 */
    unknown: string;
    /** e.g. "移除 Skill {label}" */
    removeAria: string;
  };
  /** 本地 Skill 目录（双语 mock 配置；composerConfig 经 useLocale 读取）。 */
  skills: { id: string; label: string; description: string }[];
  /** ThreadComposer：排队消息列表 + 随运行状态切换的占位。 */
  thread: {
    queueAria: string;
    /** 队列摘要退化到 Skill 名，e.g. "Skill：{label}" */
    skillSummary: string;
    /** 队列摘要全空时的兜底。 */
    emptyMessage: string;
    /** e.g. "撤回排队消息：{summary}" */
    retractAria: string;
    placeholderAwaitingReview: string;
    placeholderWaitingUser: string;
    placeholderRunning: string;
    placeholderIdle: string;
  };
}

export const enUS: ComposerDict = {
  editorAria: "Type a message",
  defaultPlaceholder: "Describe your engineering task…",
  addContextAria: "Add context",
  slash: {
    listboxAria: "Select a Skill or command",
    footSelect: "Select",
    footConfirm: "Confirm",
    footClose: "Close",
    attachName: "Upload attachment",
    attachDescription: "Choose local files to upload as attachments",
  },
  attachments: {
    chipsAria: "Selected context",
    fileTypeFallback: "File",
    statusLocal: "Pending",
    statusUploading: "Uploading",
    statusProcessing: "Processing",
    statusFailed: "Unavailable",
    statusCancelled: "Cancelled",
    cancelledNotice: "Upload cancelled",
    retryAria: "Retry uploading {name}",
    cancelAria: "Cancel uploading {name}",
    removeAria: "Remove attachment {name}",
    limitNotice: "You can select at most 32 input files at a time.",
  },
  menu: {
    attach: "Upload attachment",
    selectSkill: "Select Skill",
    skillLoading: "Loading Skill directory…",
    skillUnavailable: "Skill directory unavailable",
    skillEmpty: "No online executable Skills",
  },
  effort: {
    label: "Thinking effort",
    aria: "Thinking effort: {label}",
    levels: {
      low: "Low",
      medium: "Medium",
      high: "High",
      max: "Max",
    },
  },
  sendAria: "Send",
  enqueueAria: "Add to queue",
  enqueueTitle: "A task is in progress; your message will be queued",
  stopAria: "Stop",
  notices: {
    waitAttachments: "Please wait for all attachments to finish uploading, or handle the failed ones before sending.",
    attachmentsUnavailable: "Some attachments are no longer available. Remove or re-upload them before sending.",
    tempExpired: "The temporary attachment was cancelled or expired. Please choose it again",
    uploadIncomplete: "Attachment upload has not completed",
    uploadFailed: "Upload failed. Please try again",
  },
  casesAria: "Engineering task examples",
  skillChip: {
    unknown: "Unknown Skill",
    removeAria: "Remove Skill {label}",
  },
  skills: [
    { id: "sensor-selection", label: "Sensor Selection", description: "Recommend suitable sensors by scenario and parameters." },
    { id: "engineering-plan", label: "Requirements to Engineering Plan", description: "Turn a scenario description into an actionable engineering plan." },
    { id: "processing-bridge-monitoring-data", label: "Bridge Monitoring Data Analysis", description: "Read data, check quality, run analysis, and produce a report." },
    { id: "processing-bridge-field-inspection-evidence", label: "Bridge Field Inspection", description: "Go on site with questions, take photos and measurements, and report evidence." },
  ],
  thread: {
    queueAria: "Queued messages",
    skillSummary: "Skill: {label}",
    emptyMessage: "(Empty message)",
    retractAria: "Retract queued message: {summary}",
    placeholderAwaitingReview: "Please complete the review above first; new messages will be sent after the Skill finishes…",
    placeholderWaitingUser: "You can keep typing; your message will be queued and sent after this turn…",
    placeholderRunning: "Keep typing — your message will be queued and sent automatically after this turn…",
    placeholderIdle: "Ask a follow-up…",
  },
};

export const zhCN: ComposerDict = {
  editorAria: "输入消息",
  defaultPlaceholder: "描述你的工程任务……",
  addContextAria: "添加上下文",
  slash: {
    listboxAria: "选择 Skill 或命令",
    footSelect: "选择",
    footConfirm: "确认",
    footClose: "关闭",
    attachName: "上传附件",
    attachDescription: "选择本地文件作为附件上传",
  },
  attachments: {
    chipsAria: "已选上下文",
    fileTypeFallback: "文件",
    statusLocal: "准备上传",
    statusUploading: "上传中",
    statusProcessing: "处理中",
    statusFailed: "不可用",
    statusCancelled: "已取消",
    cancelledNotice: "上传已取消",
    retryAria: "重试上传 {name}",
    cancelAria: "取消上传 {name}",
    removeAria: "移除附件 {name}",
    limitNotice: "单次最多选择 32 个输入文件。",
  },
  menu: {
    attach: "上传附件",
    selectSkill: "选择 Skill",
    skillLoading: "正在加载 Skill 目录…",
    skillUnavailable: "Skill 目录暂不可用",
    skillEmpty: "当前没有在线可执行的 Skill",
  },
  effort: {
    label: "思考强度",
    aria: "思考强度：{label}",
    levels: {
      low: "低",
      medium: "中",
      high: "高",
      max: "极高",
    },
  },
  sendAria: "发送",
  enqueueAria: "加入队列",
  enqueueTitle: "当前任务进行中，消息将排队发送",
  stopAria: "停止",
  notices: {
    waitAttachments: "请等待所有附件上传完成，或处理失败项后再发送。",
    attachmentsUnavailable: "有附件已不可用，请移除或重新上传后再发送。",
    tempExpired: "临时附件已取消或过期，请重新选择",
    uploadIncomplete: "附件尚未完成上传",
    uploadFailed: "上传失败，请重试",
  },
  casesAria: "工程任务案例",
  skillChip: {
    unknown: "未知 Skill",
    removeAria: "移除 Skill {label}",
  },
  skills: [
    { id: "sensor-selection", label: "传感器选型", description: "按场景和参数，推荐合适传感器。" },
    { id: "engineering-plan", label: "需求转工程方案", description: "根据场景描述，出可落地工程方案。" },
    { id: "processing-bridge-monitoring-data", label: "桥梁监测数据分析", description: "读数据，查质量、做分析、出报告。" },
    { id: "processing-bridge-field-inspection-evidence", label: "桥梁现场巡检验证", description: "带问题去现场，拍照测量、回传证据。" },
  ],
  thread: {
    queueAria: "排队中的消息",
    skillSummary: "Skill：{label}",
    emptyMessage: "（空消息）",
    retractAria: "撤回排队消息：{summary}",
    placeholderAwaitingReview: "请先完成上方复核；新消息会在 Skill 结束后发送……",
    placeholderWaitingUser: "可继续输入，将在本轮结束后排队发送……",
    placeholderRunning: "继续输入，消息会排队，本轮结束后自动发送……",
    placeholderIdle: "继续提问……",
  },
};
