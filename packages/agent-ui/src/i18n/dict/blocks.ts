/**
 * blocks 域：时间线块组件（tool / toolCall / exec / reasoning / evidence /
 * artifact / sandbox / browser / subagent / rich / chart / mermaid）的文案。
 *
 * `tool` 节的形状由 protocol/events.ts 的 ToolCopy 定义 —— reducer 与
 * toolDisplayName / formatToolRunningLabel 直接消费它；字典接口允许后续
 * 移植 agent 增补字段（先建预见字段，缺什么加什么）。
 */

import type { RunStatus } from "../../protocol/entities.js";
import type { SandboxFailureCode, ToolCopy } from "../../protocol/events.js";

export interface BlocksDict {
  /** 工具展示名映射 + 各 ToolKind 进行态文案（ToolCopy）。 */
  tool: ToolCopy;
  toolStatus: {
    running: string;
    completed: string;
    failed: string;
    stopped: string;
    retrying: string;
  };
  /** ToolCallBlock（工具行）文案。 */
  toolCall: {
    /** e.g. "{title}失败：{message}" */
    failedWithMessage: string;
    /** 失败且 wire 未携带错误时的兜底一句。 */
    genericError: string;
    /** 失败行尾部：仍在重试。 */
    retryingNote: string;
    /** 失败行尾部：已停止重试。 */
    stoppedRetryNote: string;
    /** e.g. "{title}完成"（无 resultPreview 时的兜底） */
    completedLabel: string;
    /** e.g. "完整结果按需加载 · {ref}" */
    detailRefNote: string;
  };
  /** ExecToolBlock（toolKind = execute 的终端卡）文案。 */
  exec: {
    /** 命令行右侧的进行中徽标。 */
    runningBadge: string;
    /** e.g. "正在运行「{title}」…"（无命令/输出源时的退化运行行） */
    runningLabel: string;
    /** 失败且 wire 未携带错误时的兜底一句。 */
    genericError: string;
    /** e.g. "已运行「{title}」"（无 resultPreview 时的兜底） */
    completedLabel: string;
    /** e.g. "完整输出按需加载 · {ref}" */
    outputRefNote: string;
    /** e.g. "exit {code}"（shell 退出码徽标，终端惯例两语言同形） */
    exitChip: string;
  };
  reasoning: {
    thinking: string;
    done: string;
    /** e.g. "已思考 {seconds} 秒" */
    doneWithDuration: string;
    unfinished: string;
  };
  evidence: {
    title: string;
    /** e.g. "检索于 {time}" */
    retrievedAt: string;
  };
  artifact: {
    draft: string;
    committed: string;
    download: string;
    truncated: string;
  };
  sandbox: {
    title: string;
    stages: {
      preparing: string;
      running: string;
      collectingOutputs: string;
    };
    /** 稳定失败码 → 用户可读一句。 */
    failures: Record<SandboxFailureCode, string>;
    /** e.g. "退出码 {code}" */
    exitCode: string;
    /** e.g. "耗时 {seconds} 秒" */
    duration: string;
    /** e.g. "{count} 个输出" */
    outputs: string;
    /** e.g. "沙箱执行失败：{detail}"（detail 取 failures 或 failedFallback） */
    failedWithDetail: string;
    /** 无稳定失败码时的兜底一句。 */
    failedFallback: string;
    /** 完成标题，e.g. "沙箱执行成功"。 */
    succeeded: string;
    /** 退出码为 0 的附注，e.g. "成功退出"。 */
    exitOkNote: string;
    /** e.g. "{ms} 毫秒"（不足 1 秒） */
    durationMs: string;
    /** e.g. "{seconds} 秒" */
    durationSeconds: string;
    /** e.g. "{count} 个安全输出" */
    safeOutputs: string;
  };
  /** BrowserBlock 文案（二期前向兼容块，reducer 暂无生产者）。 */
  browser: {
    /** e.g. "浏览器操作失败：{message}" */
    failedWithMessage: string;
    /** 失败且 wire 未携带错误时的兜底一句。 */
    genericError: string;
    /** 失败行尾部：仍在重试。 */
    retryingNote: string;
    /** 失败行尾部：已停止。 */
    stoppedNote: string;
    /** e.g. "访问 {count} 个页面 · "（完成摘要的页面数前缀，无页面时置空） */
    pagesPrefix: string;
    /** e.g. "浏览器操作 · {pages}{steps} 步"（pages 为 pagesPrefix 或空串） */
    completedLabel: string;
    /** 实时窗口右上角徽标。 */
    liveBadge: string;
    /** 模拟页面搜索框的占位文本。 */
    searchPlaceholder: string;
  };
  /** SubagentBlock 文案（三期前向兼容块，reducer 暂无生产者）。 */
  subagent: {
    /** running 且无 statusText 时的兜底。 */
    runningLabel: string;
    /** 失败且 wire 未携带错误时的兜底一句。 */
    genericError: string;
    /** 失败摘要尾部：仍在重试。 */
    retryingNote: string;
    /** e.g. "{count} 个步骤" */
    stepsPart: string;
    /** e.g. "{seconds} 秒" */
    secondsPart: string;
    /** 完成且无步骤/耗时时的兜底。 */
    completedFallback: string;
    /** e.g. "查看子 Agent「{title}」详情"（按钮 aria-label） */
    ariaLabel: string;
  };
  rich: {
    interactive: string;
    sandboxNote: string;
    expand: string;
    /** 视图切换分段控件的 aria-label（chart / mermaid / rich 卡共用）。 */
    viewSwitch: string;
    /** Seg 选项：渲染态。 */
    render: string;
    /** Seg 选项：源码态。 */
    source: string;
    /** 复制源码按钮 title，兼作 CodeView 复制按钮的 aria-label。 */
    copySource: string;
    /** CodeView 复制成功态的 aria-label。 */
    sourceCopied: string;
    /** 居中模态的复制动作按钮（带 ⧉ 符号）。 */
    modalCopySource: string;
    svgOverline: string;
    svgTitle: string;
    svgFoot: string;
    /** html 沙箱 iframe 的无障碍 title。 */
    iframeTitle: string;
    /** SVG 未通过安全校验的降级提示。 */
    svgInvalid: string;
  };
  chart: {
    title: string;
    legend: string;
    downloadCsv: string;
    copyCsv: string;
    copiedCsv: string;
    /** Seg 选项：图表 / 表格 / 源码三态。 */
    viewChart: string;
    viewTable: string;
    viewCode: string;
    /** 堆叠图 tooltip 的合计行名。 */
    total: string;
    /** 表格视图 caption，e.g. "{title} · 与图表同源数据"。 */
    tableCaption: string;
    /** 带单位变体，e.g. "{title}（{unit}） · 与图表同源数据"。 */
    tableCaptionWithUnit: string;
    /** 表格首列表头（亦作导出 CSV 的首列表头）。 */
    seriesColumn: string;
    /** 脚注来源，e.g. "来源：{source}"。 */
    sourceFrom: string;
    /** 脚注无来源时的占位。 */
    sampleData: string;
    /** SVG 图的无障碍说明，e.g. "{title}。可用左右方向键逐点读数，或切换到表格视图。" */
    ariaChart: string;
    /** 渲染失败提示，e.g. "图表无法渲染：{error}"。 */
    renderFailed: string;
    /** spec 解析失败原因（parseChartSpec 的 reason 机器码 → 用户可读一句）。 */
    parseErrors: {
      /** JSON 语法错误，e.g. "JSON 解析失败：{detail}"。 */
      invalidJson: string;
      /** spec 不是 JSON 对象。 */
      notObject: string;
      /** 缺 x 轴数据（x: string[]）。 */
      missingX: string;
      /** 缺 series 数据数组。 */
      missingSeries: string;
      /** series 项缺 name(string) / data(number[])。 */
      invalidSeries: string;
    };
  };
  mermaid: {
    title: string;
    render: string;
    source: string;
    copySource: string;
    copiedSource: string;
    localRendererNote: string;
    /** 居中模态的复制动作按钮（带 ⧉ 符号）。 */
    modalCopySource: string;
    /** 解析失败降级提示。 */
    renderFailed: string;
  };
  /** RunStatusTag 的实体侧运行状态文案（shared/Tags 组件）。 */
  runStatus: Record<RunStatus, string>;
  /** VisibilityTag 的可见范围文案；members 支持 "{count}" 插值。 */
  visibility: {
    private: string;
    project: string;
    members: string;
  };
}

