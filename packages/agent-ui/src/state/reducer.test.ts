import { describe, expect, it } from "vitest";

import type { PlatformInterrupt, PublicRunEvent, RunFailedPayload } from "../protocol/events.js";
import { reduceAll } from "./reducer.js";
import { createRunStore } from "./store.js";
import type {
  InterruptBlock,
  ReasoningBlock,
  SandboxBlock,
  TextBlock,
  ToolBlock,
} from "./view-types.js";

/* 测试事件构造器：纯手写对象（无 Ajv），sequence 自增。 */

let seq = 0;
function envelope() {
  seq += 1;
  return {
    schema_version: 2 as const,
    event_id: `evt_${seq}`,
    run_id: "run_1",
    sequence: seq,
    occurred_at: "2026-01-01T00:00:00.000Z",
  };
}

function started(payload: Extract<PublicRunEvent, { event_type: "block.started" }>["payload"]): PublicRunEvent {
  return { ...envelope(), event_type: "block.started", payload };
}

function delta(payload: Extract<PublicRunEvent, { event_type: "block.delta" }>["payload"]): PublicRunEvent {
  return { ...envelope(), event_type: "block.delta", payload };
}

function completed(payload: Extract<PublicRunEvent, { event_type: "block.completed" }>["payload"]): PublicRunEvent {
  return { ...envelope(), event_type: "block.completed", payload };
}

function mkInterrupt(id: string): PlatformInterrupt {
  return {
    interrupt_id: id,
    interrupt_kind: "clarification",
    title: "需要补充信息",
    content: { prompt: "选哪个方案？" },
    input_schema: {},
    resume_expires_at: "2026-01-01T01:00:00.000Z",
  };
}

