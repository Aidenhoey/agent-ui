import { Download, FileText, Maximize2 } from "lucide-react";
import { useState } from "react";

import { useLocale } from "../i18n/locale-context.js";
import type { ThreadDict } from "../i18n/dict/thread.js";
import { formatBytes } from "../lib/utils.js";
import type { ArtifactView } from "../state/view-types.js";
import { ContentModal } from "./ContentModal.js";
import { RightPanel } from "./panels/RightPanel.js";
import { Button } from "./ui/button.js";

/** 类型标签：文档 / 表格 / 其它（与 ArtifactCard 一致）；文案由字典注入。 */
export function kindLabel(path: string, kinds: ThreadDict["artifactPanel"]["kinds"]): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["csv", "tsv", "xlsx", "xls"].includes(ext)) return kinds.sheet;
  if (ext === "md" || ext === "markdown") return kinds.document;
  if (ext === "pdf") return kinds.pdf;
  return ext ? ext.toUpperCase() : kinds.file;
}

/**
 * 产物的内存下载（替代 SRC shared/api 的 downloadRunArtifact）：
 * 定稿产物直接锚点 download_url（mock 下为 blob/data URL；跨域直链时 download
 * 属性被忽略、退化为打开）；草稿（仅内存预览文本）退化为文本导出。
 */
export function downloadArtifact(artifact: ArtifactView): void {
  const fileName = artifact.logical_path.split("/").pop() ?? artifact.logical_path;
  const anchor = document.createElement("a");
  if (artifact.committed && artifact.download_url !== undefined) {
    anchor.href = artifact.download_url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }
  if (artifact.preview_content !== undefined && typeof URL.createObjectURL === "function") {
    const url = URL.createObjectURL(new Blob([artifact.preview_content], { type: "text/plain;charset=utf-8" }));
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}

/** 定稿走 download_url 直链，或草稿有内联预览文本时可下载。 */
export function artifactDownloadable(artifact: ArtifactView): boolean {
  return (artifact.committed && artifact.download_url !== undefined)
    || artifact.preview_content !== undefined;
}

/**
 * 右侧产物预览面板（点击产物卡打开）。会话内天然只读。
 *
 * 裁剪版（相对 SRC）：砍掉 FileWorkspace / FileTypeRouter / blob 预览 /
 * 「保存到项目」/ react-router 依赖，保留产物列表（同会话产物切换）与文本内容
 * 预览（agent-code-view 内联 + ContentModal 全量展开）；下载改为内存实现。
 */
export function ArtifactPanel({
  artifact,
  width,
  artifacts,
  onOpen,
  onClose,
  onWidthChange,
}: {
  artifact: ArtifactView;
  width: number;
  artifacts?: ArtifactView[];
  onOpen?: (artifact: ArtifactView) => void;
  onClose: () => void;
  onWidthChange?: ((width: number) => void) | undefined;
}) {
  const { dict } = useLocale();
  const t = dict.thread.artifactPanel;
  const [modalOpen, setModalOpen] = useState(false);

  const fileName = artifact.logical_path.split("/").pop() ?? artifact.logical_path;
  const all = artifacts ?? [artifact];
  const statusLabel = artifact.committed ? dict.blocks.artifact.committed : dict.blocks.artifact.draft;
  const downloadable = artifactDownloadable(artifact);

  const preview = artifact.preview_content !== undefined ? (
    <div className="agent-code-view">
      <div className="agent-code-view__bar">
        <span className="agent-code-view__lang">{kindLabel(artifact.logical_path, t.kinds)}</span>
        {artifact.truncated ? (
          <span className="agent-code-view__lang">{dict.blocks.artifact.truncated}</span>
        ) : null}
      </div>
      <pre className="agent-code-view__pre">
        <code>{artifact.preview_content}</code>
      </pre>
    </div>
  ) : (
    <p className="agent-subagent-panel__empty">{t.noInlinePreview}</p>
  );

  return (
    <RightPanel
      open
      width={width}
      onClose={onClose}
      onWidthChange={onWidthChange}
      className="agent-artifact-panel"
      ariaLabelledBy="artifact-file-title"
    >
      <RightPanel.Header
        icon={<FileText aria-hidden="true" />}
        title={fileName}
        subtitle={t.location}
        titleId="artifact-file-title"
        closeLabel={t.close}
      />

      <RightPanel.Meta>
        <span data-committed={artifact.committed ? "" : undefined} className="agent-artifact__tag">
          {kindLabel(artifact.logical_path, t.kinds)} · {statusLabel}
        </span>
        {typeof artifact.size_bytes === "number" ? (
          <span className="right-panel__time">{formatBytes(artifact.size_bytes)}</span>
        ) : null}
      </RightPanel.Meta>

      <RightPanel.Body>
        <div className="agent-subagent-panel__body">
          {all.length > 1 ? (
            <section>
              <h3 className="agent-subagent-panel__section-title">{t.listTitle}</h3>
              <div className="agent-artifacts">
                {all.map((item) => (
                  <button
                    key={item.block_id}
                    type="button"
                    className="agent-artifact"
                    data-active={item.block_id === artifact.block_id ? "" : undefined}
                    onClick={() => onOpen?.(item)}
                  >
                    <span className="agent-artifact__icon">
                      <FileText className="size-4.5" />
                    </span>
                    <span className="agent-artifact__body">
                      <span className="agent-artifact__name" title={item.logical_path}>{item.logical_path}</span>
                      <span className="agent-artifact__meta">
                        <span data-committed={item.committed ? "" : undefined} className="agent-artifact__tag">
                          {item.committed ? dict.blocks.artifact.committed : dict.blocks.artifact.draft}
                        </span>
                        {typeof item.size_bytes === "number" ? ` · ${formatBytes(item.size_bytes)}` : ""}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="agent-subagent-panel__section-title">{t.previewTitle}</h3>
            {preview}
          </section>
        </div>
      </RightPanel.Body>

      <RightPanel.Footer>
        {artifact.preview_content !== undefined ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            <Maximize2 data-icon="inline-start" aria-hidden="true" />{dict.common.expand}
          </Button>
        ) : null}
        {downloadable ? (
          <Button type="button" variant="outline" size="sm" onClick={() => downloadArtifact(artifact)}>
            <Download data-icon="inline-start" aria-hidden="true" />{dict.common.download}
          </Button>
        ) : null}
      </RightPanel.Footer>

      <ContentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        overline={t.location}
        title={fileName}
        {...(downloadable
          ? { actionLabel: dict.common.download, onAction: () => downloadArtifact(artifact) }
          : {})}
      >
        {preview}
      </ContentModal>
    </RightPanel>
  );
}
