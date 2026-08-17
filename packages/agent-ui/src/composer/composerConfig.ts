import { useMemo } from "react";

import { useLocale } from "../i18n/locale-context.js";
import type { ComposerDict } from "../i18n/index.js";

/** 思考强度档位闭枚举（对齐契约 ThinkingEffort / RuntimeProtocol RunInput.effort）。 */
export type ThinkingEffort = "low" | "medium" | "high" | "max";

export interface ComposerEffortOption {
  id: string;
  label: string;
}

/** 动态目录中的单个 Skill 条目（复刻版来自字典的双语本地目录）。 */
export interface ComposerSkillEntry {
  id: string;
  label: string;
  description: string;
}

/**
 * composer 运行配置。复刻版为本地常量配置：无后端下发、无缓存/ETag/inflight，
 * skill 目录与档位 label 从字典（useLocale）读取，随 locale 切换。
 */
export interface ComposerConfig {
  efforts: ComposerEffortOption[];
  defaultEffort: string | null;
  skills: ComposerSkillEntry[];
  skillDirectoryVersion: string;
  /** 语音输入能力门禁；复刻版砍掉语音输入，恒为 false（fail-closed）。 */
  voiceInputEnabled: boolean;
  /** 单次语音输入最长秒数；语音已砍，仅保留字段形状。 */
  voiceInputMaxDurationSeconds: number;
}

/** 本地档位表（id 顺序即下拉顺序）与默认档，对齐 SRC mock 的 /v1/composer-config fixture。 */
const EFFORT_LEVELS: ThinkingEffort[] = ["low", "medium", "high", "max"];
const DEFAULT_EFFORT: ThinkingEffort = "high";

export interface ComposerConfigState {
  config: ComposerConfig | null;
  /** 目录正在刷新；本地配置恒为 false，保留字段以兼容 Composer 的分支结构。 */
  loading: boolean;
  /** 首次请求失败且没有 last-known-good；本地配置恒为 false。 */
  loadFailed: boolean;
  /** 强制刷新目录；本地配置为 no-op。 */
  refresh: () => void;
}

const noop = () => {};

/** 字典 → ComposerConfig 的唯一映射点：档位 label 未知 id 回退 id 本身（前向兼容）。 */
function buildComposerConfig(t: ComposerDict): ComposerConfig {
  return {
    efforts: EFFORT_LEVELS.map((id) => ({ id, label: t.effort.levels[id] ?? id })),
    defaultEffort: DEFAULT_EFFORT,
    skills: t.skills,
    skillDirectoryVersion: "local-v1",
    voiceInputEnabled: false,
    voiceInputMaxDurationSeconds: 120,
  };
}

/** React 侧入口：本地常量配置首帧即可用（选择器不经过加载态）。 */
export function useComposerConfig(): ComposerConfigState {
  const { dict } = useLocale();
  const config = useMemo<ComposerConfig>(() => buildComposerConfig(dict.composer), [dict]);
  return { config, loading: false, loadFailed: false, refresh: noop };
}
