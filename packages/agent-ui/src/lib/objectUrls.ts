import type { MessageAttachment } from "../protocol/entities.js";

const isBlobUrl = (url?: string): url is string => typeof url === "string" && url.startsWith("blob:");

/** 收集附件列表中图片的 blob ObjectURL（mock 附件无 url 或非 blob，天然被排除）。 */
export function collectImageUrls(attachments?: MessageAttachment[]): Set<string> {
  const urls = new Set<string>();
  for (const attachment of attachments ?? []) {
    if (attachment.kind === "image" && isBlobUrl(attachment.url)) urls.add(attachment.url);
  }
  return urls;
}

/** 释放附件列表中未被 protectedUrls 引用的图片 blob URL。URL.revokeObjectURL 幂等，重复 revoke 为 no-op。 */
export function revokeAttachmentUrls(attachments?: MessageAttachment[], protectedUrls?: ReadonlySet<string>): void {
  for (const attachment of attachments ?? []) {
    if (attachment.kind === "image" && isBlobUrl(attachment.url) && !protectedUrls?.has(attachment.url)) {
      URL.revokeObjectURL(attachment.url);
    }
  }
}
