/**
 * Mock 事件流脚本 —— 六条演示流，对齐 wire 2（PublicAPI 2.x）块事件模型。
 *
 * 场景：完整成功 / 需要澄清(clarification) / 计划审批(plan_approval) /
 * 程序运行（一期真实形态：progress + output_summary）/ 富内容图表 / 运行失败。
 * 内容取金融尽调场景（定向增发方案比对），贴近真实业务的输出形态。
 *
 * 演示面收窄（沿用 SRC 拍板）：subagents 场景退役（子 agent 块三期再接）、
 * exec 场景不再有命令行/逐行输出（一期 wire 无源），浏览器/子 agent 演示
 * 仍待后续生产者；reasoning 的安全投影由专用 reducer/component fixtures 覆盖，
 * 避免把 mock 原始 reasoning 文本打进产品演示 bundle。
 * todo 无隐私顾虑，完整成功流携带任务清单生命周期，供演示/验收任务清单面板。
 *
 * 与 SRC 的差异：
 * - 删除 Ajv 运行时校验（库内无外部 contracts 包）：事件按 protocol/events.ts 的
 *   PublicRunEvent 手写，build() 只做信封组装与类型断言，不再当场校验。
 * - 内容双语化：buildScenarios(locale) 按 LocaleCode 出中英两套演示内容
 *   （userPrompt / 正文 / todo / interrupt 表单 / 产物等均为演示数据而非 UI 文案，
 *   内联双语、不进字典）；事件时序与 pauseAfter 暂停语义（interrupt 等待用户）
 *   与 SRC 完全一致。
 */

import type { LocaleCode } from "../i18n/index.js";
import type { EvidenceReference, PlatformInterrupt, PublicRunEvent } from "../protocol/events.js";
import type { PlaybackStep } from "./player.js";

const BASE_MS = Date.parse("2026-07-18T09:00:00.000Z");
const RETRIEVED_AT = "2026-07-18T08:59:30.000Z";

interface Raw {
  gap: number;
  type: string;
  payload: unknown;
  pause?: boolean;
}

function build(runId: string, raws: Raw[]): PlaybackStep[] {
  let seq = 0;
  let at = BASE_MS;
  return raws.map((r) => {
    seq += 1;
    at += r.gap;
    // 事件手写满足 PublicRunEvent（无 Ajv 校验，见模块头注释）。
    const event = {
      schema_version: 2,
      event_id: `evt_${runId}_${seq}`,
      run_id: runId,
      sequence: seq,
      occurred_at: new Date(at).toISOString(),
      event_type: r.type,
      payload: r.payload,
    } as unknown as PublicRunEvent;
    return { delayMs: r.gap, event, pauseAfter: r.pause };
  });
}

/* ------------------------------- 事件构造器 ------------------------------- */

const runStarted = (gap = 200): Raw => ({ gap, type: "run.started", payload: { status: "running" } });
const runCompleted = (summary: string, gap = 300): Raw => ({
  gap,
  type: "run.completed",
  payload: { status: "completed", summary },
});

const textStarted = (blockId: string, gap = 300): Raw => ({
  gap,
  type: "block.started",
  payload: { block_id: blockId, kind: "text" },
});
const textDelta = (blockId: string, text: string, gap = 150): Raw => ({
  gap,
  type: "block.delta",
  payload: { block_id: blockId, kind: "text", text },
});
const textCompleted = (blockId: string, gap = 200): Raw => ({
  gap,
  type: "block.completed",
  payload: { block_id: blockId, kind: "text" },
});
/** 一段正文的完整生命周期：started → 逐句 delta → completed。 */
const textBlock = (blockId: string, parts: string[], gap = 150): Raw[] => [
  textStarted(blockId),
  ...parts.map((t) => textDelta(blockId, t, gap)),
  textCompleted(blockId),
];

const toolStarted = (blockId: string, toolCallId: string, toolName: string, gap = 300): Raw => ({
  gap,
  type: "block.started",
  payload: { block_id: blockId, kind: "tool", tool_call_id: toolCallId, tool_name: toolName },
});
const toolProgress = (blockId: string, message: string, gap = 600): Raw => ({
  gap,
  type: "block.progress",
  payload: { block_id: blockId, kind: "tool", message },
});
const toolCompleted = (blockId: string, outputSummary: string, gap = 400): Raw => ({
  gap,
  type: "block.completed",
  payload: { block_id: blockId, kind: "tool", output_summary: outputSummary },
});
const toolFailed = (blockId: string, code: string, message: string, gap = 500): Raw => ({
  gap,
  type: "block.failed",
  payload: { block_id: blockId, kind: "tool", error: { code, message } },
});

const evidenceStarted = (e: EvidenceReference, gap = 80): Raw => ({
  gap,
  type: "block.started",
  payload: { block_id: `blk_ev_${e.evidence_id.slice(4)}`, kind: "evidence", evidence: e },
});

/** 演示用伪 digest（满足 sha256:hex64 形状即可，非真实哈希）。 */
const digest = (n: number) => `sha256:${String(n).padStart(64, "0")}`;

const artifactStarted = (blockId: string, logicalPath: string, gap = 400): Raw => ({
  gap,
  type: "block.started",
  payload: { block_id: blockId, kind: "artifact", logical_path: logicalPath, media_type: "text/markdown" },
});
const artifactDelta = (blockId: string, content: string, sizeBytes: number, n: number, gap = 500): Raw => ({
  gap,
  type: "block.delta",
  payload: {
    block_id: blockId,
    kind: "artifact",
    content,
    truncated: false,
    size_bytes: sizeBytes,
    content_digest: digest(n),
  },
});
const artifactCompleted = (blockId: string, logicalPath: string, sizeBytes: number, n: number, gap = 400): Raw => ({
  gap,
  type: "block.completed",
  payload: {
    block_id: blockId,
    kind: "artifact",
    artifact: {
      artifact_id: "art_1",
      logical_path: logicalPath,
      media_type: "text/markdown",
      content_digest: digest(n),
      size_bytes: sizeBytes,
    },
  },
});

