/**
 * site 域：文档站壳层（DocsShell）与站点级页面（landing / docs / 404）的文案 ——
 * 顶栏品牌与导航、主题 / 语言切换 aria、侧导航分组与条目、landing hero、
 * docs 两页标题、404 兜底页。
 *
 * 归 app 壳层 agent 维护：接口与 en-US / zh-CN 两份值同构增补。
 * 注：landing / docs 小节同时承载各自页面的正文文案（特性卡 / 文档小节段落与表头），
 * 由 landing+docs 页面 agent 在同三节（接口 / enUS / zhCN）同构追加。
 */

import type { ComponentSlug } from "./components.js";

export interface SiteDict {
  /** 壳层 chrome：顶栏 + 切换控件。 */
  chrome: {
    /** 文字标（顶栏左侧，形如 "◆ Agent UI" 中的名称部分）。 */
    siteName: string;
    /** 顶栏主导航。 */
    nav: {
      docs: string;
      components: string;
      playground: string;
    };
    /** 主题切换 ToggleGroup 的 aria-label 与各档标签。 */
    themeSelectAria: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    /** 语言切换 ToggleGroup 的 aria-label；语言选项按各自语言自名（endonym），两 locale 同值。 */
    localeSelectAria: string;
    localeEnglish: string;
    localeChinese: string;
    /** 移动端侧导航开关按钮的 aria-label。 */
    menuToggleAria: string;
    /** 左侧导航 <nav> 的无障碍名。 */
    sidenavAria: string;
  };
  /** 左侧导航：分组名与散项名；组件条目名直接复用 components 域的 title。 */
  sidenav: {
    groups: {
      gettingStarted: string;
      components: string;
      playground: string;
    };
    items: {
      introduction: string;
      installation: string;
      playground: string;
    };
  };
  /** landing 页（/）：hero 标题级文案 + 主按钮 + live demo 区 + 特性卡 + 页脚。 */
  landing: {
    title: string;
    description: string;
    getStarted: string;
    browseComponents: string;
    /** live demo 区：角标与重播按钮。 */
    demoLabel: string;
    demoReplay: string;
    /** 特性卡区：区标题 + 三卡（协议驱动 / shadcn 基底 / 中英双语深浅色）。 */
    featuresTitle: string;
    features: {
      protocol: { title: string; description: string };
      shadcn: { title: string; description: string };
      i18n: { title: string; description: string };
    };
    /** 页脚一句话。 */
    footer: string;
  };
  /** docs 两页（/docs/introduction、/docs/installation）的标题、一句话简介与正文小节。 */
  docs: {
    introduction: {
      title: string;
      description: string;
      /** 库定位小节。 */
      overviewTitle: string;
      overviewBody: string;
      /** 架构小节：说明段 + 流程图四级 caption（节点本身为代码标识符，两 locale 同值）。 */
      architectureTitle: string;
      architectureBody: string;
      architectureStages: { events: string; reducer: string; state: string; components: string };
      /** 块类型映射表小节：说明段 + 表头 + 八行说明（kind / 组件名为代码标识符）。 */
      blocksTitle: string;
      blocksBody: string;
      tableKind: string;
      tableComponent: string;
      tableDescription: string;
      blockDescriptions: {
        text: string;
        tool: string;
        evidence: string;
        artifact: string;
        interrupt: string;
        reasoning: string;
        todo: string;
        sandbox: string;
      };
    };
    installation: {
      title: string;
      description: string;
      /** 安装小节：说明 + workspace 引用备注（命令本身在页面代码块里）。 */
      installTitle: string;
      installBody: string;
      workspaceNote: string;
      /** 样式接入小节。 */
      stylesTitle: string;
      stylesBody: string;
      /** 最小示例小节。 */
      exampleTitle: string;
      exampleBody: string;
    };
  };
  /** 路由兜底 404 页。 */
  notFound: {
    code: string;
    title: string;
    description: string;
    backHome: string;
  };
}

/** 侧导航 Components 组的 slug 顺序在 components 域的 COMPONENT_SLUGS 里维护。 */
export type { ComponentSlug };

