import { AlertCircle, ArrowUp, Check, ChevronDown, FilePlus2, LoaderCircle, Paperclip, Plus, Puzzle, RotateCcw, Square, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";

import { Extension, type Editor } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";

import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu.js";
import { interpolate, useLocale } from "../i18n/locale-context.js";
import { revokeAttachmentUrls } from "../lib/objectUrls.js";
import type { MessageAttachment, SkillId } from "../protocol/entities.js";
import {
  allAttachmentsReady,
  attachmentReducer,
  readyInputFileIds,
  toMessageAttachments,
  type ComposerAttachment,
} from "./attachmentState.js";
import { useComposerConfig, type ComposerSkillEntry } from "./composerConfig.js";
import { cancelTemporaryInput, getTemporaryInput, uploadTemporaryInput } from "./mockUpload.js";
import { SKILL_NODE, SkillNode } from "./skillNode.js";

const fileTypeLabel = (name: string, fallback: string) => {
  const ext = name.split(".").pop();
  return ext && ext !== name ? ext.toUpperCase() : fallback;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * 从编辑器文档提取已插入的单一 skill id（单选语义：至多一个）。
 * 单一真源是编辑器文档 —— skill chip 即 inline 节点，不在外部另存 state。
 */
const extractSkillId = (doc: PmNode): string | null => {
  let found: string | null = null;
  doc.descendants((node) => {
    if (node.type.name === SKILL_NODE && node.attrs.id) {
      found = node.attrs.id;
      return false;
    }
    return true;
  });
  return found;
};

/**
 * 序列化编辑器为提交载荷：skill chip 剥离（不留痕），其余拼成纯文本。
 * chip 是 atom 节点、无 text，getText() 天然跳过 —— 即 ChatGPT 式干净删除，chip 前后文本直接相连。
 * 段落（硬换行）用 "\n" 连接，与原 textarea 语义一致；末尾 trim 去首尾空白。
 */
const serializeEditor = (editor: Editor): { text: string; skillId: string | null } => ({
  text: editor.getText({ blockSeparator: "\n" }).trim(),
  skillId: extractSkillId(editor.state.doc),
});

/**
 * 读光标前到词首的文本，判断是否 "/关键字" 斜杠指令形态。
 * 与原 textarea「整段匹配」不同：富文本下只看光标所在 token，避免被 chip / 其它文本干扰。
 * 返回 [关键字, token起始pos, 光标pos]；关键字 "" 表示仅一个 "/"，未命中返回 null。
 */
const slashTokenAt = (doc: PmNode, pos: number): readonly [string, number, number] | null => {
  const $from = doc.resolve(pos);
  const textBefore = $from.parent.textBetween(0, $from.parentOffset);
  // 取最后一个空白之后的片段，要求以 "/" 开头且内部无空格（单 token）。
  const tail = textBefore.split(/\s/).pop() ?? "";
  if (!tail.startsWith("/") || tail.slice(1).includes(" ")) return null;
  return [tail.slice(1), pos - tail.length, pos] as const;
};

/** 斜杠 query：复用 slashTokenAt，只取关键字。 */
const slashQueryAt = (doc: PmNode, pos: number): string | null => {
  const token = slashTokenAt(doc, pos);
  return token ? token[0] : null;
};

/**
 * 计算光标前 "/指令" token 的删除范围；选中命令（attach）后用它清掉 "/指令" 文本。
 * 仅在 token 命中时有效，否则返回空范围（pos 到 pos，删除无操作）。
 */
const currentSlashRange = (editor: Editor): { from: number; to: number } => {
  const { doc, selection } = editor.state;
  const token = slashTokenAt(doc, selection.to);
  return token ? { from: token[1], to: token[2] } : { from: selection.to, to: selection.to };
};

/** "/" 菜单条目：Skill 附加项（作为上下文 chip）与命令项（触发动作）。 */
type SlashEntry =
  | { type: "skill"; id: string; name: string; description: string; Icon: LucideIcon }
  | { type: "command"; id: "attach"; name: string; description: string; Icon: LucideIcon };

export interface ComposerSubmit {
  text: string;
  /** 本轮绑定的单一 Skill id（零或一）；缺省表示 base execution。 */
  skillId?: string;
  /** 发送时 Skill 的显示名（来自目录），供历史回显。 */
  skillLabel?: string;
  attachments: MessageAttachment[];
  /** 本轮显式选择且 complete 成功的服务端资源 id；复刻 mock 下只允许 input_*。 */
  inputFileIds: string[];
  /** 同一次发送及其 CreateRun 重试复用同一键，防止网络重试重复创建 Run。 */
  idempotencyKey: string;
  /** 思考强度档位 id（本地常量配置）；空档位或未选择时缺省，提交链不带 effort。 */
  effort?: string;
}

interface ComposerProps {
  initialText?: string;
  initialSkill?: SkillId;
  /** 真正禁用（不可输入、不可发送）。与 busy 相互独立。 */
  disabled?: boolean;
  /** agent 忙碌中（运行 / 等待用户）：仍可输入，但主按钮切换为「停止」，提交语义交由父级（通常入队）。 */
  busy?: boolean;
  /** 点击「停止」按钮：中止当前运行。busy 且输入为空时主按钮即此动作。 */
  onStop?: () => void;
  placeholder?: string;
  onSubmit?: (value: ComposerSubmit) => void;
  showCases?: boolean;
}

export function Composer({
  initialText = "",
  initialSkill,
  disabled = false,
  busy = false,
  onStop,
  placeholder: placeholderProp,
  onSubmit,
  showCases = false,
}: ComposerProps) {
  const t = useLocale().dict.composer;
  const placeholder = placeholderProp ?? t.defaultPlaceholder;
  const [attachments, dispatchAttachments] = useReducer(attachmentReducer, []);
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  // 思考强度档位来自本地常量配置（见 composerConfig.ts）；用户选择优先，未手动选时跟随默认档。
  const { config, loading: configLoading, loadFailed: configLoadFailed } = useComposerConfig();
  const [effortChoice, setEffortChoice] = useState<string | null>(null);
  const effort = effortChoice ?? config?.defaultEffort ?? null;
  /** 动态 Skill 目录（来自字典的本地目录）；空 = base 可用但无 Skill 可选。 */
  const skillCatalog: ComposerSkillEntry[] = config?.skills ?? [];
  // "/" 斜杠菜单：slashActive 控制是否展开（Esc / 选定后关闭），query 从光标前 token 派生。
  const [slashActive, setSlashActive] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const uploadControllersRef = useRef(new Map<string, AbortController>());
  // 初始内容：纯文本 prompt + 可选单个 skill chip（initialSkill 转成首个 inline 节点）。
  const initialContent = useMemo<JSONContent | string>(() => {
    if (!initialSkill) return initialText;
    // 编辑器至少有一个段落；prompt 文本在前、chip 在后。
    return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: initialText }, { type: SKILL_NODE, attrs: { id: initialSkill } }] }] };
  }, [initialText, initialSkill]);

  // 富文本编辑器：skill chip 是 inline 节点，单一真源是文档本身（skillIds / hasText 都从它派生）。
  // submitRef / slashNavRef 用 ref 持有最新闭包，供编辑器在创建时一次性绑定的快捷键 / keydown 读取
  // （编辑器实例只建一次，闭包里直接读 state 会拿到初值，故走 ref 桥接）。
  const submitRef = useRef<() => void>(() => {});
  const slashNavRef = useRef<{ open: boolean; count: number; move: (delta: number) => void; pick: () => void; close: () => void }>({
    open: false, count: 0, move: () => {}, pick: () => {}, close: () => {},
  });
  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        SkillNode,
        // 回车发送：光标在末尾且无选区时 Enter 发送，Shift+Enter 换行；IME 组词期间 Tiptap 自动放过。
        Extension.create({
          name: "composerSubmitShortcut",
          addKeyboardShortcuts() {
            return {
              Enter: ({ editor }) => {
                // 斜杠菜单展开时 Enter 改作「确认选中项」，不发送。
                if (slashNavRef.current.open) {
                  slashNavRef.current.pick();
                  return true;
                }
                const { selection, doc } = editor.state;
                // doc.content.size 是文档末尾之后的位置（不可落点），文档里最后一个可落点的
                // 文本末尾位置是 size - 1，故与它比较来判定「光标在末尾」。
                const atEnd = selection.empty && selection.to === doc.content.size - 1;
                if (!atEnd) return false;
                submitRef.current();
                return true;
              },
              "Shift-Enter": ({ editor }) => {
                editor.commands.first(({ commands }) => [() => commands.newlineInCode(), () => commands.splitBlock({ keepMarks: true })]);
                return true;
              },
              Tab: () => (slashNavRef.current.open ? (slashNavRef.current.pick(), true) : false),
              ArrowDown: () => (slashNavRef.current.open ? (slashNavRef.current.move(1), true) : false),
              ArrowUp: () => (slashNavRef.current.open ? (slashNavRef.current.move(-1), true) : false),
              Escape: () => (slashNavRef.current.open ? (slashNavRef.current.close(), true) : false),
            };
          },
        }),
      ],
      content: initialContent,
      editorProps: {
        attributes: {
          // 编辑器只建一次：aria-label 取创建时的字典文案，不随 locale 热切换。
          "aria-label": t.editorAria,
          role: "textbox",
          "aria-multiline": "true",
        },
      },
    },
    [],
  );

  // 文档实时快照：skillIds / hasText / slashQuery 全部从编辑器派生，保证单一真源。
  const docState = useEditorState({
    editor,
    selector: (e): { doc: PmNode; selection: typeof e.editor.state.selection } => ({ doc: e.editor.state.doc, selection: e.editor.state.selection }),
    equalityFn: (a, b) => a?.doc === b?.doc && a?.selection === b?.selection,
  });
  const skillId = useMemo<string | null>(() => (docState ? extractSkillId(docState.doc) : null), [docState]);
  const hasText = useMemo(() => (docState ? docState.doc.textContent.trim().length > 0 : false), [docState]);
  // 斜杠指令：只看光标前到词首的 token（富文本下 chip 等不再干扰整段匹配）。
  const slashQuery = useMemo(() => (docState ? slashQueryAt(docState.doc, docState.selection.to) : null), [docState]);
  // "/" 菜单候选：Skill 项（来自动态目录）与命令项（触发动作）合并，按输入过滤。
  const slashItems = useMemo<SlashEntry[]>(() => {
    if (slashQuery === null) return [];
    const q = slashQuery.toLowerCase();
    const match = (id: string, name: string) => !q || name.toLowerCase().includes(q) || id.includes(q);
    const skills: SlashEntry[] = skillCatalog
      .filter((s) => match(s.id, s.label))
      .map((s) => ({ type: "skill" as const, id: s.id, name: s.label, description: s.description, Icon: Puzzle }));
    // 命令（上传附件）置顶，Skill 随后。
    const commands: SlashEntry[] = [
      { type: "command" as const, id: "attach" as const, name: t.slash.attachName, description: t.slash.attachDescription, Icon: Paperclip },
    ].filter((c) => match(c.id, c.name));
    return [...commands, ...skills];
  }, [slashQuery, skillCatalog, t]);
  // 菜单真正可见：处于激活态、命中候选、且未被真正禁用。
  const slashOpen = slashActive && slashQuery !== null && slashItems.length > 0 && !disabled;
  const activeSlashIndex = Math.min(slashIndex, Math.max(0, slashItems.length - 1));

  // 斜杠菜单响应式定位：测量 composer 上下可用空间，选更大的一侧展开（会话页多为上方、项目页上方不足则翻到下方）；
  // 空间不足时把菜单高度压到该侧可用范围内并让其内部滚动，极端矮视口也允许压缩尺寸避免被截断。
  const composerRef = useRef<HTMLDivElement>(null);
  const [slashPlacement, setSlashPlacement] = useState<"top" | "bottom">("top");
  const [slashMaxHeight, setSlashMaxHeight] = useState(340);
  useLayoutEffect(() => {
    if (!slashOpen) return;
    const IDEAL_HEIGHT = 340;
    const GAP = 8;
    const measure = () => {
      const el = composerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // 菜单与 composer 之间、以及菜单与视口边缘之间各留 8px 余量。
      const spaceAbove = Math.max(0, rect.top - GAP - GAP);
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - GAP - GAP);
      // 优先在空间更大的一侧展开；若两侧都不够理想，选相对大的那一侧并压缩高度。
      const placeBottom = spaceBelow > spaceAbove;
      setSlashPlacement(placeBottom ? "bottom" : "top");
      const avail = placeBottom ? spaceBelow : spaceAbove;
      setSlashMaxHeight(Math.min(IDEAL_HEIGHT, avail));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [slashOpen]);

  const uploadErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : t.notices.uploadFailed;

  const startUpload = (attachment: ComposerAttachment) => {
    const file = attachment.localFile;
    if (!file) return;
    uploadControllersRef.current.get(attachment.id)?.abort();
    const controller = new AbortController();
    uploadControllersRef.current.set(attachment.id, controller);
    let pendingResourceId: string | undefined;
    dispatchAttachments({ type: "start", id: attachment.id });
    // 内存 mock 上传（无服务端）：状态机与原两段式直传一致，全部立即成功（见 mockUpload.ts）。
    void uploadTemporaryInput(file, {
      signal: controller.signal,
      onSession: (resourceId) => {
        pendingResourceId = resourceId;
        dispatchAttachments({ type: "session", id: attachment.id, resourceId });
      },
      onProcessing: () => dispatchAttachments({ type: "processing", id: attachment.id }),
    })
      .then((uploaded) => {
        if (uploaded.status !== "uploaded") throw new Error(t.notices.uploadIncomplete);
        return uploaded.input_file_id;
      })
      .then((resourceId) => {
        if (!controller.signal.aborted) {
          dispatchAttachments({ type: "ready", id: attachment.id, resourceId });
          setNotice("");
        }
      })
      .catch((error: unknown) => {
        if (pendingResourceId?.startsWith("input_")) {
          void cancelTemporaryInput(pendingResourceId).catch(() => undefined);
        }
        // 取消后立即重试会换一只 controller；旧 Promise 的迟到 catch 不得覆盖新一轮状态。
        if (uploadControllersRef.current.get(attachment.id) !== controller) return;
        if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
          dispatchAttachments({ type: "cancelled", id: attachment.id, error: t.attachments.cancelledNotice });
        } else {
          dispatchAttachments({ type: "failed", id: attachment.id, error: uploadErrorMessage(error) });
        }
      })
      .finally(() => {
        if (uploadControllersRef.current.get(attachment.id) === controller) {
          uploadControllersRef.current.delete(attachment.id);
        }
      });
  };

  // 真实文件选择：图片 objectURL 只属于 Composer，上传/选择不会把字节或 URL 带进 Run。
  const addFiles = (fileList: FileList) => {
    const remaining = Math.max(0, 32 - attachments.length);
    const chosen = Array.from(fileList).slice(0, remaining);
    if (chosen.length < fileList.length) setNotice(t.attachments.limitNotice);
    const next: ComposerAttachment[] = chosen.map((file): ComposerAttachment => {
      const id = `att-${(idRef.current += 1)}`;
      if (file.type.startsWith("image/")) {
        return {
          id,
          name: file.name,
          kind: "image",
          url: URL.createObjectURL(file),
          size: formatSize(file.size),
          source: "local",
          status: "local",
          localFile: file,
        };
      }
      return {
        id,
        name: file.name,
        kind: "file",
        fileType: fileTypeLabel(file.name, t.attachments.fileTypeFallback),
        size: formatSize(file.size),
        source: "local",
        status: "local",
        localFile: file,
      };
    });
    next.forEach((attachment) => {
      dispatchAttachments({ type: "add", attachment });
      startUpload(attachment);
    });
  };
  const removeAttachment = (id: string) => {
    const target = attachments.find((item) => item.id === id);
    uploadControllersRef.current.get(id)?.abort();
    uploadControllersRef.current.delete(id);
    if (target?.pendingResourceId?.startsWith("input_")) {
      void cancelTemporaryInput(target.pendingResourceId).catch(() => undefined);
    }
    revokeAttachmentUrls(target ? [target] : undefined);
    dispatchAttachments({ type: "remove", id });
  };
  const cancelAttachment = (attachment: ComposerAttachment) => {
    uploadControllersRef.current.get(attachment.id)?.abort();
    uploadControllersRef.current.delete(attachment.id);
    if (attachment.pendingResourceId?.startsWith("input_")) {
      void cancelTemporaryInput(attachment.pendingResourceId).catch(() => undefined);
    }
    revokeAttachmentUrls([attachment]);
    dispatchAttachments({ type: "cancelled", id: attachment.id, error: t.attachments.cancelledNotice });
  };
  const retryAttachment = (attachment: ComposerAttachment) => {
    if (!attachment.localFile) return;
    if (attachment.pendingResourceId?.startsWith("input_")) {
      void cancelTemporaryInput(attachment.pendingResourceId).catch(() => undefined);
    }
    startUpload(attachment);
  };

  // 镜像最新 attachments，卸载时中断上传并释放仍由 Composer 持有的 objectURL。
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  useEffect(
    () => () => {
      uploadControllersRef.current.forEach((controller) => controller.abort());
      uploadControllersRef.current.clear();
      for (const attachment of attachmentsRef.current) {
        if (attachment.pendingResourceId?.startsWith("input_")) {
          void cancelTemporaryInput(attachment.pendingResourceId).catch(() => undefined);
        }
      }
      revokeAttachmentUrls(attachmentsRef.current);
    },
    [],
  );
  const hasContext = Boolean(hasText || skillId || attachments.length);
  // 多行判定：富文本编辑器无需镜像量取，直接观察 ProseMirror 容器的 scrollHeight vs 单行高。
  // 软折行 / 硬换行都会让 scrollHeight 超过单行，触发 composer 从胶囊延展成圆角矩形（与原 textarea 行为一致）。
  const editorDomRef = useRef<HTMLDivElement | null>(null);
  const [multiline, setMultiline] = useState(false);
  useLayoutEffect(() => {
    const el = editorDomRef.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      const single = Number.parseFloat(cs.lineHeight) + Number.parseFloat(cs.paddingTop) + Number.parseFloat(cs.paddingBottom);
      setMultiline(el.scrollHeight > single + 2);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasText, skillId]);
  const expanded = multiline || Boolean(skillId || attachments.length);
  const effortLabel = config?.efforts.find((item) => item.id === effort)?.label ?? "";

  // disabled 真正落到编辑器：摘掉 contenteditable，配合 .is-disabled 的视觉弱化。
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  // 文档每次变动时刷新斜杠菜单激活态：光标前 token 落入 "/单 token" 形态即激活并回到首项，否则收起。
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const q = slashQueryAt(editor.state.doc, editor.state.selection.to);
      if (q !== null) {
        setSlashActive(true);
        setSlashIndex(0);
      } else {
        setSlashActive(false);
      }
    };
    editor.on("update", handler);
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("update", handler);
      editor.off("selectionUpdate", handler);
    };
  }, [editor]);

  // 在当前光标处插入 skill chip（单选：替换已有），收菜单、回焦编辑器。
  // 若由 "/" 菜单触发，先吃掉光标前的 "/指令" token（与命令项一致）；"+" 下拉触发时无 token，deleteRange 为空操作。
  const applySkill = (id: string, label: string) => {
    if (editor) editor.chain().focus().deleteRange(currentSlashRange(editor)).insertSkill(id, label).run();
    setSlashActive(false);
  };

  // 斜杠命令分发：与「+」下拉里的动作一一对应 —— attach 走文件选择器。
  // 先清掉 "/指令" 文本、收菜单；attach 在回焦后触发原生控件（与「+」下拉保持一致）。
  const applySlashCommand = (entry: Extract<SlashEntry, { type: "command" }>) => {
    setSlashActive(false);
    // 命令都先清掉光标前的 "/指令" token，再回焦执行动作（与「+」下拉语义一致）。
    if (editor) editor.chain().focus().deleteRange(currentSlashRange(editor)).run();
    if (entry.id === "attach") {
      requestAnimationFrame(() => fileInputRef.current?.click());
    }
  };

  const selectCase = (skill: ComposerSkillEntry) => {
    applySkill(skill.id, skill.label);
  };

  // 把最新斜杠菜单状态与动作灌进 slashNavRef，供编辑器快捷键闭包读取（编辑器只建一次）。
  slashNavRef.current = {
    open: slashOpen,
    count: slashItems.length,
    move: (delta) => setSlashIndex((i) => (i + delta + slashItems.length) % slashItems.length),
    pick: () => {
      const picked = slashItems[activeSlashIndex];
      if (!picked) return;
      if (picked.type === "skill") applySkill(picked.id, picked.name);
      else applySlashCommand(picked);
    },
    close: () => setSlashActive(false),
  };

  const validateReadyAttachments = async (): Promise<boolean> => {
    const ready = attachments.filter(
      (attachment): attachment is ComposerAttachment & { resourceId: string } =>
        attachment.status === "ready" && Boolean(attachment.resourceId),
    );
    const temporary = ready.filter((attachment) => attachment.resourceId.startsWith("input_"));
    const unavailable = new Map<string, string>();

    await Promise.all(
      temporary.map(async (attachment) => {
        try {
          const resource = await getTemporaryInput(attachment.resourceId);
          if (resource.status !== "uploaded") {
            unavailable.set(attachment.resourceId, t.notices.tempExpired);
          }
        } catch (error) {
          unavailable.set(attachment.resourceId, uploadErrorMessage(error));
        }
      }),
    );
    for (const attachment of ready) {
      const error = unavailable.get(attachment.resourceId);
      if (error) dispatchAttachments({ type: "unavailable", id: attachment.id, error });
    }
    if (unavailable.size > 0) {
      setNotice(t.notices.attachmentsUnavailable);
      return false;
    }
    return true;
  };

  // 提交：等待所选资源再次通过状态校验，再只交付稳定去重的 resource ids。
  // objectURL 在提交成功移交消息前释放，后续历史只回显文件来源，不依赖 blob URL。
  const submit = async () => {
    if (!hasContext || disabled || submittingRef.current) return;
    if (!allAttachmentsReady(attachments)) {
      setNotice(t.notices.waitAttachments);
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const valid = await validateReadyAttachments();
      if (!valid) return;
      const payload = editor ? serializeEditor(editor) : { text: "", skillId: null };
      const selectedSkill = payload.skillId ? skillCatalog.find((s) => s.id === payload.skillId) : null;
      onSubmit?.({
        text: payload.text,
        ...(payload.skillId ? { skillId: payload.skillId, skillLabel: selectedSkill?.label ?? payload.skillId } : {}),
        attachments: toMessageAttachments(attachments),
        inputFileIds: readyInputFileIds(attachments),
        idempotencyKey: crypto.randomUUID(),
        ...(effort ? { effort } : {}),
      });
      revokeAttachmentUrls(attachments);
      editor?.commands.clearContent(true);
      dispatchAttachments({ type: "reset" });
      setNotice("");
      setSlashActive(false);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  // 把最新 submit 绑进编辑器的 Enter 快捷键闭包（editor 在 submit 之前创建）。
  submitRef.current = () => {
    void submit();
  };

  // 主按钮：忙碌且输入为空 → 停止；否则 → 发送。忙碌时按钮常驻可见。
  const showStop = busy && !hasContext && !disabled;

  return (
    <div className="composer-wrap">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files?.length) addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <div ref={composerRef} className={`composer ${expanded ? "is-expanded" : ""} ${disabled ? "is-disabled" : ""}`}>
        {slashOpen ? (
          <div
            className="composer__slash"
            data-placement={slashPlacement}
            style={{ maxHeight: slashMaxHeight }}
            role="listbox"
            aria-label={t.slash.listboxAria}
          >
            <div className="composer__slash-list">
              {slashItems.map((item, i) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={i === activeSlashIndex}
                  className="composer__slash-item"
                  data-active={i === activeSlashIndex ? "" : undefined}
                  onMouseEnter={() => setSlashIndex(i)}
                  onMouseDown={(e) => {
                    // mousedown 抢在 textarea blur 前，避免焦点跳走导致点击丢失。
                    e.preventDefault();
                    if (item.type === "skill") applySkill(item.id, item.name);
                    else applySlashCommand(item);
                  }}
                >
                  <item.Icon className="composer__slash-icon" aria-hidden="true" />
                  <span className="composer__slash-name">{item.name}</span>
                  <span className="composer__slash-description">{item.description}</span>
                </button>
              ))}
            </div>
            <div className="composer__slash-foot">
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              {t.slash.footSelect}
              <kbd>↵</kbd>
              {t.slash.footConfirm}
              <kbd>esc</kbd>
              {t.slash.footClose}
            </div>
          </div>
        ) : null}

        {attachments.length ? (
          <div className="composer__chips" aria-label={t.attachments.chipsAria}>
            {attachments.map((attachment) => (
              <Badge
                variant="secondary"
                className={`tag ${
                  attachment.status === "failed" || attachment.status === "cancelled"
                    ? "tag--danger"
                    : attachment.status === "ready"
                      ? "tag--neutral"
                      : "tag--warning"
                }`}
                key={attachment.id}
                title={attachment.error}
                data-status={attachment.status}
              >
                {attachment.kind === "image" && attachment.url ? (
                  <img className="composer__chip-thumb" src={attachment.url} alt="" aria-hidden="true" />
                ) : attachment.status === "uploading" || attachment.status === "processing" ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : attachment.status === "failed" || attachment.status === "cancelled" ? (
                  <AlertCircle aria-hidden="true" />
                ) : (
                  <FilePlus2 aria-hidden="true" />
                )}
                {attachment.name}
                {attachment.status === "local" ? <span>{t.attachments.statusLocal}</span> : null}
                {attachment.status === "uploading" ? <span>{t.attachments.statusUploading}</span> : null}
                {attachment.status === "processing" ? <span>{t.attachments.statusProcessing}</span> : null}
                {attachment.status === "failed" ? <span>{t.attachments.statusFailed}</span> : null}
                {attachment.status === "cancelled" ? <span>{t.attachments.statusCancelled}</span> : null}
                {(attachment.status === "failed" || attachment.status === "cancelled") && attachment.localFile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={interpolate(t.attachments.retryAria, { name: attachment.name })}
                    onClick={() => retryAttachment(attachment)}
                  >
                    <RotateCcw aria-hidden="true" />
                  </Button>
                ) : null}
                {attachment.status === "uploading" || attachment.status === "processing" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={interpolate(t.attachments.cancelAria, { name: attachment.name })}
                    onClick={() => cancelAttachment(attachment)}
                  >
                    <Square aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={interpolate(t.attachments.removeAria, { name: attachment.name })}
                    onClick={() => removeAttachment(attachment.id)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="composer__row">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                aria-label={t.addContextAria}
                className="composer__button composer__plus"
                disabled={disabled}
              >
                <Plus aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={10} className="w-56 border-input p-1 shadow-lg">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => requestAnimationFrame(() => fileInputRef.current?.click())}>
                  <Paperclip data-icon="inline-start" aria-hidden="true" />{t.menu.attach}
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger><Puzzle data-icon="inline-start" aria-hidden="true" />{t.menu.selectSkill}</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-56 border-input p-1 shadow-lg">
                    <DropdownMenuGroup>
                      {skillCatalog.length > 0 ? (
                        skillCatalog.map((s) => (
                          <DropdownMenuItem key={s.id} className={skillId === s.id ? "bg-accent" : undefined} onSelect={() => applySkill(s.id, s.label)}>
                            {s.label}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuLabel className="whitespace-normal text-muted-foreground">
                          {configLoadFailed
                            ? t.menu.skillUnavailable
                            : configLoading || config === null
                              ? t.menu.skillLoading
                              : t.menu.skillEmpty}
                        </DropdownMenuLabel>
                      )}
                    </DropdownMenuGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="composer__editor" ref={editorDomRef} data-placeholder={placeholder}>
            <EditorContent editor={editor} />
          </div>
          <div className="composer__actions" data-send-visible={hasContext || busy}>
            {config && config.efforts.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="composer__effort"
                    disabled={disabled}
                    aria-label={interpolate(t.effort.aria, { label: effortLabel })}
                  >
                    {effortLabel}
                    <ChevronDown aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end" sideOffset={10} className="w-36 border-input p-1 shadow-lg">
                  <DropdownMenuLabel>{t.effort.label}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    {config.efforts.map((item) => (
                      <DropdownMenuItem key={item.id} onSelect={() => setEffortChoice(item.id)}>
                        {item.label}
                        {item.id === effort ? <Check className="ml-auto" aria-hidden="true" /> : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {showStop ? (
              <Button
                type="button"
                aria-label={t.stopAria}
                className="composer__button composer__stop"
                onClick={() => onStop?.()}
              >
                <Square aria-hidden="true" fill="currentColor" />
              </Button>
            ) : (
              <Button
                type="button"
                aria-label={busy ? t.enqueueAria : t.sendAria}
                title={busy ? t.enqueueTitle : undefined}
                className="composer__button composer__send"
                disabled={!hasContext || disabled || !allAttachmentsReady(attachments) || isSubmitting}
                onClick={() => void submit()}
              >
                {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {showCases && skillCatalog.length > 0 ? (
        <div className="case-list" aria-label={t.casesAria}>
          {skillCatalog.map((s) => (
            <button key={s.id} type="button" className="case-chip" onClick={() => selectCase(s)}>
              <span className="case-chip__title">{s.label}</span>
              <span className="case-chip__description">{s.description}</span>
            </button>
          ))}
        </div>
      ) : null}
      {notice ? <p className="composer-notice" role="status">{notice}</p> : null}
    </div>
  );
}