type TodoItemStatus = "pending" | "in_progress" | "completed";
interface TodoWireItem { id: string; text: string; status: TodoItemStatus }

interface TodoTexts {
  search: string;
  read: string;
  calc: string;
  write: string;
}

/** 任务清单整单快照：检索 → 解析 → 核对 → 成文，四步按序推进。 */
const todoSnapshot = (
  texts: TodoTexts,
  search: TodoItemStatus,
  read: TodoItemStatus,
  calc: TodoItemStatus,
  write: TodoItemStatus,
): TodoWireItem[] => [
  { id: "td_search", text: texts.search, status: search },
  { id: "td_read", text: texts.read, status: read },
  { id: "td_calc", text: texts.calc, status: calc },
  { id: "td_write", text: texts.write, status: write },
];

const todoStarted = (blockId: string, gap = 300): Raw => ({
  gap,
  type: "block.started",
  payload: { block_id: blockId, kind: "todo" },
});
const todoDelta = (blockId: string, items: TodoWireItem[], gap = 200): Raw => ({
  gap,
  type: "block.delta",
  payload: { block_id: blockId, kind: "todo", items },
});
const todoCompleted = (blockId: string, gap = 200): Raw => ({
  gap,
  type: "block.completed",
  payload: { block_id: blockId, kind: "todo" },
});

const interruptStarted = (blockId: string, interrupt: PlatformInterrupt, gap = 400): Raw => ({
  gap,
  type: "block.started",
  payload: { block_id: blockId, kind: "interrupt", interrupt },
});
const interruptCompleted = (blockId: string, resolution?: unknown, gap = 200): Raw => ({
  gap,
  type: "block.completed",
  payload: {
    block_id: blockId,
    kind: "interrupt",
    ...(resolution === undefined ? {} : { resolution }),
  },
});
const runWaiting = (gap = 300): Raw => ({ gap, type: "run.waiting_for_user", payload: {}, pause: true });
const runResumed = (gap = 200): Raw => ({ gap, type: "run.resumed", payload: {} });

const evidenceSteps = (list: EvidenceReference[], count: number, gap = 80): Raw[] =>
  list.slice(0, count).map((e) => evidenceStarted(e, gap));

const fence = (lang: string, body: string): string => "```" + lang + "\n" + body + "\n```";

/* ------------------------------- 双语演示素材 ------------------------------- */

type ScenarioId = "success" | "clarify" | "plan" | "exec" | "richviz" | "fail";

/** 一条演示流所需的全部语言相关素材；事件时序由下方流构造器共享。 */
interface ScriptContent {
  evidences: EvidenceReference[];
  todos: TodoTexts;
  artifactPath: string;
  artifactPreview: string;
  mainText: string[];
  /** 跨场景复用的工具文案。 */
  shared: {
    execRunning: string;
    execFinishing: string;
    writeDone: string;
  };
  success: {
    searchExpanding: string;
    searchComparing: string;
    searchDone: string;
    readPaging: string;
    readDone: string;
    execDone: string;
    summary: string;
  };
  clarify: {
    searchProgress: string;
    searchDone: string;
    intro: string;
    interrupt: PlatformInterrupt;
    resolutionAnswer: string;
    resumedPrefix: string;
    summary: string;
  };
  plan: {
    intro: string;
    interrupt: PlatformInterrupt;
    searchProgress: string;
    searchDone: string;
    summary: string;
  };
  exec: {
    intro: string;
    done: string;
    summary: string;
  };
  richviz: {
    lineSpec: string;
    stackSpec: string;
    mermaid: string;
    svg: string;
    html: string;
    /** 正文叙事段（围栏卡由 assembleRichText 按 spec 字段拼装，与 SRC RICH_TEXT 同构）。 */
    narrative: {
      intro: string;
      delivery: string;
      revenue: string;
      pipeline: string;
      svg: string;
      html: string;
      outro: string;
    };
    readDone: string;
    summary: string;
  };
  fail: {
    searchProgress: string;
    searchDone: string;
    partialText: string;
    readProgress: string;
    toolFail1: string;
    toolFail2: string;
    runError: string;
  };
  meta: Record<ScenarioId, { label: string; userPrompt: string }>;
}

