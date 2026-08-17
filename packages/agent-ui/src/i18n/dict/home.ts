/**
 * home 域：门户壳层页面（首页 / 历史页 / 会话页壳）的文案。
 *
 * 由 pages 移植 agent（范围 C）维护：首页大标题与演示场景分组、历史页标题、
 * 会话页壳层的少量兜底文案。接口与 en-US / zh-CN 两份值保持同构。
 * 演示数据文案（场景 label / 会话标题等）属 mock 内容，内联在数据层，不进本域。
 */
export interface HomeDict {
  /** 首页居中大标题。 */
  homeTitle: string;
  /** 首页演示场景 chips 分组的 aria-label。 */
  demoScenariosAria: string;
  /** 历史页标题。 */
  historyTitle: string;
  /** 会话不存在（路由未命中任何 fixture / live 会话）的标题。 */
  conversationMissingTitle: string;
  /** 会话不存在的说明正文。 */
  conversationMissingBody: string;
  /** 会话页头部就地重命名输入框的 aria-label。 */
  renameConversationAria: string;
}

export const enUS: HomeDict = {
  homeTitle: "What do you want to get done today?",
  demoScenariosAria: "Demo scenarios",
  historyTitle: "Conversation history",
  conversationMissingTitle: "Conversation not found",
  conversationMissingBody:
    "This conversation may have been deleted, or it does not belong to the current account.",
  renameConversationAria: "Rename conversation",
};

export const zhCN: HomeDict = {
  homeTitle: "今天想完成什么？",
  demoScenariosAria: "演示场景",
  historyTitle: "历史会话",
  conversationMissingTitle: "会话不存在",
  conversationMissingBody: "该会话可能已被删除，或不属于当前账户。",
  renameConversationAria: "重命名会话",
};
