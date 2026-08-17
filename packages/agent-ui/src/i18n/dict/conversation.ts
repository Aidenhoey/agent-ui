/**
 * conversation 域：会话级操作（⋯ 菜单 / 删除确认框）与会话线程壳
 * （ConversationThread）的文案。
 *
 * 约定：组件渲染的一切字符串都来自字典，不在 JSX 里硬编码；
 * `{placeholder}` 由 interpolate 填充。
 */
export interface ConversationDict {
  /** ⋯ 菜单触发器的 aria-label 模板：`更多操作：{title}`。 */
  moreActions: string;
  pin: string;
  unpin: string;
  /** nav 变体菜单的「多选」入口（进入侧栏选择模式）。 */
  multiSelect: string;
  /** 选择模式下菜单的「退出多选」入口。 */
  exitMultiSelect: string;
  rename: string;
  deleteConversation: string;
  deleteDialogTitle: string;
  /** 删除确认描述的前/后缀：展示标题（已截断）夹在中间，引号随语言进前后缀。 */
  deleteDialogPrefix: string;
  deleteDialogSuffix: string;
  /** ConversationThread 回到底部按钮的 aria-label。 */
  jumpToBottom: string;
}

export const enUS: ConversationDict = {
  moreActions: "More actions: {title}",
  pin: "Pin",
  unpin: "Unpin",
  multiSelect: "Select",
  exitMultiSelect: "Exit multi-select",
  rename: "Rename",
  deleteConversation: "Delete conversation",
  deleteDialogTitle: "Delete conversation",
  deleteDialogPrefix: "Deleting “",
  deleteDialogSuffix: "” removes it from your list. This cannot be undone.",
  jumpToBottom: "Back to bottom",
};

export const zhCN: ConversationDict = {
  moreActions: "更多操作：{title}",
  pin: "置顶",
  unpin: "取消置顶",
  multiSelect: "多选",
  exitMultiSelect: "退出多选",
  rename: "重命名",
  deleteConversation: "删除会话",
  deleteDialogTitle: "删除会话",
  deleteDialogPrefix: "删除「",
  deleteDialogSuffix: "」后，该会话将从列表中移除，无法恢复。",
  jumpToBottom: "回到底部",
};