const ZH: ScriptContent = {
  evidences: [
    {
      evidence_id: "src_1",
      url: "https://www.cninfo.com.cn/notice/2026/definitive-plan.pdf",
      title: "XX 公司 2026 年度向特定对象发行 A 股股票预案",
      provider: "巨潮资讯网",
      retrieved_at: RETRIEVED_AT,
      snippet: "本次发行拟募集资金总额不超过 128,000 万元，发行对象为不超过 35 名符合条件的特定投资者……",
    },
    {
      evidence_id: "src_2",
      url: "https://www.sse.com.cn/disclosure/2024/prior-plan.pdf",
      title: "XX 公司 2024 年度非公开发行股票方案（已实施）",
      provider: "上海证券交易所",
      retrieved_at: RETRIEVED_AT,
      snippet: "2024 年方案募集资金总额为 108,500 万元，本次较上轮上调约 18%……",
    },
    {
      evidence_id: "src_3",
      url: "https://www.cninfo.com.cn/notice/2026/pricing-adjust.pdf",
      title: "关于调整本次向特定对象发行股票定价基准日的公告",
      provider: "巨潮资讯网",
      retrieved_at: RETRIEVED_AT,
      snippet: "第一期定价基准日为董事会决议公告日，发行价格为 8.12 元/股……",
    },
    {
      evidence_id: "src_4",
      url: "https://www.sse.com.cn/disclosure/2026/issue-terms.pdf",
      title: "本次发行方案要点及发行对象安排说明",
      provider: "上海证券交易所",
      retrieved_at: RETRIEVED_AT,
      snippet: "第二期采用竞价方式，定价基准日为发行期首日，发行价格不低于基准价的 80%……",
    },
    {
      evidence_id: "src_5",
      url: "https://www.cninfo.com.cn/notice/2026/use-of-proceeds.pdf",
      title: "募集资金使用可行性分析报告",
      provider: "巨潮资讯网",
      retrieved_at: RETRIEVED_AT,
      snippet: "本次募集资金中补充流动资金比例为 30%，其余用于智能产线扩建项目……",
    },
  ],
  todos: {
    search: "检索三份定增公告",
    read: "解析原始 PDF 并提取关键条款",
    calc: "运行脚本核对募资口径",
    write: "生成对比分析文档",
  },
  artifactPath: "定增方案对比分析.md",
  artifactPreview: `# 定增方案对比分析

## 一、募资规模
- 本次拟募集：**≤ 12.8 亿元**
- 上一轮（2024）：10.85 亿元
- 变动：**+18%**

## 二、定价机制对比
| 维度 | 本次方案 | 上轮方案 |
| --- | --- | --- |
| 第一期定价基准日 | 董事会决议公告日 | 董事会决议公告日 |
| 第二期定价基准日 | 发行期首日（竞价） | — |
| 补流比例 | 30% | 20% |

## 三、风险提示
补充流动资金比例已接近监管关注区间，需在尽调中核实募投项目真实资金缺口。
`,
  mainText: [
    "根据三份公告，本次定向增发的整体框架如下。\n\n",
    "**募资规模**：合计拟募集资金不超过 **12.8 亿元**[1]，",
    "较 2024 年方案上调约 18%[2]。",
    "发行对象为不超过 35 名特定投资者[1]。\n\n",
    "**定价与批次**：\n\n",
    "| 批次 | 募资额 | 发行价 | 定价基准日 |\n",
    "| --- | --- | --- | --- |\n",
    "| 第一期 | 6.4 亿 | 8.12 元 | 董事会决议公告日[3] |\n",
    "| 第二期 | 6.4 亿 | 询价确定 | 发行期首日[4] |\n\n",
    "需要重点关注的差异：\n\n",
    "- 定价基准日由「董事会决议公告日」调整为部分批次采用「发行期首日」[3][4]，锁价空间收窄。\n",
    "- 募集资金用途中补充流动资金比例上调至 30%[5]，已接近监管关注区间。\n\n",
    "**结论**：相比上一轮方案，本次定增在定价市场化与资金用途灵活性上均有提升，",
    "但补流比例已接近红线，建议在尽调中重点核实募投项目的真实资金需求。",
  ],
  shared: {
    execRunning: "正在运行核对脚本…",
    execFinishing: "即将完成：比对两轮募资总额…",
    writeDone: "已写入 定增方案对比分析.md",
  },
  success: {
    searchExpanding: "已命中 3 篇公告，正在扩展检索…",
    searchComparing: "正在比对 2024 与 2026 两版方案…",
    searchDone: "命中 5 篇高相关公告，覆盖 2024/2026 两版方案与定价调整",
    readPaging: "解析中：第 12 / 42 页…",
    readDone: "已解析 42 页，提取募资总额、发行对象与定价条款",
    execDone: "运行核对脚本：募资增幅 +17.97%，与公告口径一致",
    summary: "已完成三份定增公告的比对分析",
  },
  clarify: {
    searchProgress: "已命中 3 篇公告…",
    searchDone: "命中 3 篇公告，但口径存在分歧",
    intro: "在展开比对前，我需要先跟你确认一个口径问题，以免结论产生偏差。",
    interrupt: {
      interrupt_id: "int_1",
      interrupt_kind: "clarification",
      title: "需要你补充信息",
      content: "三份公告披露的募资额口径不完全一致，本次对比分析应以哪个口径为准？",
      input_schema: {
        fields: [
          {
            name: "caliber",
            label: "对比口径",
            type: "single_choice",
            required: true,
            options: [
              { value: "amount", label: "按募资总额", description: "以三份公告披露的募集资金总额为基准比对" },
              { value: "shares", label: "按发行股数", description: "以各期发行股票数量为基准比对" },
              { value: "both", label: "两者都要（分别列示）", description: "募资总额与发行股数分别列示，便于交叉核对" },
            ],
          },
          { name: "note", label: "补充说明（可选）", type: "textarea", placeholder: "例如：优先关注第一期锁价方案" },
        ],
      },
      resume_expires_at: "2026-07-19T09:00:00.000Z",
    },
    resolutionAnswer: "对比口径: 按募资总额",
    resumedPrefix: "已按你选择的口径继续分析。\n\n",
    summary: "已按确认口径完成比对分析",
  },
  plan: {
    intro: "这是一个多步骤的尽调任务，我拟定了如下执行计划，请确认后再开始。",
    interrupt: {
      interrupt_id: "int_plan",
      interrupt_kind: "plan_approval",
      title: "请确认执行计划",
      content: {
        prompt: "预计需要检索并读取 3 份公告、生成 1 份对比分析文档。批准后我将按此执行。",
        plan: [
          { id: "p1", title: "检索三份定增公告", detail: "巨潮 / 上交所，覆盖 2024 与 2026 方案" },
          { id: "p2", title: "读取原始 PDF 并提取条款", detail: "募资额、发行对象、定价基准日" },
          { id: "p3", title: "生成对比分析文档", detail: "输出 定增方案对比分析.md" },
        ],
      },
      input_schema: {},
      resume_expires_at: "2026-07-19T09:00:00.000Z",
    },
    searchProgress: "已命中 5 篇公告…",
    searchDone: "命中 5 篇高相关公告",
    summary: "已按批准的计划完成分析",
  },
  exec: {
    intro: "我先直接跑一段脚本核对本次定增的募资口径。",
    done: "已核对募资口径：+17.97%，与公告一致",
    summary: "已核对募资口径",
  },
  richviz: {
    lineSpec: `{ "type": "line", "title": "月度交付量对比", "sub": "2026 年 1–6 月 · 万辆", "unit": "万辆",
  "x": ["1月","2月","3月","4月","5月","6月"],
  "series": [
    { "name": "晨风汽车", "data": [3.2,3.5,4.1,3.9,4.6,5.2] },
    { "name": "岚湖汽车", "data": [2.8,2.9,3.3,3.6,3.4,3.8] },
    { "name": "极桥汽车", "data": [1.9,2.4,2.2,2.7,3.1,3.0] }
  ], "source": "ERP 销售明细", "evidence": [1] }`,
    stackSpec: `{ "type": "stack", "title": "晨风季度营收构成", "sub": "2025Q1 – 2026Q2 · 亿元", "unit": "亿元",
  "x": ["25Q1","25Q2","25Q3","25Q4","26Q1","26Q2"],
  "series": [
    { "name": "整车销售", "data": [182,198,214,246,228,262] },
    { "name": "能源与充电", "data": [24,27,30,34,36,41] },
    { "name": "软件订阅", "data": [9,11,13,16,18,22] },
    { "name": "其他", "data": [6,7,7,8,8,9] }
  ], "source": "ERP 收入分类账" }`,
    mermaid: `flowchart LR
  A[ERP 销售明细] --> C[口径清洗]
  B[行业月度快报] --> C
  C --> D{双源对齐}
  D -->|一致| E[图表与指标]
  D -->|差异| F[人工复核]
  F --> E`,
    svg: `<svg viewBox="0 0 640 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="单站经济模型：月度充电收入减运营成本得站级净现金流">
  <defs><marker id="sa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
    <path d="M0,0L8,4L0,8Z" fill="var(--color-text-subtle)"/></marker></defs>
  <rect x="20" y="34" width="172" height="72" rx="10" fill="var(--color-brand-tint)" stroke="var(--color-brand)"/>
  <text x="40" y="62" font-size="12" fill="var(--color-text-muted)">月度充电收入</text>
  <text x="40" y="88" font-size="21" font-weight="600" fill="var(--color-text)">8.6 万</text>
  <path d="M192,70 L234,70" stroke="var(--color-text-subtle)" stroke-width="1.4" fill="none" marker-end="url(#sa)"/>
  <rect x="238" y="34" width="172" height="72" rx="10" fill="var(--color-surface)" stroke="var(--color-border)"/>
  <text x="258" y="62" font-size="12" fill="var(--color-text-muted)">运营成本</text>
  <text x="258" y="88" font-size="21" font-weight="600" fill="var(--color-text)">− 5.1 万</text>
  <path d="M410,70 L452,70" stroke="var(--color-text-subtle)" stroke-width="1.4" fill="none" marker-end="url(#sa)"/>
  <rect x="456" y="34" width="164" height="72" rx="10" fill="var(--color-success-tint)" stroke="var(--color-success-text)"/>
  <text x="476" y="62" font-size="12" fill="var(--color-text-muted)">站级净现金流</text>
  <text x="476" y="88" font-size="21" font-weight="600" fill="var(--color-text)">+ 3.5 万</text>
  <text x="20" y="148" font-size="12" fill="var(--color-text-subtle)">单站投资 92 万 · 静态回收期 ≈ 26 个月 · 示例数据</text>
</svg>`,
    html: `<style>
.row{display:flex;gap:14px;align-items:center;margin:9px 0}
label{width:7em;color:light-dark(#6a6967,#9f9e9c)}
input[type=range]{flex:1}
output{width:5.5em;text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
.res{margin-top:12px;padding-top:10px;border-top:1px solid light-dark(#e7e6e5,#2c2b2a)}
.res b{font-size:20px}.note{opacity:.7;font-size:12px}
</style>
<div class="row"><label>度电服务费</label><input id="p" type="range" min="0.30" max="0.80" step="0.05" value="0.45"><output id="po"></output></div>
<div class="row"><label>日均利用小时</label><input id="u" type="range" min="4" max="14" step="0.5" value="8"><output id="uo"></output></div>
<div class="res">静态回收期 ≈ <b id="r"></b> 个月 <span class="note">· 单站投资 92 万 · 600kW · 示例模型</span></div>
<script>
var p=document.getElementById("p"),u=document.getElementById("u");
function calc(){var pr=+p.value,ut=+u.value;
  document.getElementById("po").value=pr.toFixed(2)+" 元";
  document.getElementById("uo").value=ut.toFixed(1)+" h";
  var m=(pr-0.18)*ut*1.8;document.getElementById("r").textContent=m>0?Math.round(92/m):"—";}
p.oninput=u.oninput=calc;calc();
</script>`,
    narrative: {
      intro: "下面把三家头部新能源车企 2026 上半年的表现做成对比图（均为示例数据）。\n\n",
      delivery: "**月度交付**：晨风自 3 月起持续拉开身位，6 月单月 5.2 万辆创新高[1]。\n\n",
      revenue: "**营收结构**：晨风第二曲线（能源与充电、软件订阅）合计占比从 13% 升到 21.6%[2]。\n\n",
      pipeline: "为避免口径歧义，交付数据的加工链路如下（双源核对一致后才入图，差异项转人工复核）：\n\n",
      svg: "充电业务补两份材料。单站经济模型示意（SVG 插图，主题 token 自动跟随深浅色）：\n\n",
      html: "以及一个可拖动的回本敏感性试算器（HTML 片段，沙箱中运行）：\n\n",
      outro: "综合来看：交付端晨风份额持续抬升，营收端第二曲线开始成型。每张卡都可切换源码、居中展开。",
    },
    readDone: "读取 ERP 销售明细与行业月度快报",
    summary: "已生成三家车企对比图表、加工链路与回本试算器",
  },
  fail: {
    searchProgress: "已命中 2 篇公告…",
    searchDone: "命中 2 篇公告",
    partialText: "初步来看，本次定增的募资规模较上一轮有所提升[1]，但在读取原始预案以核对定价条款时遇到了问题。",
    readProgress: "解析中…",
    toolFail1: "文档解析服务响应超时",
    toolFail2: "文档解析服务仍不可用",
    runError: "文档解析服务暂不可用，本轮无法继续",
  },
  meta: {
    success: { label: "完整成功", userPrompt: "分析一下 XX 公司最近的三份定向增发公告，重点比对募资规模和定价机制。" },
    clarify: { label: "需要澄清", userPrompt: "帮我对比 XX 公司这几份定增公告的募资情况。" },
    plan: { label: "计划审批", userPrompt: "对 XX 公司的定向增发做一次完整尽调分析。" },
    exec: { label: "程序运行", userPrompt: "先跑脚本核对本次定增的募资口径。" },
    richviz: { label: "富内容图表", userPrompt: "帮我梳理三家头部新能源车企 2026 上半年的交付与营收表现，做成对比图。" },
    fail: { label: "运行失败", userPrompt: "读取 XX 公司增发预案原文并核对定价条款。" },
  },
};

