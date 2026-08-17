// 模块级内存草稿注册表：SPA 会话内存活、刷新即清。
// 草稿按稳定业务身份建键（interrupt_id / conversationId+消息 id），切换会话不串用。
// 键约定：interrupt 草稿用 `interrupt:{interrupt_id}`（interrupt_id 全局唯一）；
// 消息编辑草稿用 `msg-edit:{draftKey}`（draftKey 由调用方传 `conversationId:turnId`）。
const drafts = new Map<string, unknown>();

export function readDraft<T>(key: string): T | undefined {
  return drafts.get(key) as T | undefined;
}

export function writeDraft(key: string, value: unknown): void {
  drafts.set(key, value);
}

export function clearDraft(key: string): void {
  drafts.delete(key);
}

/** 仅测试用：清空全部草稿，避免用例间串扰。 */
export function clearAllDrafts(): void {
  drafts.clear();
}
