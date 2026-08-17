/**
 * sidebar 域：应用侧栏（brand 行 / 主导航 / 折叠 rail / 会话列表 / 多选批量条 / 账户区）
 * 与主题切换器（theme-switcher）的文案。
 *
 * 约定：组件渲染的一切字符串都来自字典，不在 JSX 里硬编码；
 * `{placeholder}` 由 interpolate 填充。
 */
export interface SidebarDict {
  /** <aside> 的无障碍名。 */
  mainNavAria: string;
  /** 主导航入口区（新建会话）的无障碍名。 */
  primaryNavAria: string;
  /** 折叠态 rail 导航区的无障碍名。 */
  railNavAria: string;
  expandSidebar: string;
  collapseSidebar: string;
  /** brand 按钮：回首页（新建会话）。 */
  backHomeAria: string;
  newConversation: string;
  /** 置顶会话 section / rail 菜单的标签。 */
  pinned: string;
  /** 会话 section / rail 菜单的标签。 */
  conversations: string;
  viewAll: string;
  /** 多选模式下 section 头的退出按钮。 */
  selectDone: string;
  /** section 折叠开关的 aria-label 模板：`折叠{section}`。 */
  collapseSection: string;
  /** section 展开开关的 aria-label 模板：`展开{section}`。 */
  expandSection: string;
  /** rail 会话菜单的空态。 */
  emptyConversations: string;
  /** 批量操作条计数文案（数字以 <strong> 夹在前后缀之间）：`已选择 3 项`。 */
  selectedPrefix: string;
  selectedSuffix: string;
  /** 批量删除确认框标题：`删除 {count} 个会话？`。 */
  batchDeleteTitle: string;
  /** 批量删除确认框描述（复刻无回收站：删除即移除，不可恢复）。 */
  batchDeleteDescription: string;
  /** 行内重命名输入框的 aria-label。 */
  renameConversationAria: string;
  /** 多选复选框的 aria-label 模板：`选择 {title}`。 */
  selectConversationAria: string;
  accountMenuAria: string;
  themeLabel: string;
  /** ThemeSwitcher ToggleGroup 的 aria-label。 */
  themeSelectAria: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  languageLabel: string;
  /** 语言选项按各自语言自名（endonym），两 locale 同值。 */
  languageEnglish: string;
  languageChinese: string;
}

export const enUS: SidebarDict = {
  mainNavAria: "Primary navigation",
  primaryNavAria: "Primary actions",
  railNavAria: "Collapsed navigation",
  expandSidebar: "Expand sidebar",
  collapseSidebar: "Collapse sidebar",
  backHomeAria: "Back to Agent UI home",
  newConversation: "New conversation",
  pinned: "Pinned",
  conversations: "Conversations",
  viewAll: "View all",
  selectDone: "Done",
  collapseSection: "Collapse {section}",
  expandSection: "Expand {section}",
  emptyConversations: "No conversations yet. Start a new one to begin.",
  selectedPrefix: "Selected",
  selectedSuffix: "items",
  batchDeleteTitle: "Delete {count} conversations?",
  batchDeleteDescription:
    "Deleted conversations are removed from the list and cannot be restored.",
  renameConversationAria: "Rename conversation",
  selectConversationAria: "Select {title}",
  accountMenuAria: "Account menu",
  themeLabel: "Theme",
  themeSelectAria: "Theme selection",
  themeLight: "Light theme",
  themeDark: "Dark theme",
  themeSystem: "System",
  languageLabel: "Language",
  languageEnglish: "English",
  languageChinese: "中文",
};

export const zhCN: SidebarDict = {
  mainNavAria: "主导航",
  primaryNavAria: "主要入口",
  railNavAria: "折叠导航",
  expandSidebar: "展开侧边栏",
  collapseSidebar: "折叠侧边栏",
  backHomeAria: "返回 Agent UI 首页",
  newConversation: "新建会话",
  pinned: "置顶",
  conversations: "会话",
  viewAll: "查看全部",
  selectDone: "完成",
  collapseSection: "折叠{section}",
  expandSection: "展开{section}",
  emptyConversations: "还没有会话，可以新建一个开始。",
  selectedPrefix: "已选择",
  selectedSuffix: "项",
  batchDeleteTitle: "删除 {count} 个会话？",
  batchDeleteDescription: "删除后会话将从列表中移除，无法恢复。",
  renameConversationAria: "重命名会话",
  selectConversationAria: "选择 {title}",
  accountMenuAria: "账户菜单",
  themeLabel: "主题",
  themeSelectAria: "主题选择",
  themeLight: "浅色主题",
  themeDark: "深色主题",
  themeSystem: "跟随系统",
  languageLabel: "语言",
  languageEnglish: "English",
  languageChinese: "中文",
};