const EN: ScriptContent = {
  evidences: [
    {
      evidence_id: "src_1",
      url: "https://www.cninfo.com.cn/notice/2026/definitive-plan.pdf",
      title: "XX Company 2026 Preliminary Plan for A-Share Issuance to Specific Investors",
      provider: "CNINFO",
      retrieved_at: RETRIEVED_AT,
      snippet: "The planned total proceeds will not exceed RMB 1.28 billion, targeting no more than 35 qualified specific investors……",
    },
    {
      evidence_id: "src_2",
      url: "https://www.sse.com.cn/disclosure/2024/prior-plan.pdf",
      title: "XX Company 2024 Non-Public Share Issuance Plan (Implemented)",
      provider: "Shanghai Stock Exchange",
      retrieved_at: RETRIEVED_AT,
      snippet: "The 2024 plan raised RMB 1.085 billion in total; this round is up ~18% over the previous one……",
    },
    {
      evidence_id: "src_3",
      url: "https://www.cninfo.com.cn/notice/2026/pricing-adjust.pdf",
      title: "Announcement on Adjusting the Pricing Reference Date of This Issuance to Specific Investors",
      provider: "CNINFO",
      retrieved_at: RETRIEVED_AT,
      snippet: "The Tranche 1 pricing reference date is the board resolution announcement date, with an issue price of RMB 8.12 per share……",
    },
    {
      evidence_id: "src_4",
      url: "https://www.sse.com.cn/disclosure/2026/issue-terms.pdf",
      title: "Key Terms of This Issuance Plan and Subscriber Arrangements",
      provider: "Shanghai Stock Exchange",
      retrieved_at: RETRIEVED_AT,
      snippet: "Tranche 2 uses competitive bidding; the pricing reference date is the first day of the offering period, and the issue price shall be no less than 80% of the benchmark price……",
    },
    {
      evidence_id: "src_5",
      url: "https://www.cninfo.com.cn/notice/2026/use-of-proceeds.pdf",
      title: "Feasibility Analysis Report on the Use of Proceeds",
      provider: "CNINFO",
      retrieved_at: RETRIEVED_AT,
      snippet: "30% of the proceeds will supplement working capital, with the remainder funding the smart production line expansion project……",
    },
  ],
  todos: {
    search: "Retrieve the three placement announcements",
    read: "Parse the original PDFs and extract key terms",
    calc: "Run a script to verify the proceeds figures",
    write: "Generate the comparison analysis document",
  },
  artifactPath: "placement-comparison.md",
  artifactPreview: `# Private Placement Plan Comparison

## 1. Proceeds
- This round: **≤ RMB 1.28B**
- Previous round (2024): RMB 1.085B
- Change: **+18%**

## 2. Pricing Mechanism
| Dimension | This round | Previous round |
| --- | --- | --- |
| Tranche 1 pricing reference date | Board resolution announcement date | Board resolution announcement date |
| Tranche 2 pricing reference date | First day of the offering period (competitive bidding) | — |
| Working capital ratio | 30% | 20% |

## 3. Risk Notes
The working capital supplementation ratio is approaching the regulatory watch zone; verify the real funding gap of the invested projects during due diligence.
`,
  mainText: [
    "Based on the three announcements, the overall framework of this private placement is as follows.\n\n",
    "**Proceeds**: total planned proceeds of no more than **RMB 1.28B**[1], ",
    "up ~18% versus the 2024 plan[2]. ",
    "The offering targets no more than 35 specific investors[1].\n\n",
    "**Pricing and tranches**:\n\n",
    "| Tranche | Proceeds | Price | Pricing reference date |\n",
    "| --- | --- | --- | --- |\n",
    "| Tranche 1 | RMB 640M | RMB 8.12 | Board resolution announcement date[3] |\n",
    "| Tranche 2 | RMB 640M | Determined by bookbuilding | First day of the offering period[4] |\n\n",
    "Key differences to watch:\n\n",
    "- The pricing reference date moved from \"board resolution announcement date\" to \"first day of the offering period\" for some tranches[3][4], narrowing the price-lock window.\n",
    "- The share of proceeds allocated to working capital rose to 30%[5], approaching the regulatory watch zone.\n\n",
    "**Conclusion**: compared with the previous round, this placement improves pricing marketization and proceeds-use flexibility, ",
    "but the working capital ratio is near the red line — verify the real funding needs of the invested projects during due diligence.",
  ],
  shared: {
    execRunning: "Running the verification script…",
    execFinishing: "Finishing: comparing proceeds across the two rounds…",
    writeDone: "Wrote placement-comparison.md",
  },
  success: {
    searchExpanding: "3 announcements found, expanding the search…",
    searchComparing: "Comparing the 2024 and 2026 plans…",
    searchDone: "Found 5 highly relevant announcements covering both 2024/2026 plans and the pricing adjustment",
    readPaging: "Parsing: page 12 / 42…",
    readDone: "Parsed 42 pages; extracted total proceeds, subscribers, and pricing terms",
    execDone: "Verification script: proceeds growth +17.97%, consistent with the announcements",
    summary: "Completed the comparison of the three placement announcements",
  },
  clarify: {
    searchProgress: "3 announcements found…",
    searchDone: "Found 3 announcements, but their disclosure bases differ",
    intro: "Before comparing, I need to confirm the comparison basis with you to avoid skewed conclusions.",
    interrupt: {
      interrupt_id: "int_1",
      interrupt_kind: "clarification",
      title: "More information needed",
      content: "The three announcements disclose proceeds on different bases. Which basis should this comparison use?",
      input_schema: {
        fields: [
          {
            name: "caliber",
            label: "Comparison basis",
            type: "single_choice",
            required: true,
            options: [
              { value: "amount", label: "By total proceeds", description: "Compare on the total proceeds disclosed in the three announcements" },
              { value: "shares", label: "By share count", description: "Compare on the number of shares issued in each tranche" },
              { value: "both", label: "Both (listed separately)", description: "List total proceeds and share count separately for cross-checking" },
            ],
          },
          { name: "note", label: "Additional notes (optional)", type: "textarea", placeholder: "E.g., focus on the Tranche 1 fixed-price plan first" },
        ],
      },
      resume_expires_at: "2026-07-19T09:00:00.000Z",
    },
    resolutionAnswer: "Comparison basis: By total proceeds",
    resumedPrefix: "Continuing the analysis with the basis you selected.\n\n",
    summary: "Completed the comparison using the confirmed basis",
  },
  plan: {
    intro: "This is a multi-step due diligence task. I've drafted the execution plan below — please confirm before I start.",
    interrupt: {
      interrupt_id: "int_plan",
      interrupt_kind: "plan_approval",
      title: "Please confirm the execution plan",
      content: {
        prompt: "I will retrieve and read 3 announcements and generate 1 comparison document. Once approved, I will proceed accordingly.",
        plan: [
          { id: "p1", title: "Retrieve the three placement announcements", detail: "CNINFO / SSE, covering the 2024 and 2026 plans" },
          { id: "p2", title: "Read the original PDFs and extract terms", detail: "Proceeds, subscribers, pricing reference dates" },
          { id: "p3", title: "Generate the comparison document", detail: "Outputs placement-comparison.md" },
        ],
      },
      input_schema: {},
      resume_expires_at: "2026-07-19T09:00:00.000Z",
    },
    searchProgress: "5 announcements found…",
    searchDone: "Found 5 highly relevant announcements",
    summary: "Completed the analysis according to the approved plan",
  },
  exec: {
    intro: "Let me first run a script to verify the proceeds figures of this placement.",
    done: "Proceeds verified: +17.97%, consistent with the announcements",
    summary: "Proceeds figures verified",
  },
  richviz: {
    lineSpec: `{ "type": "line", "title": "Monthly Deliveries Comparison", "sub": "Jan–Jun 2026 · 10k units", "unit": "10k units",
  "x": ["Jan","Feb","Mar","Apr","May","Jun"],
  "series": [
    { "name": "Chenfeng Auto", "data": [3.2,3.5,4.1,3.9,4.6,5.2] },
    { "name": "Lanhu Auto", "data": [2.8,2.9,3.3,3.6,3.4,3.8] },
    { "name": "Jiqiao Auto", "data": [1.9,2.4,2.2,2.7,3.1,3.0] }
  ], "source": "ERP sales detail", "evidence": [1] }`,
    stackSpec: `{ "type": "stack", "title": "Chenfeng Quarterly Revenue Mix", "sub": "2025Q1 – 2026Q2 · RMB 100M", "unit": "RMB 100M",
  "x": ["25Q1","25Q2","25Q3","25Q4","26Q1","26Q2"],
  "series": [
    { "name": "Vehicle sales", "data": [182,198,214,246,228,262] },
    { "name": "Energy & charging", "data": [24,27,30,34,36,41] },
    { "name": "Software subscriptions", "data": [9,11,13,16,18,22] },
    { "name": "Other", "data": [6,7,7,8,8,9] }
  ], "source": "ERP revenue ledger" }`,
    mermaid: `flowchart LR
  A[ERP sales detail] --> C[Data cleaning]
  B[Industry monthly flash report] --> C
  C --> D{Dual-source alignment}
  D -->|match| E[Charts & metrics]
  D -->|differ| F[Manual review]
  F --> E`,
    svg: `<svg viewBox="0 0 640 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Station unit economics: monthly charging revenue minus operating cost equals station net cash flow">
  <defs><marker id="sa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
    <path d="M0,0L8,4L0,8Z" fill="var(--color-text-subtle)"/></marker></defs>
  <rect x="20" y="34" width="172" height="72" rx="10" fill="var(--color-brand-tint)" stroke="var(--color-brand)"/>
  <text x="40" y="62" font-size="12" fill="var(--color-text-muted)">Monthly charging revenue</text>
  <text x="40" y="88" font-size="21" font-weight="600" fill="var(--color-text)">86k</text>
  <path d="M192,70 L234,70" stroke="var(--color-text-subtle)" stroke-width="1.4" fill="none" marker-end="url(#sa)"/>
  <rect x="238" y="34" width="172" height="72" rx="10" fill="var(--color-surface)" stroke="var(--color-border)"/>
  <text x="258" y="62" font-size="12" fill="var(--color-text-muted)">Operating cost</text>
  <text x="258" y="88" font-size="21" font-weight="600" fill="var(--color-text)">− 51k</text>
  <path d="M410,70 L452,70" stroke="var(--color-text-subtle)" stroke-width="1.4" fill="none" marker-end="url(#sa)"/>
  <rect x="456" y="34" width="164" height="72" rx="10" fill="var(--color-success-tint)" stroke="var(--color-success-text)"/>
  <text x="476" y="62" font-size="12" fill="var(--color-text-muted)">Station net cash flow</text>
  <text x="476" y="88" font-size="21" font-weight="600" fill="var(--color-text)">+ 35k</text>
  <text x="20" y="148" font-size="12" fill="var(--color-text-subtle)">RMB 920k per station · static payback ≈ 26 months · sample data</text>
</svg>`,
    html: `<style>
.row{display:flex;gap:14px;align-items:center;margin:9px 0}
label{width:7em;color:light-dark(#6a6967,#9f9e9c)}
input[type=range]{flex:1}
output{width:5.5em;text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
.res{margin-top:12px;padding-top:10px;border-top:1px solid light-dark(#e7e6e5,#2c2b2a)}
.res b{font-size:20px}.note{opacity:.7;font-size:12px}
</style>
<div class="row"><label>Fee per kWh</label><input id="p" type="range" min="0.30" max="0.80" step="0.05" value="0.45"><output id="po"></output></div>
<div class="row"><label>Hours per day</label><input id="u" type="range" min="4" max="14" step="0.5" value="8"><output id="uo"></output></div>
<div class="res">Static payback ≈ <b id="r"></b> months <span class="note">· RMB 920k per station · 600kW · sample model</span></div>
<script>
var p=document.getElementById("p"),u=document.getElementById("u");
function calc(){var pr=+p.value,ut=+u.value;
  document.getElementById("po").value=pr.toFixed(2)+" RMB";
  document.getElementById("uo").value=ut.toFixed(1)+" h";
  var m=(pr-0.18)*ut*1.8;document.getElementById("r").textContent=m>0?Math.round(92/m):"—";}
p.oninput=u.oninput=calc;calc();
</script>`,
    narrative: {
      intro: "Here is a comparison of three leading NEV makers' H1 2026 performance (all sample data).\n\n",
      delivery: "**Monthly deliveries**: Chenfeng has pulled ahead since March, hitting a record 52k units in June[1].\n\n",
      revenue: "**Revenue mix**: Chenfeng's second curve (energy & charging, software subscriptions) rose from 13% to 21.6% of revenue[2].\n\n",
      pipeline: "To avoid caliber ambiguity, the delivery data pipeline is shown below (figures enter charts only after dual-source checks pass; mismatches go to manual review):\n\n",
      svg: "Two extra materials on the charging business. Station unit economics sketch (SVG illustration; theme tokens follow light/dark automatically):\n\n",
      html: "And a draggable payback sensitivity calculator (HTML fragment, runs in a sandbox):\n\n",
      outro: "Overall: Chenfeng keeps gaining delivery share while its second revenue curve takes shape. Every card supports source view and centered expansion.",
    },
    readDone: "Read the ERP sales detail and the industry monthly flash report",
    summary: "Generated the three-company comparison charts, the data pipeline, and the payback calculator",
  },
  fail: {
    searchProgress: "2 announcements found…",
    searchDone: "Found 2 announcements",
    partialText: "At first glance, this placement's proceeds are higher than the previous round[1], but I hit a problem while reading the original proposal to verify the pricing terms.",
    readProgress: "Parsing…",
    toolFail1: "The document parsing service timed out",
    toolFail2: "The document parsing service is still unavailable",
    runError: "The document parsing service is temporarily unavailable; this run cannot continue",
  },
  meta: {
    success: { label: "Full success", userPrompt: "Analyze XX Company's three recent private placement announcements, focusing on proceeds size and pricing mechanism." },
    clarify: { label: "Clarification needed", userPrompt: "Compare the proceeds across these XX Company placement announcements." },
    plan: { label: "Plan approval", userPrompt: "Run a full due diligence analysis on XX Company's private placement." },
    exec: { label: "Program run", userPrompt: "First run a script to verify this placement's proceeds figures." },
    richviz: { label: "Rich charts", userPrompt: "Summarize H1 2026 deliveries and revenue for three leading NEV makers as comparison charts." },
    fail: { label: "Run failure", userPrompt: "Read the original text of XX Company's placement proposal and verify the pricing terms." },
  },
};