export const enUS: SiteDict = {
  chrome: {
    siteName: "Agent UI",
    nav: {
      docs: "Docs",
      components: "Components",
      playground: "Playground",
    },
    themeSelectAria: "Theme selection",
    themeLight: "Light theme",
    themeDark: "Dark theme",
    themeSystem: "System",
    localeSelectAria: "Language selection",
    localeEnglish: "English",
    localeChinese: "中文",
    menuToggleAria: "Toggle navigation",
    sidenavAria: "Documentation navigation",
  },
  sidenav: {
    groups: {
      gettingStarted: "Getting Started",
      components: "Components",
      playground: "Playground",
    },
    items: {
      introduction: "Introduction",
      installation: "Installation",
      playground: "Playground",
    },
  },
  landing: {
    title: "Agent UI",
    description:
      "A bilingual React component library for agent run timelines: streaming text, reasoning, tool calls, interrupts, evidence and artifacts — all reduced from a single event stream.",
    getStarted: "Get started",
    browseComponents: "Browse components",
    demoLabel: "Live demo",
    demoReplay: "Replay",
    featuresTitle: "Why Agent UI",
    features: {
      protocol: {
        title: "Protocol-driven",
        description:
          "Every block on the timeline is reduced from a single wire event stream — streaming text, tool calls, interrupts, evidence and artifacts stay in lockstep with the run.",
      },
      shadcn: {
        title: "shadcn foundation",
        description:
          "Built on shadcn/ui primitives, Tailwind 4 and semantic tokens — drop the components into an existing design system and restyle through variables.",
      },
      i18n: {
        title: "Bilingual, light & dark",
        description:
          "en-US and zh-CN dictionaries ship with every component — demo scenarios included — and all surfaces follow light and dark themes.",
      },
    },
    footer: "Agent UI — a bilingual React component library for agent run timelines.",
  },
  docs: {
    introduction: {
      title: "Introduction",
      description:
        "What @diribo/agent-ui is: protocol-driven run timeline components, a state layer that reduces wire events into view states, and built-in demo scenarios.",
      overviewTitle: "What it is",
      overviewBody:
        "Agent UI is a component library for agent runtimes, not a chat skin. A run is a single event stream — run.started, block.*, run.completed. The library reduces that stream into an immutable view state and renders it with timeline components; you bring the transport (SSE, WebSocket, or the bundled mock player), the library owns reduction and rendering.",
      architectureTitle: "Architecture",
      architectureBody:
        "Events are the single source of truth. reduceEvent folds each wire event into RunViewState; RunTimeline and renderBlock project the state into components — live streams and replays take the same path.",
      architectureStages: { events: "Wire events", reducer: "Reducer", state: "View state", components: "Components" },
      blocksTitle: "Block kinds",
      blocksBody:
        "Eight wire block kinds cover the whole run surface. Each kind maps to the view component that renders it.",
      tableKind: "Block kind",
      tableComponent: "Component",
      tableDescription: "Description",
      blockDescriptions: {
        text: "Streaming markdown body with typewriter playback.",
        tool: "Tool call lifecycle: running, completed, failed.",
        evidence: "Inline citation markers plus the source list.",
        artifact: "Generated file cards with preview.",
        interrupt: "Human-in-the-loop cards: clarification and plan approval.",
        reasoning: "Collapsible reasoning trace with duration.",
        todo: "Task checklist with per-item status.",
        sandbox: "Sandbox runner progress and result summary.",
      },
    },
    installation: {
      title: "Installation",
      description:
        "Add @diribo/agent-ui to a React 19 + Tailwind 4 project and render your first run timeline.",
      installTitle: "Install the package",
      installBody: "Add the library with your package manager of choice.",
      workspaceNote: "Inside a pnpm workspace, reference it as \"@diribo/agent-ui\": \"workspace:*\".",
      stylesTitle: "Styles",
      stylesBody:
        "Components are styled through BEM class hooks (agent-*) and Tailwind utilities on semantic tokens. You need Tailwind 4 with an @source entry covering the library's TypeScript sources, plus the token and agent-* stylesheets — apps/portal/src/styles in this repository is a complete reference setup.",
      exampleTitle: "Minimal example",
      exampleBody:
        "A full turn replayed from the bundled scenarios: create a store, play the success scenario into it, and render the timeline.",
    },
  },
  notFound: {
    code: "404",
    title: "Page not found",
    description: "The page you are looking for does not exist. Use the navigation to find your way back.",
    backHome: "Back to home",
  },
};

