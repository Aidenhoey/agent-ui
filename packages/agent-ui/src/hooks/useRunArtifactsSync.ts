/**
 * 产物列表同步（裁剪版）：库当前仅交付 mock 模式，产物由事件脚本注入，
 * 无 REST 层可拉取，此钩子恒 no-op。保留函数签名以对齐 SRC 调用点。
 *
 * 真实后端模式（run 达终态后 GET /runs/:id/artifacts → store.applyRunArtifacts
 * 按 artifact_id 去重合并、仅补 download_url、失败静默降级）随 REST 层落地后恢复，
 * 语义见 SRC features/agent-run/hooks/useRunArtifactsSync.ts。
 */
export function useRunArtifactsSync(): void {
  // mock 模式恒 no-op。
}