/* ------------------------------- 流构造器（时序与 SRC 一致） ------------------------------- */

/** 富内容正文：叙事段 + 围栏卡（chart / mermaid / svg / html）按 SRC RICH_TEXT 结构拼装。 */
const assembleRichText = (r: ScriptContent["richviz"]): string[] => [
  r.narrative.intro,
  r.narrative.delivery,
  fence("chart", r.lineSpec) + "\n\n",
  r.narrative.revenue,
  fence("chart", r.stackSpec) + "\n\n",
  r.narrative.pipeline,
  fence("mermaid", r.mermaid) + "\n\n",
  r.narrative.svg,
  fence("svg", r.svg) + "\n\n",
  r.narrative.html,
  fence("html", r.html) + "\n\n",
  r.narrative.outro,
];

/* ---- 场景一：完整成功 ---- */
const successFlow = (c: ScriptContent): PlaybackStep[] => build("run_success", [
  runStarted(),

  todoStarted("blk_todo"),
  todoDelta("blk_todo", todoSnapshot(c.todos, "in_progress", "pending", "pending", "pending")),

  toolStarted("blk_s1", "tool_1", "web.search"),
  toolProgress("blk_s1", c.success.searchExpanding),
  toolProgress("blk_s1", c.success.searchComparing),
  ...evidenceSteps(c.evidences, 5),
  toolCompleted("blk_s1", c.success.searchDone),
  todoDelta("blk_todo", todoSnapshot(c.todos, "completed", "in_progress", "pending", "pending")),

  toolStarted("blk_f1", "tool_2", "file.read"),
  toolProgress("blk_f1", c.success.readPaging),
  toolCompleted("blk_f1", c.success.readDone),
  todoDelta("blk_todo", todoSnapshot(c.todos, "completed", "completed", "in_progress", "pending")),

  toolStarted("blk_x1", "tool_3", "code.execute"),
  toolProgress("blk_x1", c.shared.execRunning),
  toolProgress("blk_x1", c.shared.execFinishing),
  toolCompleted("blk_x1", c.success.execDone),
  todoDelta("blk_todo", todoSnapshot(c.todos, "completed", "completed", "completed", "in_progress")),

  toolStarted("blk_w1", "tool_4", "file.write"),
  artifactStarted("blk_art1", c.artifactPath),
  artifactDelta("blk_art1", c.artifactPreview, 1240, 1),
  artifactCompleted("blk_art1", c.artifactPath, 1240, 1),
  toolCompleted("blk_w1", c.shared.writeDone),
  todoDelta("blk_todo", todoSnapshot(c.todos, "completed", "completed", "completed", "completed")),
  todoCompleted("blk_todo"),

  ...textBlock("blk_txt", c.mainText, 160),
  runCompleted(c.success.summary),
]);

