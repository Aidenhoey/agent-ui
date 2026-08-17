/**
 * history 域：历史会话浏览（HistoryBrowser 的 page / dialog 双形态）的文案。
 *
 * 约定：组件渲染的一切字符串都来自字典，不在 JSX 里硬编码；
 * `{placeholder}` 由 interpolate 填充。
 */
export interface HistoryDict {
  /** HistoryDialog 的标题（page 形态的标题由调用方传入，不从此取）。 */
  dialogTitle: string;
  /** HistoryDialog / 浏览区的无障碍名。 */
  dialogAria: string;
  /** HistoryDialog 的 sr-only 描述。 */
  dialogDescription: string;
  multiSelect: string;
  selectDone: string;
  newConversation: string;
  /** 搜索框的 sr-only 标签。 */
  searchAria: string;
  searchPlaceholder: string;
  selectAll: string;
  /** 选中计数文案（数字以 <strong> 夹在前后缀之间）：`已选择 3 项`。 */
  selectedPrefix: string;
  selectedSuffix: string;
  clearSelection: string;
  /** 行复选框的 aria-label 模板：`选择 {title}`。 */
  selectItemAria: string;
  emptyNoMatch: string;
  emptyDefault: string;
  /** 批量删除确认框标题：`删除 {count} 个会话？`。 */
  deleteConfirmTitle: string;
  /** 批量删除确认框描述（复刻无回收站：删除即移除，不可恢复）。 */
  deleteConfirmDescription: string;
}

export const enUS: HistoryDict = {
  dialogTitle: "History",
  dialogAria: "Conversation history",
  dialogDescription: "Find and open past conversations.",
  multiSelect: "Select",
  selectDone: "Done",
  newConversation: "New conversation",
  searchAria: "Search conversation history",
  searchPlaceholder: "Search history…",
  selectAll: "Select all",
  selectedPrefix: "Selected",
  selectedSuffix: "items",
  clearSelection: "Clear selection",
  selectItemAria: "Select {title}",
  emptyNoMatch: "No matching conversations",
  emptyDefault: "No conversations yet.",
  deleteConfirmTitle: "Delete {count} conversations?",
  deleteConfirmDescription:
    "Deleted conversations are removed from the list and cannot be restored.",
};

export const zhCN: HistoryDict = {
  dialogTitle: "历史会话",
  dialogAria: "历史会话",
  dialogDescription: "查找并打开历史会话。",
  multiSelect: "多选",
  selectDone: "完成",
  newConversation: "新建会话",
  searchAria: "查找历史会话",
  searchPlaceholder: "查找历史会话……",
  selectAll: "全选",
  selectedPrefix: "已选择",
  selectedSuffix: "项",
  clearSelection: "取消选择",
  selectItemAria: "选择 {title}",
  emptyNoMatch: "未找到匹配的会话",
  emptyDefault: "还没有历史会话。",
  deleteConfirmTitle: "删除 {count} 个会话？",
  deleteConfirmDescription: "删除后会话将从列表中移除，无法恢复。",
};
