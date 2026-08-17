import { Check, Copy, File, FileSpreadsheet, FileText, Pencil, Puzzle } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { interpolate, useLocale } from "../i18n/locale-context.js";
import type { MessageAttachment } from "../protocol/entities.js";
import { clearDraft, readDraft, writeDraft } from "../state/draft-registry.js";
import { ImageLightbox } from "./ImageLightbox.js";
import { Badge } from "./ui/badge.js";

/** 气泡内容超过该高度（px）则折叠，露出"展开全部"。 */
const COLLAPSE_MAX = 208;
/** 图片网格最多平铺的缩略图数，超出在末格叠加 "+N"。 */
const MAX_THUMBS = 4;

export function UserMessage({
  text,
  attachments,
  skillId,
  skillLabel,
  onEdit,
  draftKey,
}: {
  text: string;
  attachments?: MessageAttachment[];
  skillId?: string | undefined;
  skillLabel?: string | undefined;
  onEdit?: ((newText: string) => void) | undefined;
  /** 草稿键（`conversationId:turnId`）：存在时编辑态/文本按此键内存保留，SPA 导航后恢复。 */
  draftKey?: string | undefined;
}) {
  const { dict } = useLocale();
  // 本地 object URL 只在发送前预览；发送后的历史回显不恢复 blob URL，
  // 因而没有持久 URL 的图片按普通文件卡展示。
  const images = attachments?.filter((a) => a.kind === "image" && Boolean(a.url)) ?? [];
  const files = attachments?.filter((a) => a.kind === "file" || (a.kind === "image" && !a.url)) ?? [];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const hasAttachments = images.length > 0 || files.length > 0;
  const shownImages = images.slice(0, MAX_THUMBS);
  const extraImages = images.length - shownImages.length;

  const editDraftKey = draftKey ? `msg-edit:${draftKey}` : undefined;
  const [editing, setEditing] = useState(
    () => (editDraftKey ? readDraft<{ editing?: boolean }>(editDraftKey)?.editing ?? false : false),
  );
  const [editText, setEditText] = useState(
    () => (editDraftKey ? readDraft<{ editText?: string }>(editDraftKey)?.editText ?? "" : ""),
  );
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  // 完成态抑制位：取消/发送同步置位后，setEditing 触发的 write-through effect 重跑见此位直接跳过，
  // 不再把 {editing:false, editText} 残留项写回草稿（防内存泄漏）；重新进入编辑时复位以重新积累。
  const doneRef = useRef(false);

  // write-through：编辑态/文本变化即同步草稿；取消/发送时先 clearDraft。
  useEffect(() => {
    if (editDraftKey && !doneRef.current) writeDraft(editDraftKey, { editing, editText });
  }, [editDraftKey, editing, editText]);

  const enterEdit = () => {
    doneRef.current = false;
    setEditText(text);
    setEditing(true);
  };

  const cancelEdit = () => {
    if (editDraftKey) {
      doneRef.current = true;
      clearDraft(editDraftKey);
    }
    setEditing(false);
    setEditText("");
  };

  const submitEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    if (editDraftKey) {
      doneRef.current = true;
      clearDraft(editDraftKey);
    }
    setEditing(false);
    onEdit?.(trimmed);
  };

  const copy = () => {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="agent-user">
      {skillId ? (
        <div className="agent-user__skills" aria-label={dict.thread.userMessage.skillRegionAria}>
          <Badge variant="outline" className="tag tag--outline composer__skill-chip">
            <Puzzle aria-hidden="true" />
            {skillLabel ?? skillId}
          </Badge>
        </div>
      ) : null}
      {hasAttachments ? (
        <div className="agent-user__attachments">
          {images.length > 0 ? (
            <div className="agent-user__images" data-count={shownImages.length}>
              {shownImages.map((image, index) => (
                <button
                  type="button"
                  key={image.id}
                  className="agent-user__image"
                  onClick={() => setLightboxIndex(index)}
                  aria-label={interpolate(dict.thread.userMessage.viewImage, { name: image.name })}
                >
                  <img src={image.url} alt={image.name} loading="lazy" />
                  {index === MAX_THUMBS - 1 && extraImages > 0 ? (
                    <span className="agent-user__image-more" aria-hidden="true">+{extraImages}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          {files.length > 0 ? (
            <div className="agent-user__files">
              {files.map((file) => (
                <FileCard key={file.id} file={file} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <div className="agent-user__edit">
          <textarea
            className="agent-user__edit-textarea"
            value={editText}
            onChange={(event) => setEditText(event.target.value)}
            autoFocus
            aria-label={dict.thread.userMessage.editAria}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                submitEdit();
              }
              if (event.key === "Escape") cancelEdit();
            }}
          />
          <div className="agent-user__edit-actions">
            <button type="button" className="agent-user__edit-cancel" onClick={cancelEdit}>{dict.common.cancel}</button>
            <button
              type="button"
              className="agent-user__edit-submit"
              onClick={submitEdit}
              disabled={!editText.trim()}
            >
              {dict.thread.userMessage.send}
            </button>
          </div>
        </div>
      ) : (
        <>
          {text ? <CollapsibleBubble text={text} /> : null}
          {onEdit ? (
            <div className="agent-user__actions">
              <button type="button" className="agent-action" onClick={enterEdit} aria-label={dict.thread.userMessage.editAria}>
                <Pencil className="size-3.5" /> {dict.common.edit}
              </button>
              <button type="button" className="agent-action" onClick={copy} aria-label={dict.thread.userMessage.copyAria}>
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? dict.common.copied : dict.common.copy}
              </button>
            </div>
          ) : null}
        </>
      )}

      {lightboxIndex !== null ? (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </div>
  );
}

/** 按扩展名/类型标签挑图标与配色槽（data-type 驱动 CSS 着色）。 */
function fileVisual(file: MessageAttachment) {
  const type = (file.fileType ?? file.name.split(".").pop() ?? "").toLowerCase();
  if (type === "xlsx" || type === "xls" || type === "csv") return { Icon: FileSpreadsheet, slot: "sheet" };
  if (type === "pdf") return { Icon: FileText, slot: "pdf" };
  if (type === "doc" || type === "docx") return { Icon: FileText, slot: "doc" };
  return { Icon: File, slot: "generic" };
}

function FileCard({ file }: { file: MessageAttachment }) {
  const { Icon, slot } = fileVisual(file);
  const sub = [file.fileType, file.size].filter(Boolean).join(" · ");
  return (
    <div className="agent-user__file">
      <span className="agent-user__file-icon" data-type={slot}>
        <Icon aria-hidden="true" />
      </span>
      <span className="agent-user__file-meta">
        <span className="agent-user__file-name" title={file.name}>{file.name}</span>
        {sub ? <span className="agent-user__file-sub">{sub}</span> : null}
      </span>
    </div>
  );
}

function CollapsibleBubble({ text }: { text: string }) {
  const { dict } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const [collapsible, setCollapsible] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // scrollHeight 反映完整内容高度（即便已被 max-height 裁剪），据此判断是否需要折叠。
    setCollapsible(el.scrollHeight > COLLAPSE_MAX + 12);
  }, [text]);

  const clipped = collapsible && collapsed;

  return (
    <div className="agent-user__bubble-wrap">
      <div
        ref={ref}
        className={`agent-user__bubble${clipped ? " agent-user__bubble--clipped" : ""}`}
        style={clipped ? { maxHeight: COLLAPSE_MAX } : undefined}
      >
        {text}
      </div>
      {collapsible ? (
        <button type="button" className="agent-user__toggle" onClick={() => setCollapsed((v) => !v)}>
          {collapsed ? dict.common.expandAll : dict.common.collapse}
        </button>
      ) : null}
    </div>
  );
}