/* ---- 场景二：需要澄清（clarification）---- */
const clarificationFlow = (c: ScriptContent): PlaybackStep[] => build("run_clarify", [
  runStarted(),
  toolStarted("blk_s1", "tool_1", "web.search"),
  toolProgress("blk_s1", c.clarify.searchProgress),
  ...evidenceSteps(c.evidences, 2),
  toolCompleted("blk_s1", c.clarify.searchDone),
  ...textBlock("blk_txt0", [c.clarify.intro], 140),

  interruptStarted("blk_int1", c.clarify.interrupt),
  runWaiting(),
  // —— 以下为 resume 续播。wire 闭合事件携带 resolution（ResumeInput 形状），
  // 模拟「服务端持久化用户答复」的理想形态（真实服务端现状未写该字段，契约已预留）；
  // live 会话另由 annotateResolution 本地乐观标注，wire 到达后以 wire 为准。——
  interruptCompleted("blk_int1", { answer: c.clarify.resolutionAnswer }),
  runResumed(),
  ...textBlock("blk_txt", [c.clarify.resumedPrefix, ...c.mainText], 150),
  artifactStarted("blk_art1", c.artifactPath),
  artifactDelta("blk_art1", c.artifactPreview, 1240, 1),
  artifactCompleted("blk_art1", c.artifactPath, 1240, 1),
  runCompleted(c.clarify.summary),
]);