export const zhCN: SiteDict = {
  chrome: {
    siteName: "Agent UI",
    nav: {
      docs: "文档",
      components: "组件",
      playground: "演练场",
    },
    themeSelectAria: "主题选择",
    themeLight: "浅色主题",
    themeDark: "深色主题",
    themeSystem: "跟随系统",
    localeSelectAria: "语言选择",
    localeEnglish: "English",
    localeChinese: "中文",
    menuToggleAria: "切换导航",
    sidenavAria: "文档导航",
  },
  sidenav: {
    groups: {
      gettingStarted: "快速开始",
      components: "组件",
      playground: "演练场",
    },
    items: {
      introduction: "介绍",
      installation: "安装",
      playground: "演练场",
    },
  },
  landing: {
    title: "Agent UI",
    description:
      "面向 agent 运行时间线的双语 React 组件库：流式正文、推理、工具调用、人机交互、来源引用与产物 —— 全部由同一条事件流归约而来。",
    getStarted: "快速开始",
    browseComponents: "浏览组件",
    demoLabel: "实时演示",
    demoReplay: "重新播放",
    featuresTitle: "特性",
    features: {
      protocol: {
        title: "协议驱动",
        description:
          "时间线上的每个块都由同一条 wire 事件流归约而来 —— 流式正文、工具调用、人机交互、来源与产物始终与 run 状态同步。",
      },
      shadcn: {
        title: "shadcn 基底",
        description:
          "基于 shadcn/ui 原语、Tailwind 4 与语义 token 构建 —— 可直接放进现有设计系统，经变量整体换肤。",
      },
      i18n: {
        title: "中英双语 · 深浅色",
        description:
          "全部组件内置 en-US / zh-CN 双字典（含演示剧本），所有界面随浅色 / 深色主题切换。",
      },
    },
    footer: "Agent UI —— 面向 agent 运行时间线的双语 React 组件库。",
  },
  docs: {
    introduction: {
      title: "介绍",
      description:
        "@diribo/agent-ui 是什么：协议驱动的 run 时间线组件、把 wire 事件归约成视图状态的状态层，以及内置演示剧本。",
      overviewTitle: "库定位",
      overviewBody:
        "Agent UI 是面向 agent 运行时的组件库，而不是聊天皮肤。一轮 run 就是一条事件流 —— run.started、block.*、run.completed。库把事件流归约成不可变视图状态，再由时间线组件渲染；传输层由你接入（SSE、WebSocket 或内置 mock 播放器），归约与渲染交给库。",
      architectureTitle: "架构",
      architectureBody:
        "事件流是唯一事实来源：reduceEvent 把每个 wire 事件折叠进 RunViewState，RunTimeline 与 renderBlock 再把状态投影成组件 —— 实时流与回放走同一条路径。",
      architectureStages: { events: "Wire 事件", reducer: "归约", state: "视图状态", components: "组件" },
      blocksTitle: "块类型",
      blocksBody: "八种 wire 块类型覆盖一轮 run 的全部界面，每种类型对应渲染它的视图组件。",
      tableKind: "块类型",
      tableComponent: "组件",
      tableDescription: "说明",
      blockDescriptions: {
        text: "流式 markdown 正文，逐句打字机播放。",
        tool: "工具调用全生命周期：进行中、完成、失败。",
        evidence: "行内引用标与来源列表。",
        artifact: "产物文件卡与内容预览。",
        interrupt: "人机交互卡：澄清提问与计划审批。",
        reasoning: "可折叠的推理过程，带耗时。",
        todo: "任务清单面板，逐项状态。",
        sandbox: "沙箱执行进度与结果摘要。",
      },
    },
    installation: {
      title: "安装",
      description: "在 React 19 + Tailwind 4 项目里接入 @diribo/agent-ui，渲染你的第一条 run 时间线。",
      installTitle: "安装",
      installBody: "用你顺手的包管理器添加依赖。",
      workspaceNote: "在 pnpm workspace 内，以 \"@diribo/agent-ui\": \"workspace:*\" 引用。",
      stylesTitle: "样式接入",
      stylesBody:
        "组件经 BEM 类名钩子（agent-*）与语义 token 上的 Tailwind 工具类完成样式。接入需要 Tailwind 4，并用 @source 覆盖组件库的 TS 源码，再补齐 token 与 agent-* 样式 —— 本仓库 apps/portal/src/styles 是完整的参考接入。",
      exampleTitle: "最小示例",
      exampleBody: "用内置剧本回放一轮完整 run：建 store、播放 success 场景、渲染时间线。",
    },
  },
  notFound: {
    code: "404",
    title: "页面不存在",
    description: "你访问的页面不存在，请从导航返回已有页面。",
    backHome: "返回首页",
  },
};
