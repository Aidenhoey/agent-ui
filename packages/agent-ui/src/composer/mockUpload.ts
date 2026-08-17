/**
 * 附件上传的内存 mock（复刻无服务端）：File 不离开浏览器，图片的 objectURL 由
 * Composer 持有并随提交/移除释放。资源 id 取 `input_${crypto.randomUUID()}` 形态。
 *
 * 状态机与原两段式直传一致（会话建立 → 处理中 → 完成），但全部立即成功 ——
 * 各阶段加 150ms 延时模拟；signal 中止时以 AbortError 拒绝，支撑 Composer 的
 * 取消 / 重试路径（迟到的拒绝由 Composer 侧 controller 比对挡掉）。
 */

export interface MockUploadCallbacks {
  signal?: AbortSignal;
  /** 上传会话建立后立即回传资源 id，供取消/重试使用；此时仍不可提交给 Run。 */
  onSession?: (resourceId: string) => void;
  /** 进入完成前校验阶段触发。 */
  onProcessing?: () => void;
}

export interface MockTemporaryInput {
  input_file_id: string;
  status: "uploaded";
}

/** 每个模拟阶段的延时；完整上传约 300ms。 */
const STAGE_DELAY_MS = 150;

function abortError(): DOMException {
  return new DOMException("The upload was aborted.", "AbortError");
}

export function uploadTemporaryInput(
  _file: File,
  callbacks: MockUploadCallbacks = {},
): Promise<MockTemporaryInput> {
  const { signal, onSession, onProcessing } = callbacks;
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const resourceId = `input_${crypto.randomUUID()}`;
    let processingTimer: ReturnType<typeof setTimeout> | undefined;
    let doneTimer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (processingTimer !== undefined) clearTimeout(processingTimer);
      if (doneTimer !== undefined) clearTimeout(doneTimer);
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    onSession?.(resourceId);
    processingTimer = setTimeout(() => onProcessing?.(), STAGE_DELAY_MS);
    doneTimer = setTimeout(() => {
      cleanup();
      resolve({ input_file_id: resourceId, status: "uploaded" });
    }, STAGE_DELAY_MS * 2);
  });
}

/** 取消临时资源：mock 无服务端状态，直接成功。 */
export function cancelTemporaryInput(_resourceId: string): Promise<void> {
  return Promise.resolve();
}

/** 提交前的资源状态校验：mock 资源恒为已上传。 */
export function getTemporaryInput(resourceId: string): Promise<MockTemporaryInput> {
  return Promise.resolve({ input_file_id: resourceId, status: "uploaded" });
}