/* ---- 场景三：计划审批（plan_approval）---- */
const planFlow = (c: ScriptContent): PlaybackStep[] => build("run_plan", [
  runStarted(),
  ...textBlock("blk_txt0", [c.plan.intro], 140),

  interruptStarted("blk_int_plan", c.plan.interrupt),
  runWaiting(),
  // —— resume 续播，携带 wire resolution（理想形态，见 clarificationFlow 注释）——
  interruptCompleted("blk_int_plan", { decision: "approve" }),
  runResumed(),
  toolStarted("blk_s1", "tool_1", "web.search"),
  toolProgress("blk_s1", c.plan.searchProgress),
  ...evidenceSteps(c.evidences, 5, 70),
  toolCompleted("blk_s1", c.plan.searchDone),
  toolStarted("blk_w1", "tool_2", "file.write"),
  artifactStarted("blk_art1", c.artifactPath),
  artifactDelta("blk_art1", c.artifactPreview, 1240, 1),
  artifactCompleted("blk_art1", c.artifactPath, 1240, 1),
  toolCompleted("blk_w1", c.shared.writeDone),
  ...textBlock("blk_txt", c.mainText, 150),
  runCompleted(c.plan.summary),
]);

/* ---- 场景四：程序运行（一期真实形态：progress + output_summary）---- */
const execDemoFlow = (c: ScriptContent): PlaybackStep[] => build("run_exec", [
  runStarted(),
  ...textBlock("blk_intro", [c.exec.intro], 140),

  toolStarted("blk_exec", "tool_1", "code.execute"),
  toolProgress("blk_exec", c.shared.execRunning),
  toolProgress("blk_exec", c.shared.execFinishing),
  toolCompleted("blk_exec", c.exec.done),

  runCompleted(c.exec.summary),
]);