function mkEvidence(id: string) {
  return {
    evidence_id: id,
    url: `https://example.com/${id}`,
    title: `来源 ${id}`,
    provider: "example",
    retrieved_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("reduceAll：todo 整单覆盖", () => {
  it("每个 todo delta 都整体替换清单快照", () => {
    const state = reduceAll([
      started({ kind: "todo", block_id: "todo_1" }),
      delta({
        kind: "todo",
        block_id: "todo_1",
        items: [
          { id: "1", text: "甲", status: "pending" },
          { id: "2", text: "乙", status: "in_progress" },
        ],
      }),
      delta({
        kind: "todo",
        block_id: "todo_1",
        items: [{ id: "3", text: "丙", status: "completed" }],
      }),
    ]);
    expect(state.todos).toEqual([{ id: "3", text: "丙", status: "completed" }]);
    expect(state.todoLifecycle.blockId).toBe("todo_1");
    expect(state.todoLifecycle.status).toBe("running");
  });
});

describe("reduceAll：终态隐式闭块", () => {
  it("run.completed 把未闭合块按成功结局闭合，未答 interrupt 强制 resolved", () => {
    const state = reduceAll([
      started({ kind: "text", block_id: "t1" }),
      delta({ kind: "text", block_id: "t1", text: "你好" }),
      started({ kind: "tool", block_id: "tool_1", tool_call_id: "tc1", tool_name: "web.search" }),
      started({ kind: "reasoning", block_id: "r1" }),
      started({ kind: "sandbox", block_id: "s1", runner_profile: "test@1.0.0" }),
      started({ kind: "interrupt", block_id: "i1", interrupt: mkInterrupt("int_1") }),
      { ...envelope(), event_type: "run.completed", payload: { status: "completed", summary: "完成" } },
    ]);

    expect(state.status).toBe("completed");
    expect(state.summary).toBe("完成");

    const text = state.blocks.find((b) => b.block_id === "t1") as TextBlock;
    expect(text.streaming).toBe(false);
    expect(text.text).toBe("你好");

    const tool = state.blocks.find((b) => b.block_id === "tool_1") as ToolBlock;
    expect(tool.status).toBe("completed");
    expect(tool.statusText).toBeUndefined();

    const reasoning = state.blocks.find((b) => b.block_id === "r1") as ReasoningBlock;
    expect(reasoning.status).toBe("done");
    expect(typeof reasoning.completedAt).toBe("number");

    const sandbox = state.blocks.find((b) => b.block_id === "s1") as SandboxBlock;
    expect(sandbox.status).toBe("completed");
    expect(sandbox.stage).toBeUndefined();

    // 未收到 block.completed 的提问卡：终态兜底按已答复闭合。
    const interruptBlock = state.blocks.find((b) => b.block_id === "i1") as InterruptBlock;
    expect(interruptBlock.interrupt.resolved).toBe(true);
    expect(state.interrupt?.resolved).toBe(false); // state.interrupt 指针不由 closeOpenBlocks 改
  });

  it("run.failed 把 reasoning / sandbox 按失败结局闭合并宽松读取 error", () => {
    const state = reduceAll([
      started({ kind: "reasoning", block_id: "r1" }),
      started({ kind: "sandbox", block_id: "s1", runner_profile: "test@1.0.0" }),
      {
        ...envelope(),
        event_type: "run.failed",
        // retryable 是契约外扩展位（reducer lenientError 宽松读取），构造时断言塞进 payload。
        payload: {
          status: "failed",
          error: { code: "internal_error", message: "boom" },
          retryable: true,
        } as RunFailedPayload,
      },
    ]);
    const reasoning = state.blocks.find((b) => b.block_id === "r1") as ReasoningBlock;
    const sandbox = state.blocks.find((b) => b.block_id === "s1") as SandboxBlock;
    expect(reasoning.status).toBe("failed");
    expect(sandbox.status).toBe("failed");
    expect(state.error).toEqual({ code: "internal_error", message: "boom", retryable: true });
  });
});

describe("interrupt resolution：以 wire 为准", () => {
  it("block.completed 携带 resolution 时覆盖本地乐观标注", () => {
    const store = createRunStore();
    store.dispatch(started({ kind: "interrupt", block_id: "i1", interrupt: mkInterrupt("int_1") }));
    store.annotateResolution("int_1", { answer: "乐观标注" });
    store.dispatch(completed({ kind: "interrupt", block_id: "i1", resolution: { answer: "wire 答复" } }));

    const { interrupt, blocks } = store.getState();
    expect(interrupt?.resolved).toBe(true);
    expect(interrupt?.resolution).toEqual({ answer: "wire 答复" });
    const block = blocks.find((b) => b.block_id === "i1") as InterruptBlock;
    expect(block.interrupt.resolved).toBe(true);
    expect(block.interrupt.resolution).toEqual({ answer: "wire 答复" });
  });

  it("block.completed 无 resolution 时保留乐观标注", () => {
    const store = createRunStore();
    store.dispatch(started({ kind: "interrupt", block_id: "i1", interrupt: mkInterrupt("int_1") }));
    store.annotateResolution("int_1", { answer: "乐观标注" });
    store.dispatch(completed({ kind: "interrupt", block_id: "i1" }));

    const { interrupt } = store.getState();
    expect(interrupt?.resolved).toBe(true);
    expect(interrupt?.resolution).toEqual({ answer: "乐观标注" });
  });
});

describe("reduceAll：evidence 角标顺序", () => {
  it("按首次出现顺序编号，重复引用不重复占位", () => {
    const state = reduceAll([
      started({ kind: "evidence", block_id: "e1", evidence: mkEvidence("ev_b") }),
      started({ kind: "evidence", block_id: "e2", evidence: mkEvidence("ev_a") }),
      // 同一证据再次到达（重连/replay 重叠）：upsert，不占新角标。
      started({ kind: "evidence", block_id: "e3", evidence: mkEvidence("ev_b") }),
    ]);
    expect(state.evidenceOrder).toEqual(["ev_b", "ev_a"]);
    expect(Object.keys(state.evidences).sort()).toEqual(["ev_a", "ev_b"]);
  });
});
