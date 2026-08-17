import { Check, CircleAlert, Clock3, Eye, LoaderCircle, LockKeyhole, Users } from "lucide-react";

import { Badge } from "../ui/badge.js";
import { interpolate, useLocale } from "../../i18n/locale-context.js";
import type { RunStatus } from "../../protocol/entities.js";

/**
 * 可见范围（会话/工作区共享粒度）。
 * SRC 定义于 entities/types.ts；本次复刻未将其迁入 protocol/entities（见该文件头注释），
 * 组件本地保留这一 UI 层类型。
 */
export type VisibilityScope = "private" | "project" | "members";

const statusMeta: Record<RunStatus, { tone: string; icon: typeof Check }> = {
  queued: { tone: "neutral", icon: Clock3 },
  running: { tone: "info", icon: LoaderCircle },
  waiting_for_user: { tone: "warning", icon: Clock3 },
  completed: { tone: "success", icon: Check },
  needs_review: { tone: "info", icon: Eye },
  failed: { tone: "danger", icon: CircleAlert },
  cancelled: { tone: "neutral", icon: CircleAlert },
};

export function RunStatusTag({ status }: { status: RunStatus }) {
  const { dict } = useLocale();
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`tag tag--${meta.tone}`}>
      <Icon aria-hidden="true" />
      {dict.blocks.runStatus[status]}
    </Badge>
  );
}

export function VisibilityTag({ visibility, memberCount = 0 }: { visibility: VisibilityScope; memberCount?: number }) {
  const { dict } = useLocale();
  const Icon = visibility === "private" ? LockKeyhole : visibility === "members" ? Users : Eye;
  const label =
    visibility === "project"
      ? dict.blocks.visibility.project
      : visibility === "members"
        ? interpolate(dict.blocks.visibility.members, { count: memberCount })
        : dict.blocks.visibility.private;
  return (
    <Badge variant="outline" className={`tag ${visibility === "project" ? "tag--neutral" : "tag--brand"}`}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
