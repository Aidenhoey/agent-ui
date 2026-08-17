import { Node, mergeAttributes, type Command, type Editor } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { Puzzle, X } from "lucide-react";

import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { interpolate, useLocale } from "../i18n/locale-context.js";

/** skill chip 在文档里的节点名。 */
export const SKILL_NODE = "skill";

/**
 * inline + atom 的 skill chip 节点：作为单个不可编辑的原子嵌入文字流，
 * 可在任意光标位置插入 / 用退格删除。序列化标签 <span data-skill="...">。
 *
 * 单选语义：文档中至多一个 skill 节点；插入新 skill 时替换已有的。
 */
export const SkillNode = Node.create({
  name: SKILL_NODE,
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-skill"),
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { "data-skill": attributes.id };
        },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-skill-label"),
        renderHTML: (attributes) => {
          if (!attributes.label) return {};
          return { "data-skill-label": attributes.label };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: `span[data-skill]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "skill-chip", contenteditable: "false" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SkillChipView);
  },

  addCommands() {
    return {
      insertSkill:
        (id: string, label: string): Command =>
        ({ commands, state }) => {
          // 单选语义：先移除已有的 skill 节点，再插入新的。
          let existingPos: number | null = null;
          let existingSize = 0;
          state.doc.descendants((node, pos) => {
            if (node.type.name === SKILL_NODE) {
              existingPos = pos;
              existingSize = node.nodeSize;
              return false;
            }
            return true;
          });
          if (existingPos !== null) {
            commands.deleteRange({ from: existingPos, to: existingPos + existingSize });
          }
          return commands.insertContent({ type: SKILL_NODE, attrs: { id, label } });
        },
      removeSkill:
        (): Command =>
        ({ commands, state }) => {
          let existingPos: number | null = null;
          let existingSize = 0;
          state.doc.descendants((node, pos) => {
            if (node.type.name === SKILL_NODE) {
              existingPos = pos;
              existingSize = node.nodeSize;
              return false;
            }
            return true;
          });
          if (existingPos === null) return false;
          return commands.deleteRange({ from: existingPos, to: existingPos + existingSize });
        },
    };
  },
});

/** 扩展 commands 类型声明：让 editor.commands.insertSkill(id, label) 有类型。 */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    insertSkill: {
      /** 在当前光标处插入 skill chip；已有 skill 时替换（单选语义）。 */
      insertSkill: (id: string, label: string) => ReturnType;
      /** 移除文档中的 skill chip（恢复 base）。 */
      removeSkill: () => ReturnType;
    };
  }
}

/**
 * chip 的 React 视图：浅蓝胶囊 + Puzzle 图标 + skill 名 + X 关闭按钮。
 * label 从节点属性读取（插入时由目录提供），不依赖静态表。
 */
function SkillChipView({ node, deleteNode }: ReactNodeViewProps) {
  const { dict } = useLocale();
  const id = node.attrs.id as string | null;
  const label = (node.attrs.label as string | null) ?? id ?? dict.composer.skillChip.unknown;
  return (
    <NodeViewWrapper as="span" className="skill-chip__wrap">
      <Badge variant="outline" className="tag tag--outline composer__skill-chip skill-chip">
        <Puzzle aria-hidden="true" />
        {label}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={interpolate(dict.composer.skillChip.removeAria, { label })}
          onMouseDown={(event) => event.preventDefault()}
          onClick={deleteNode}
        >
          <X aria-hidden="true" />
        </Button>
      </Badge>
    </NodeViewWrapper>
  );
}

export type { Editor };
