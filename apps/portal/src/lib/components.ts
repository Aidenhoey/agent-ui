/**
 * lib/components.ts —— 文档站组件目录的共享元数据（app 侧）。
 *
 * COMPONENT_ORDER 是侧导航 Components 组与组件索引的唯一顺序来源；条目名 /
 * 描述走库字典 components 域（dict.components.components[slug]），slug 类型
 * ComponentSlug 也从库导出，保证与路由 /components/:slug 一一对应。
 */

import { type ComponentSlug } from "@diribo/agent-ui";

export const COMPONENT_ORDER: readonly ComponentSlug[] = [
  "thread",
  "message",
  "reasoning",
  "tool-call",
  "sandbox",
  "interrupt",
  "todo",
  "evidence",
  "artifact",
  "rich-content",
  "process-group",
  "user-message",
  "composer",
  "cards",
];
