/**
 * ConversationRuntimeProvider —— 会话级 runtime 注册表（简化骨架）。
 *
 * 移植自 agent-portal 的 runtime/ConversationRuntimeProvider.tsx。SRC 版本深度耦合
 * sessions / conversations API / conversationSessionStore（附件 URL 托管、会话元数据
 * 回填、terminal LRU 修剪）；这些依赖尚未移植，本骨架只保留注册表核心语义：
 * - ensureRuntime 按 clientSessionId / conversationId 去重复用 runtime；
 * - attach/detach 观察者计数（含 React effect 重建的 coalesce 处理）；
 * - resetKey 变更 / Provider 卸载时全量 dispose。
 * TODO(壳层 agent)：接 sessions 后补 onRunCreated 元数据回填、runStatus 上报、
 * terminal LRU 修剪与会话删除联动。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";

import type { RunStore } from "../state/store.js";
import {
  createRunRuntime,
  type RunPlayerLike,
  type RunRuntime,
} from "./runRuntime.js";

export interface ConversationRuntimeDescriptor {
  clientSessionId?: string;
  conversationId?: string | null;
  seedRunStore?: RunStore;
  createPlayer?: (store: RunStore) => RunPlayerLike;
}

export interface ConversationRuntimeEntry {
  readonly key: string;
  readonly runtime: RunRuntime;
  readonly clientSessionId?: string;
  conversationId: string | null;
  observerCount: number;
  lastUnobservedAt: number;
}

interface InternalEntry extends ConversationRuntimeEntry {
  pendingDetaches: number;
}

interface ConversationRuntimeRegistry {
  ensureRuntime(descriptor: ConversationRuntimeDescriptor): ConversationRuntimeEntry;
  getRuntimeBySession(id: string): ConversationRuntimeEntry | null;
  disposeSession(id: string, reason?: string): void;
  subscribe(listener: () => void): () => void;
  getVersion(): number;
  attach(entry: ConversationRuntimeEntry, coalesceEffectRebind?: boolean): () => void;
}

const ConversationRuntimeContext = createContext<ConversationRuntimeRegistry | null>(null);

interface ConversationRuntimeProviderProps extends PropsWithChildren {
  resetKey: string;
  useMock?: boolean;
  createPlayer?: (store: RunStore) => RunPlayerLike;
}

export function ConversationRuntimeProvider({
  children,
  resetKey,
  useMock,
  createPlayer,
}: ConversationRuntimeProviderProps) {
  const entriesRef = useRef(new Map<string, InternalEntry>());
  const listenersRef = useRef(new Set<() => void>());
  const versionRef = useRef(0);
  const resetKeyRef = useRef(resetKey);

  const notify = useCallback(() => {
    versionRef.current += 1;
    for (const listener of listenersRef.current) listener();
  }, []);

  const disposeEntry = useCallback((entry: InternalEntry, reason: string, shouldNotify = true) => {
    if (entriesRef.current.get(entry.key) !== entry) return;
    entriesRef.current.delete(entry.key);
    entry.runtime.dispose(reason);
    if (shouldNotify) notify();
  }, [notify]);

  const disposeAll = useCallback((reason: string, shouldNotify = true) => {
    const entries = [...entriesRef.current.values()];
    for (const entry of entries) disposeEntry(entry, reason, false);
    if (entries.length > 0) {
      if (shouldNotify) notify();
      else versionRef.current += 1;
    }
  }, [disposeEntry, notify]);

  if (resetKeyRef.current !== resetKey) {
    resetKeyRef.current = resetKey;
    disposeAll("user-reset", false);
  }

  useEffect(() => () => disposeAll("provider-unmount", false), [disposeAll]);

  const getRuntimeBySession = useCallback((id: string): ConversationRuntimeEntry | null => {
    for (const entry of entriesRef.current.values()) {
      if (entry.clientSessionId === id || entry.conversationId === id) return entry;
    }
    return null;
  }, []);

  const ensureRuntime = useCallback((descriptor: ConversationRuntimeDescriptor): ConversationRuntimeEntry => {
    const key = descriptor.clientSessionId
      ? `live:${descriptor.clientSessionId}`
      : `conversation:${descriptor.conversationId}`;
    const existing = (
      (descriptor.clientSessionId ? getRuntimeBySession(descriptor.clientSessionId) : null)
      ?? (descriptor.conversationId ? getRuntimeBySession(descriptor.conversationId) : null)
      ?? entriesRef.current.get(key)
      ?? null
    ) as InternalEntry | null;
    if (existing) {
      if (
        descriptor.conversationId
        && existing.conversationId
        && descriptor.conversationId !== existing.conversationId
      ) {
        throw new Error("会话 runtime alias 指向了不同的 conversation_id");
      }
      if (descriptor.conversationId && !existing.conversationId) {
        existing.conversationId = descriptor.conversationId;
        existing.runtime.update({ conversationId: descriptor.conversationId });
        notify();
      }
      return existing;
    }

    const runtime = createRunRuntime({
      useMock,
      ...(descriptor.seedRunStore ? { store: descriptor.seedRunStore } : {}),
      conversationId: descriptor.conversationId ?? null,
      ...(descriptor.createPlayer ?? createPlayer
        ? { createPlayer: descriptor.createPlayer ?? createPlayer }
        : {}),
      // TODO(壳层 agent)：onRunCreated → reconcileSession + 会话元数据回填；
      // onFirstRunStateChange → 创建态上报。
    });
    const entry: InternalEntry = {
      key,
      runtime,
      ...(descriptor.clientSessionId ? { clientSessionId: descriptor.clientSessionId } : {}),
      conversationId: descriptor.conversationId ?? null,
      observerCount: 0,
      pendingDetaches: 0,
      lastUnobservedAt: Date.now(),
    };
    entriesRef.current.set(key, entry);
    return entry;
  }, [createPlayer, getRuntimeBySession, notify, useMock]);

  const disposeSession = useCallback((id: string, reason = "explicit-delete") => {
    const entry = getRuntimeBySession(id) as InternalEntry | null;
    if (entry) disposeEntry(entry, reason);
  }, [disposeEntry, getRuntimeBySession]);

  const attach = useCallback((
    publicEntry: ConversationRuntimeEntry,
    coalesceEffectRebind = false,
  ) => {
    const entry = publicEntry as InternalEntry;
    if (!coalesceEffectRebind) {
      entry.observerCount += 1;
      let attached = true;
      return () => {
        if (!attached) return;
        attached = false;
        entry.observerCount = Math.max(0, entry.observerCount - 1);
        if (entry.observerCount === 0) {
          entry.lastUnobservedAt = Date.now();
        }
      };
    }
    if (entry.pendingDetaches > 0) entry.pendingDetaches -= 1;
    else entry.observerCount += 1;
    let attached = true;
    return () => {
      if (!attached) return;
      attached = false;
      entry.pendingDetaches += 1;
      queueMicrotask(() => {
        // React may clean up and recreate the same observer effect in one flush. A matching attach
        // consumes this pending detach so routing never observes a false zero between them.
        if (entry.pendingDetaches === 0) return;
        entry.pendingDetaches -= 1;
        entry.observerCount = Math.max(0, entry.observerCount - 1);
        if (entry.observerCount === 0) {
          entry.lastUnobservedAt = Date.now();
        }
      });
    };
  }, []);

  const registry = useMemo<ConversationRuntimeRegistry>(() => ({
    ensureRuntime,
    getRuntimeBySession,
    disposeSession,
    subscribe: (listener) => {
      listenersRef.current.add(listener);
      return () => listenersRef.current.delete(listener);
    },
    getVersion: () => versionRef.current,
    attach,
  }), [attach, disposeSession, ensureRuntime, getRuntimeBySession]);

  return (
    <ConversationRuntimeContext.Provider value={registry}>
      {children}
    </ConversationRuntimeContext.Provider>
  );
}

export function useConversationRuntimeRegistry(): ConversationRuntimeRegistry {
  const context = useContext(ConversationRuntimeContext);
  if (!context) {
    throw new Error("useConversationRuntimeRegistry must be used within ConversationRuntimeProvider");
  }
  useSyncExternalStore(context.subscribe, context.getVersion, context.getVersion);
  return context;
}

export function useConversationRuntime(
  descriptor: ConversationRuntimeDescriptor,
): ConversationRuntimeEntry {
  const registry = useConversationRuntimeRegistry();
  const entry = registry.ensureRuntime(descriptor);
  useEffect(() => registry.attach(entry, true), [entry, registry]);
  return entry;
}
