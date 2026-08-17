// Protocol：wire 2 公共事件、负载与渲染辅助（工具分类 / interrupt 投影）。
export type * from "./protocol/events.js";
export {
  classifyToolKind,
  formatToolRunningLabel,
  projectInterrupt,
  toolDisplayName,
} from "./protocol/events.js";

// 产品实体（会话 / 消息 / 快照 / 复核）。
// 注意：entities 的 RunStatus（queued | … | needs_review）与 state 层 view-types 的
// RunStatus（idle | …）同名不同义，包根部把实体侧别名导出为 ConversationRunStatus。
export type {
  AgentScenarioId,
  AttachmentKind,
  Conversation,
  ConversationMessage,
  ConversationTurn,
  MessageAttachment,
  RunArtifact,
  RunSnapshot,
  RunStep,
  SentMessage,
  SkillId,
  TaskReviewDecision,
  TaskReviewDecisionResponse,
  TaskReviewRequest,
} from "./protocol/entities.js";
export type { RunStatus as ConversationRunStatus } from "./protocol/entities.js";

// State：事件流 → 块时间线视图（reducer 纯函数 + external store + 草稿注册表）。
// view-types 的 BlockKind 是视图层判别联合（含 browser/agent），与 wire 的
// protocol BlockKind（8 种事件块）同名不同义 —— 根部导出时别名为 ViewBlockKind。
export type {
  ActiveInterrupt,
  AgentBlock,
  ArtifactView,
  BrowserAction,
  ConnectionState,
  InterruptBlock,
  RecoveryFailure,
  RunBlock,
  RunStatus,
  RunViewState,
  TaskReviewFailure,
  TaskReviewViewState,
  TodoItem,
  TodoLifecycle,
  ToolBlock,
  ToolStatus,
} from "./state/view-types.js";
// 与块组件同名的视图类型加 View 后缀导出。
export type {
  BrowserBlock as BrowserBlockView,
  ReasoningBlock as ReasoningBlockView,
  SandboxBlock as SandboxBlockView,
  TextBlock as TextBlockView,
} from "./state/view-types.js";
export type { BlockKind as ViewBlockKind } from "./state/view-types.js";
export { emptyRunState } from "./state/view-types.js";
export { reduceAll, reduceEvent } from "./state/reducer.js";
export type { CreateRunStoreOptions, RunStore } from "./state/store.js";
export {
  createFrozenStore,
  createRunStore,
  RunSequenceError,
  RunStoreContext,
  useRunState,
  useRunStore,
} from "./state/store.js";
export { clearAllDrafts, clearDraft, readDraft, writeDraft } from "./state/draft-registry.js";

// i18n：分域字典 + LocaleProvider。
export type * from "./i18n/index.js";
export { dictionaries } from "./i18n/index.js";
export type { LocaleContextValue, LocaleProviderProps } from "./i18n/locale-context.js";
export { interpolate, LocaleProvider, localeDictionaries, useLocale } from "./i18n/locale-context.js";

// Runtime：Run 控制器与会话注册表骨架（Wave 0 仅 mock 模式）。
export type {
  AgentRunController,
  RunPlayerLike,
  RunRuntime,
  RunRuntimeConfig,
  RunRuntimeUpdate,
} from "./runtime/runRuntime.js";
export { createRunRuntime } from "./runtime/runRuntime.js";
export type {
  ConversationRuntimeDescriptor,
  ConversationRuntimeEntry,
} from "./runtime/ConversationRuntimeProvider.js";
export {
  ConversationRuntimeProvider,
  useConversationRuntime,
  useConversationRuntimeRegistry,
} from "./runtime/ConversationRuntimeProvider.js";

// Hooks。
export { useResolvedTheme } from "./hooks/useResolvedTheme.js";
export { useRunArtifactsSync } from "./hooks/useRunArtifactsSync.js";
export { useStickToBottom } from "./hooks/useStickToBottom.js";
export { useTypewriter } from "./hooks/useTypewriter.js";

// Mock：事件播放器 + 双语演示剧本。
export { createRunPlayer, type PlaybackStep, type PlayerPhase, type RunPlayer } from "./mock/player.js";
export { buildScenarios, type Scenario } from "./mock/scripts.js";

// Markdown 与富内容（chart/mermaid/svg/html 围栏）。
export { StreamingMarkdown } from "./markdown/StreamingMarkdown.js";
export {
  isRichFenceLang,
  RICH_FENCE_LANGS,
  type RichFenceLang,
} from "./components/blocks/rich-content.js";
export { renderRichFence } from "./components/blocks/richFence.js";
export {
  downloadCsv,
  parseChartSpec,
  sanitizeSvg,
  specToCsv,
  VIZ_PALETTE,
  wrapHtml,
  type ChartParseError,
  type ChartParseErrorReason,
  type ChartParseResult,
  type ChartSeries,
  type ChartSpec,
  type ChartType,
} from "./components/blocks/rich-content.js";
export { ChartBlock } from "./components/blocks/ChartBlock.js";
export { MermaidBlock } from "./components/blocks/MermaidBlock.js";
export { RichBlock } from "./components/blocks/RichBlock.js";
export { Seg, TBtn, VizCard, type SegOption } from "./components/blocks/viz-card.js";