export const enUS: BlocksDict = {
  tool: {
    displayNames: {
      "web.search": "Web search",
      "file.read": "Read file",
      "file.write": "Write file",
      "code.execute": "Run program",
    },
    knowledgeDisplayName: "Knowledge base search",
    runningText: {
      search: { prefix: "Searching", verbatim: "Searching the web" },
      knowledge: { prefix: "Searching knowledge base", verbatim: "Searching knowledge base" },
      file_read: { prefix: "Reading", verbatim: "Reading file" },
      file_write: { prefix: "Writing", verbatim: "Writing file" },
      execute: { prefix: "Running", verbatim: "Running program" },
      skill: { prefix: "Running", verbatim: "Running skill" },
      generic: { prefix: "Running", verbatim: "Running tool" },
    },
  },
  toolStatus: {
    running: "Running",
    completed: "Completed",
    failed: "Failed",
    stopped: "Stopped",
    retrying: "Retrying",
  },
  toolCall: {
    failedWithMessage: "{title} failed: {message}",
    genericError: "Tool call error",
    retryingNote: "Retrying via another route",
    stoppedRetryNote: "Stopped retrying",
    completedLabel: "{title} completed",
    detailRefNote: "Full result loaded on demand · {ref}",
  },
  exec: {
    runningBadge: "Running",
    runningLabel: "Running “{title}”…",
    genericError: "Program run error",
    completedLabel: "Ran “{title}”",
    outputRefNote: "Full output loaded on demand · {ref}",
    exitChip: "exit {code}",
  },
  reasoning: {
    thinking: "Thinking",
    done: "Reasoning completed",
    doneWithDuration: "Thought for {seconds}s",
    unfinished: "Reasoning unfinished",
  },
  evidence: {
    title: "Sources",
    retrievedAt: "Retrieved at {time}",
  },
  artifact: {
    draft: "Draft",
    committed: "Committed",
    download: "Download",
    truncated: "Content truncated",
  },
  sandbox: {
    title: "Sandbox execution",
    stages: {
      preparing: "Preparing secure execution environment…",
      running: "Running sandbox task…",
      collectingOutputs: "Collecting secure outputs…",
    },
    failures: {
      cancelled: "Execution cancelled",
      deadline_exceeded: "Execution timed out",
      tool_error: "Program did not complete successfully",
      artifact_error: "Output artifacts could not be produced",
      budget_exceeded: "Run resource limit reached",
      dependency_unavailable: "Execution service temporarily unavailable",
    },
    exitCode: "Exit code {code}",
    duration: "Took {seconds}s",
    outputs: "{count} outputs",
    failedWithDetail: "Sandbox execution failed: {detail}",
    failedFallback: "Sandbox execution unfinished",
    succeeded: "Sandbox execution succeeded",
    exitOkNote: "Exited successfully",
    durationMs: "{ms} ms",
    durationSeconds: "{seconds}s",
    safeOutputs: "{count} secure outputs",
  },
  browser: {
    failedWithMessage: "Browser operation failed: {message}",
    genericError: "Automation interrupted",
    retryingNote: "Retrying",
    stoppedNote: "Stopped",
    pagesPrefix: "Visited {count} pages · ",
    completedLabel: "Browser automation · {pages}{steps} steps",
    liveBadge: "Automating",
    searchPlaceholder: "Search this site…",
  },
  subagent: {
    runningLabel: "Running subtask…",
    genericError: "Execution failed",
    retryingNote: "Retrying",
    stepsPart: "{count} steps",
    secondsPart: "{seconds}s",
    completedFallback: "Completed",
    ariaLabel: "View sub-agent “{title}” details",
  },
  rich: {
    interactive: "Interactive content",
    sandboxNote: "Interactive content is fully isolated from the host · runs in a sandbox",
    expand: "Expand centered",
    viewSwitch: "Switch view",
    render: "Render",
    source: "Source",
    copySource: "Copy source",
    sourceCopied: "Source copied",
    modalCopySource: "⧉ Copy source",
    svgOverline: "svg · illustration",
    svgTitle: "Vector illustration",
    svgFoot: "Theme tokens apply directly inside the SVG (via var()) · follows light/dark automatically",
    iframeTitle: "Sandboxed content (allow-scripts · no same-origin)",
    svgInvalid: "SVG failed safety validation; fell back to source",
  },
  chart: {
    title: "Chart",
    legend: "Legend: click to show or hide series",
    downloadCsv: "⤓ Download CSV",
    copyCsv: "Copy CSV",
    copiedCsv: "CSV copied",
    viewChart: "Chart",
    viewTable: "Table",
    viewCode: "Source",
    total: "Total",
    tableCaption: "{title} · Same data as the chart",
    tableCaptionWithUnit: "{title} ({unit}) · Same data as the chart",
    seriesColumn: "Series",
    sourceFrom: "Source: {source}",
    sampleData: "Sample data",
    ariaChart: "{title}. Use the left/right arrow keys to read values point by point, or switch to the table view.",
    renderFailed: "Chart could not be rendered: {error}",
    parseErrors: {
      invalidJson: "Invalid JSON: {detail}",
      notObject: "The chart spec must be a JSON object",
      missingX: "Missing x-axis data (x: string[])",
      missingSeries: "Missing the series data array",
      invalidSeries: "Each series must provide name (string) and data (number[])",
    },
  },
  mermaid: {
    title: "Diagram",
    render: "Render",
    source: "Source",
    copySource: "Copy source",
    copiedSource: "Source copied",
    localRendererNote: "Local renderer (flowchart subset) · falls back to source when unparsable",
    modalCopySource: "⧉ Copy source",
    renderFailed: "The diagram could not be rendered; fell back to source",
  },
  runStatus: {
    queued: "Queued",
    running: "Running",
    waiting_for_user: "Waiting for user",
    completed: "Completed",
    needs_review: "Needs review",
    failed: "Failed",
    cancelled: "Cancelled",
  },
  visibility: {
    private: "Only me",
    project: "All project members",
    members: "{count} selected members",
  },
};

