/**
 * appCommon 域：应用壳层通用文案（无障碍跳转链接、404 兜底页等全局页面元素）。
 *
 * 归 app 壳层 agent 维护：接口与 en-US / zh-CN 两份值同构增补。
 */
export interface AppCommonDict {
  /** AppShell 顶部的无障碍跳转链接（聚焦 main#main-content）。 */
  skipLink: string;
  /** 路由兜底 404 页。 */
  notFound: {
    /** 大号状态码（保留 "404" 字符串以便样式/文案调整）。 */
    code: string;
    title: string;
    description: string;
  };
}

export const enUS: AppCommonDict = {
  skipLink: "Skip to main content",
  notFound: {
    code: "404",
    title: "Page not found",
    description: "Use the left navigation to return to an existing page.",
  },
};

export const zhCN: AppCommonDict = {
  skipLink: "跳到主要内容",
  notFound: {
    code: "404",
    title: "页面不存在",
    description: "请从左侧导航返回已有页面。",
  },
};