/* ---- 场景五：富内容图表（chart / mermaid / svg / html 围栏在正文内渲染）---- */
const richvizFlow = (c: ScriptContent): PlaybackStep[] => build("run_richviz", [
  runStarted(),
  toolStarted("blk_s1", "tool_1", "file.read"),
  ...evidenceSteps(c.evidences, 2),
  toolCompleted("blk_s1", c.richviz.readDone),
  ...textBlock("blk_rich", assembleRichText(c.richviz), 110),
  runCompleted(c.richviz.summary),
]);

/* ---- 场景六：运行失败（tool.failed + run.failed 触发终态隐式闭块）---- */
const failureFlow = (c: ScriptContent): PlaybackStep[] => build("run_fail", [
  runStarted(),
  toolStarted("blk_s1", "tool_1", "web.search"),
  toolProgress("blk_s1", c.fail.searchProgress),
  ...evidenceSteps(c.evidences, 2),
  toolCompleted("blk_s1", c.fail.searchDone),
  // 正文块刻意不 completed：run.failed 到达时由 reducer 终态隐式闭块兜底。
  textStarted("blk_txt"),
  textDelta("blk_txt", c.fail.partialText),

  toolStarted("blk_f1", "tool_2", "file.read"),
  toolProgress("blk_f1", c.fail.readProgress),
  toolFailed("blk_f1", "tool_error", c.fail.toolFail1),
  toolStarted("blk_f2", "tool_3", "file.read"),
  toolFailed("blk_f2", "tool_error", c.fail.toolFail2, 800),
  {
    gap: 500,
    type: "run.failed",
    payload: {
      status: "failed",
      error: { code: "dependency_unavailable", message: c.fail.runError, retryable: true },
    },
  },
]);

export interface Scenario {
  id: string;
  label: string;
  userPrompt: string;
  steps: PlaybackStep[];
}

/**
 * 按 locale 构建六条演示流（中文 "zh-CN" / 英文 "en-US"）。
 * 每次调用重建 PlaybackStep：事件信封的时间戳/序列号随之刷新，可安全重复使用。
 */
export function buildScenarios(locale: LocaleCode): Scenario[] {
  const c = locale === "en-US" ? EN : ZH;
  return [
    { id: "success", label: c.meta.success.label, userPrompt: c.meta.success.userPrompt, steps: successFlow(c) },
    { id: "clarify", label: c.meta.clarify.label, userPrompt: c.meta.clarify.userPrompt, steps: clarificationFlow(c) },
    { id: "plan", label: c.meta.plan.label, userPrompt: c.meta.plan.userPrompt, steps: planFlow(c) },
    { id: "exec", label: c.meta.exec.label, userPrompt: c.meta.exec.userPrompt, steps: execDemoFlow(c) },
    { id: "richviz", label: c.meta.richviz.label, userPrompt: c.meta.richviz.userPrompt, steps: richvizFlow(c) },
    { id: "fail", label: c.meta.fail.label, userPrompt: c.meta.fail.userPrompt, steps: failureFlow(c) },
  ];
}
