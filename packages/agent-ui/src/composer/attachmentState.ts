import type { MessageAttachment } from "../protocol/entities.js";

export type AttachmentStatus = "local" | "uploading" | "processing" | "ready" | "failed" | "cancelled";
export type AttachmentSource = "local" | "project";

/**
 * Composer 内部受控附件。pendingResourceId 只用于取消上传，resourceId 仅在 complete 后出现并可提交。
 * localFile 永不离开 Composer，也不会进入消息/Run 请求。
 */
export interface ComposerAttachment extends MessageAttachment {
  source: AttachmentSource;
  status: AttachmentStatus;
  localFile?: File;
  pendingResourceId?: string;
  resourceId?: string;
  error?: string;
}

export type AttachmentAction =
  | { type: "add"; attachment: ComposerAttachment }
  | { type: "start"; id: string }
  | { type: "session"; id: string; resourceId: string }
  | { type: "processing"; id: string }
  | { type: "ready"; id: string; resourceId: string }
  | { type: "failed"; id: string; error: string }
  /** error 由派发方注入本地化文案（字典在组件层，reducer 不硬编码）。 */
  | { type: "cancelled"; id: string; error: string }
  | { type: "unavailable"; id: string; error: string }
  | { type: "remove"; id: string }
  | { type: "reset" };

const update = (
  state: ComposerAttachment[],
  id: string,
  updater: (attachment: ComposerAttachment) => ComposerAttachment,
): ComposerAttachment[] => state.map((attachment) => (attachment.id === id ? updater(attachment) : attachment));

const restart = (attachment: ComposerAttachment): ComposerAttachment => {
  const {
    pendingResourceId: _pendingResourceId,
    resourceId: _resourceId,
    error: _error,
    ...rest
  } = attachment;
  return { ...rest, status: "uploading" };
};

const markReady = (attachment: ComposerAttachment, resourceId: string): ComposerAttachment => {
  const { pendingResourceId: _pendingResourceId, error: _error, ...rest } = attachment;
  return { ...rest, status: "ready", resourceId };
};

const markFailed = (attachment: ComposerAttachment, error: string): ComposerAttachment => {
  const { resourceId: _resourceId, ...rest } = attachment;
  return { ...rest, status: "failed", error };
};

export function attachmentReducer(
  state: ComposerAttachment[],
  action: AttachmentAction,
): ComposerAttachment[] {
  switch (action.type) {
    case "add":
      if (
        action.attachment.resourceId
        && state.some((item) => item.resourceId === action.attachment.resourceId)
      ) {
        return state;
      }
      return [...state, action.attachment];
    case "start":
      return update(state, action.id, restart);
    case "session":
      return update(state, action.id, (attachment) =>
        attachment.status === "uploading"
          ? { ...attachment, pendingResourceId: action.resourceId }
          : attachment,
      );
    case "processing":
      return update(state, action.id, (attachment) =>
        attachment.status === "uploading" ? { ...attachment, status: "processing" } : attachment,
      );
    case "ready":
      return update(state, action.id, (attachment) =>
        attachment.status === "uploading" || attachment.status === "processing"
          ? markReady(attachment, action.resourceId)
          : attachment,
      );
    case "failed":
      return update(state, action.id, (attachment) =>
        attachment.status === "cancelled"
          ? attachment
          : markFailed(attachment, action.error),
      );
    case "cancelled":
      return update(state, action.id, (attachment) => {
        const { url: _url, resourceId: _resourceId, ...rest } = attachment;
        return { ...rest, status: "cancelled", error: action.error };
      });
    case "unavailable":
      return update(state, action.id, (attachment) => markFailed(attachment, action.error));
    case "remove":
      return state.filter((attachment) => attachment.id !== action.id);
    case "reset":
      return [];
  }
}

export function readyInputFileIds(attachments: ComposerAttachment[]): string[] {
  return [...new Set(
    attachments
      .filter((attachment) => attachment.status === "ready" && attachment.resourceId)
      .map((attachment) => attachment.resourceId!),
  )].sort();
}

export function allAttachmentsReady(attachments: ComposerAttachment[]): boolean {
  return attachments.every((attachment) => attachment.status === "ready" && Boolean(attachment.resourceId));
}

/** 提交给消息展示的附件不携带 File、上传状态或资源 id，且不保留临时 blob URL。 */
export function toMessageAttachments(attachments: ComposerAttachment[]): MessageAttachment[] {
  return attachments.map(({ id, name, kind, fileType, size }) => ({
    id,
    name,
    kind,
    ...(fileType ? { fileType } : {}),
    ...(size ? { size } : {}),
  }));
}
