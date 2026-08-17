/**
 * common 域：跨组件通用动作文案。
 * 约定：组件渲染的一切字符串都来自字典（或 labels 覆盖），不在 JSX 里硬编码；
 * `{placeholder}` 由 interpolate 填充。
 */
export interface CommonDict {
  expand: string;
  collapse: string;
  expandAll: string;
  copy: string;
  copied: string;
  retry: string;
  cancel: string;
  confirm: string;
  delete: string;
  save: string;
  saving: string;
  saved: string;
  close: string;
  download: string;
  edit: string;
}

export const enUS: CommonDict = {
  expand: "Expand",
  collapse: "Collapse",
  expandAll: "Expand all",
  copy: "Copy",
  copied: "Copied",
  retry: "Retry",
  cancel: "Cancel",
  confirm: "Confirm",
  delete: "Delete",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  close: "Close",
  download: "Download",
  edit: "Edit",
};

export const zhCN: CommonDict = {
  expand: "展开",
  collapse: "收起",
  expandAll: "展开全部",
  copy: "复制",
  copied: "已复制",
  retry: "重试",
  cancel: "取消",
  confirm: "确认",
  delete: "删除",
  save: "保存",
  saving: "保存中…",
  saved: "已保存",
  close: "关闭",
  download: "下载",
  edit: "编辑",
};