// 块组件（与 state 视图类型同名者按值/类型双空间共存导出）。
export { BrowserBlock } from "./components/blocks/BrowserBlock.js";
export { ExecToolBlock } from "./components/blocks/ExecToolBlock.js";
export { InterruptBlockCard } from "./components/blocks/InterruptBlockCard.js";
export { ReasoningBlock } from "./components/blocks/ReasoningBlock.js";
export { SandboxBlock } from "./components/blocks/SandboxBlock.js";
export { SubagentBlock } from "./components/blocks/SubagentBlock.js";
export { TextBlock } from "./components/blocks/TextBlock.js";
export { ToolCallBlock } from "./components/blocks/ToolCallBlock.js";

// Run 组件（时间线 / 卡片 / 容器）。
export { AgentActions } from "./components/AgentActions.js";
export { ArtifactCard } from "./components/ArtifactCard.js";
export {
  ArtifactPanel,
  artifactDownloadable,
  downloadArtifact,
  kindLabel,
} from "./components/ArtifactPanel.js";
export { ConnectionBanner } from "./components/ConnectionBanner.js";
export { ContentModal } from "./components/ContentModal.js";
export { ContextCompaction } from "./components/ContextCompaction.js";
export {
  ConversationArtifactsMenu,
  type ConversationArtifactEntry,
} from "./components/ConversationArtifactsMenu.js";
export { EvidenceList } from "./components/EvidenceList.js";
export { EvidenceMarker } from "./components/EvidenceMarker.js";
export { ImageLightbox } from "./components/ImageLightbox.js";
export { InterruptCard } from "./components/InterruptCard.js";
export { ProcessGroup } from "./components/ProcessGroup.js";
export { renderBlock, type RenderBlockOptions } from "./components/renderBlock.js";
export { RunErrorCard } from "./components/RunErrorCard.js";
export { RunThread, type PanelTarget, type Turn } from "./components/RunThread.js";
export { RunTimeline } from "./components/RunTimeline.js";
export { SubagentPanel } from "./components/SubagentPanel.js";
export {
  SubagentPanelContext,
  type SubagentPanelValue,
} from "./components/subagent-panel-context.js";
export { TaskProgressCard } from "./components/TaskProgressCard.js";
export { TaskReviewCard } from "./components/TaskReviewCard.js";
export { ThreadComposer, type QueuedMessage } from "./components/ThreadComposer.js";
export { ThreadNav, type ThreadNavItem } from "./components/ThreadNav.js";
export { TodoPanel } from "./components/TodoPanel.js";
export { UserMessage } from "./components/UserMessage.js";

// 右侧面板外壳。
export { ResizablePanel } from "./components/panels/ResizablePanel.js";
export { RightPanel, useRightPanel } from "./components/panels/RightPanel.js";

// 共享小组件。
export { CodeView } from "./components/shared/CodeView.js";
export { IconButton } from "./components/shared/IconButton.js";
export { NavItemLabel } from "./components/shared/NavItemLabel.js";
export {
  RunStatusTag,
  VisibilityTag,
  type VisibilityScope,
} from "./components/shared/Tags.js";

// Composer（Tiptap 富文本输入 + 附件 mock 上传）。
export {
  allAttachmentsReady,
  attachmentReducer,
  readyInputFileIds,
  toMessageAttachments,
  type AttachmentAction,
  type AttachmentStatus,
  type ComposerAttachment,
} from "./composer/attachmentState.js";
export {
  useComposerConfig,
  type ComposerConfig,
  type ComposerConfigState,
  type ComposerEffortOption,
  type ComposerSkillEntry,
  type ThinkingEffort,
} from "./composer/composerConfig.js";
export { Composer, type ComposerSubmit } from "./composer/Composer.js";
export {
  cancelTemporaryInput,
  getTemporaryInput,
  uploadTemporaryInput,
  type MockTemporaryInput,
  type MockUploadCallbacks,
} from "./composer/mockUpload.js";

// shadcn/ui 原语。
export { Alert, AlertDescription, AlertTitle, alertVariants } from "./components/ui/alert.js";
export { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar.js";
export { Badge, badgeVariants, type BadgeProps } from "./components/ui/badge.js";
export { Button, buttonVariants, type ButtonProps } from "./components/ui/button.js";
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card.js";
export { Checkbox } from "./components/ui/checkbox.js";
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./components/ui/collapsible.js";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog.js";
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu.js";
export { HoverCard, HoverCardContent, HoverCardTrigger } from "./components/ui/hover-card.js";
export { Input } from "./components/ui/input.js";
export { Progress } from "./components/ui/progress.js";
export { ScrollArea, ScrollBar } from "./components/ui/scroll-area.js";
export { Separator } from "./components/ui/separator.js";
export { Skeleton } from "./components/ui/skeleton.js";
export { Textarea } from "./components/ui/textarea.js";
export { ToggleGroup, ToggleGroupItem, toggleGroupVariants } from "./components/ui/toggle-group.js";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip.js";

// 工具函数。
export { cn, formatBytes, formatCostMicro, formatNumber, formatSeconds } from "./lib/utils.js";