export const zhCN: BlocksDict = {
  tool: {
    displayNames: {
      "web.search": "网络检索",
      "file.read": "读取文件",
      "file.write": "生成文件",
      "code.execute": "运行程序",
    },
    knowledgeDisplayName: "知识库检索",
    runningText: {
      search: { prefix: "正在检索", verbatim: "正在检索网络" },
      knowledge: { prefix: "正在检索知识库", verbatim: "正在检索知识库" },
      file_read: { prefix: "正在读取", verbatim: "正在读取文件" },
      file_write: { prefix: "正在生成", verbatim: "正在生成文件" },
      execute: { prefix: "正在运行", verbatim: "正在运行程序" },
      skill: { prefix: "正在运行", verbatim: "正在运行技能" },
      generic: { prefix: "正在执行", verbatim: "正在执行工具" },
    },
  },
  toolStatus: {
    running: "运行中",
    completed: "已完成",
    failed: "失败",
    stopped: "已停止",
    retrying: "正在重试",
  },
  toolCall: {
    failedWithMessage: "{title}失败：{message}",
    genericError: "工具调用出错",
    retryingNote: "正在换路重试",
    stoppedRetryNote: "已停止重试",
    completedLabel: "{title}完成",
    detailRefNote: "完整结果按需加载 · {ref}",
  },
  exec: {
    runningBadge: "运行中",
    runningLabel: "正在运行「{title}」…",
    genericError: "程序运行出错",
    completedLabel: "已运行「{title}」",
    outputRefNote: "完整输出按需加载 · {ref}",
    exitChip: "exit {code}",
  },
  reasoning: {
    thinking: "正在思考",
    done: "已完成推理",
    doneWithDuration: "已思考 {seconds} 秒",
    unfinished: "推理未完成",
  },
  evidence: {
    title: "引用来源",
    retrievedAt: "检索于 {time}",
  },
  artifact: {
    draft: "草稿",
    committed: "已定稿",
    download: "下载",
    truncated: "内容已截断",
  },
  sandbox: {
    title: "沙箱执行",
    stages: {
      preparing: "正在准备安全执行环境…",
      running: "正在运行沙箱任务…",
      collectingOutputs: "正在收集安全输出…",
    },
    failures: {
      cancelled: "执行已取消",
      deadline_exceeded: "执行超时",
      tool_error: "程序未能成功完成",
      artifact_error: "输出产物未能生成",
      budget_exceeded: "已达到本轮资源上限",
      dependency_unavailable: "执行服务暂不可用",
    },
    exitCode: "退出码 {code}",
    duration: "耗时 {seconds} 秒",
    outputs: "{count} 个输出",
    failedWithDetail: "沙箱执行失败：{detail}",
    failedFallback: "沙箱执行未完成",
    succeeded: "沙箱执行成功",
    exitOkNote: "成功退出",
    durationMs: "{ms} 毫秒",
    durationSeconds: "{seconds} 秒",
    safeOutputs: "{count} 个安全输出",
  },
  browser: {
    failedWithMessage: "浏览器操作失败：{message}",
    genericError: "自动操作中断",
    retryingNote: "正在重试",
    stoppedNote: "已停止",
    pagesPrefix: "访问 {count} 个页面 · ",
    completedLabel: "浏览器操作 · {pages}{steps} 步",
    liveBadge: "自动操作中",
    searchPlaceholder: "站内检索…",
  },
  subagent: {
    runningLabel: "正在执行子任务…",
    genericError: "执行失败",
    retryingNote: "正在重试",
    stepsPart: "{count} 个步骤",
    secondsPart: "{seconds} 秒",
    completedFallback: "已完成",
    ariaLabel: "查看子 Agent「{title}」详情",
  },
  rich: {
    interactive: "交互内容",
    sandboxNote: "可交互内容与宿主完全隔离 · 沙箱中运行",
    expand: "居中展开",
    viewSwitch: "视图切换",
    render: "渲染",
    source: "源码",
    copySource: "复制源码",
    sourceCopied: "源码已复制",
    modalCopySource: "⧉ 复制源码",
    svgOverline: "svg · 插图",
    svgTitle: "矢量插图",
    svgFoot: "主题 token 直接生效于 SVG 内部（var 变量）· 深浅色自动跟随",
    iframeTitle: "沙箱内容（allow-scripts · 无 same-origin）",
    svgInvalid: "SVG 未通过安全校验，已降级为源码",
  },
  chart: {
    title: "图表",
    legend: "图例：点击显示或隐藏系列",
    downloadCsv: "⤓ 下载 CSV",
    copyCsv: "复制 CSV",
    copiedCsv: "已复制 CSV",
    viewChart: "图表",
    viewTable: "表格",
    viewCode: "源码",
    total: "合计",
    tableCaption: "{title} · 与图表同源数据",
    tableCaptionWithUnit: "{title}（{unit}） · 与图表同源数据",
    seriesColumn: "系列",
    sourceFrom: "来源：{source}",
    sampleData: "示例数据",
    ariaChart: "{title}。可用左右方向键逐点读数，或切换到表格视图。",
    renderFailed: "图表无法渲染：{error}",
    parseErrors: {
      invalidJson: "JSON 解析失败：{detail}",
      notObject: "图表 spec 需为 JSON 对象",
      missingX: "缺少 x 轴数据（x: string[]）",
      missingSeries: "缺少 series 数据数组",
      invalidSeries: "每个 series 需含 name(string) 与 data(number[])",
    },
  },
  mermaid: {
    title: "流程图",
    render: "渲染",
    source: "源码",
    copySource: "复制源码",
    copiedSource: "已复制源码",
    localRendererNote: "本地渲染器（flowchart 子集）· 无法解析自动降级源码",
    modalCopySource: "⧉ 复制源码",
    renderFailed: "流程图无法渲染，已降级为源码",
  },
  runStatus: {
    queued: "排队中",
    running: "运行中",
    waiting_for_user: "等待用户",
    completed: "已完成",
    needs_review: "待查看",
    failed: "失败",
    cancelled: "已取消",
  },
  visibility: {
    private: "仅自己",
    project: "全体项目成员",
    members: "指定 {count} 人",
  },
};
