import { Download, FileText, Files } from "lucide-react";
import { useRef, useSyncExternalStore } from "react";

import { interpolate, useLocale } from "../i18n/locale-context.js";
import { formatBytes } from "../lib/utils.js";
import type { RunStore } from "../state/store.js";
import type { ArtifactView } from "../state/view-types.js";
import { artifactDownloadable, downloadArtifact, kindLabel } from "./ArtifactPanel.js";
import type { PanelTarget, Turn } from "./RunThread.js";
import { IconButton } from "./shared/IconButton.js";
import { Button } from "./ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.js";

/** 跨轮聚合的一条产物条目：产物 + 所属轮（打开面板/行内下载都要回到来源 store）。 */
export interface ConversationArtifactEntry {
  turnId: string;
  /** 轮次序号（从 1 起，仅展示用）。 */
  turnIndex: number;
  store: RunStore;
  artifact: ArtifactView;
}

/**
 * 聚合所有轮 store 的 state.artifacts。store 是 external store、artifacts 数组不可变，
 * 用引用比较做快照缓存：无变化时复用旧数组，避免 useSyncExternalStore 死循环。
 */
function useConversationArtifacts(turns: Turn[]): ConversationArtifactEntry[] {
  const cacheRef = useRef<{
    sources: readonly (readonly ArtifactView[])[];
    entries: ConversationArtifactEntry[];
  } | null>(null);

  return useSyncExternalStore(
    (notify) => {
      const unsubscribes = turns.map((turn) => turn.store.subscribe(notify));
      return () => {
        for (const unsubscribe of unsubscribes) unsubscribe();
      };
    },
    () => {
      const sources = turns.map((turn) => turn.store.getState().artifacts);
      const cache = cacheRef.current;
      if (
        cache
        && cache.sources.length === sources.length
        && cache.sources.every((source, index) => source === sources[index])
      ) {
        return cache.entries;
      }
      const entries: ConversationArtifactEntry[] = [];
      turns.forEach((turn, index) => {
        for (const artifact of turn.store.getState().artifacts) {
          entries.push({ turnId: turn.id, turnIndex: index + 1, store: turn.store, artifact });
        }
      });
      cacheRef.current = { sources, entries };
      return entries;
    },
  );
}

/**
 * 会话级产物入口（头部操作区下拉浮层）：聚合各轮产物，点击项打开右侧预览面板。
 * 常显；无产物时置灰，hover 说明原因。浮层限高滚动；选择产物后浮层保持展开，
 * 便于连续切换/下载，当前打开项以 data-current 高亮。
 *
 * 与 SRC 的差异：行内下载走 ArtifactPanel 的内存 downloadArtifact（无 REST）。
 */
export function ConversationArtifactsMenu({
  turns,
  active,
  onOpenArtifact,
}: {
  turns: Turn[];
  /** 当前在右侧面板打开的产物（turnId + block_id），用于浮层高亮。 */
  active?: PanelTarget | null | undefined;
  onOpenArtifact: (turnId: string, store: RunStore, artifact: ArtifactView) => void;
}) {
  const { dict } = useLocale();
  const t = dict.thread.artifactsMenu;
  const entries = useConversationArtifacts(turns);
  const empty = entries.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={empty}
          title={empty ? t.emptyTitle : undefined}
          className="conversation-header__artifacts"
        >
          <Files data-icon="inline-start" aria-hidden="true" />
          {t.label}{empty ? "" : ` ${entries.length}`}
        </Button>
      </DropdownMenuTrigger>
      {empty ? null : (
        <DropdownMenuContent align="end" className="conversation-artifacts-menu">
          <DropdownMenuLabel>{t.menuLabel}</DropdownMenuLabel>
          {entries.map((entry) => {
            const { artifact } = entry;
            const current = active?.turnId === entry.turnId && active.id === artifact.block_id;
            return (
              <DropdownMenuItem
                key={`${entry.turnId}:${artifact.block_id}`}
                className="conversation-artifacts-menu__item"
                data-current={current ? "" : undefined}
                onSelect={(event) => {
                  // 浮层保持展开：选择只驱动右侧面板，便于连续切换产物。
                  event.preventDefault();
                  onOpenArtifact(entry.turnId, entry.store, artifact);
                }}
              >
                <FileText data-icon="inline-start" aria-hidden="true" />
                <span className="conversation-artifacts-menu__text">
                  <strong title={artifact.logical_path}>{artifact.logical_path}</strong>
                  <small>
                    {kindLabel(artifact.logical_path, dict.thread.artifactPanel.kinds)}
                    {typeof artifact.size_bytes === "number" ? ` · ${formatBytes(artifact.size_bytes)}` : ""}
                    {` · ${interpolate(t.turnIndex, { n: entry.turnIndex })}`}
                    {artifact.committed ? "" : ` · ${dict.blocks.artifact.draft}`}
                  </small>
                </span>
                <IconButton
                  label={interpolate(t.download, { name: artifact.logical_path })}
                  size="small"
                  disabled={!artifactDownloadable(artifact)}
                  onClick={(event) => {
                    // 行内下载不触发菜单项的 onSelect（不开面板），浮层保持展开便于连续下载。
                    event.stopPropagation();
                    event.preventDefault();
                    downloadArtifact(artifact);
                  }}
                >
                  <Download aria-hidden="true" />
                </IconButton>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
