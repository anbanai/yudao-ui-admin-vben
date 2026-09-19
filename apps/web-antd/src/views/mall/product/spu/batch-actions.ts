export interface ProductStatusItem {
  id?: number;
  status?: number;
}

export interface BatchStatusResult {
  failureCount: number;
  successCount: number;
}

export type BatchStatusControllerResult =
  | (BatchStatusResult & { status: 'completed' })
  | { status: 'busy' | 'cancelled' | 'invalid' };

export interface BatchStatusControllerOptions {
  confirm: (
    rows: ProductStatusItem[],
    targetStatus: number,
  ) => Promise<unknown>;
  onCompleted?: (
    result: BatchStatusResult,
    targetStatus: number,
  ) => Promise<void> | void;
  onLoadingChange?: (loading: boolean) => void;
  update: (data: { id: number; status: number }) => Promise<unknown>;
}

const MAX_BATCH_SIZE = 100;
const MAX_CONCURRENCY = 5;

export function canBatchUpdateStatus(
  rows: ProductStatusItem[],
  targetStatus: number,
) {
  let sourceStatus: null | number = null;
  if (targetStatus === 1) {
    sourceStatus = 0;
  } else if (targetStatus === 0) {
    sourceStatus = 1;
  }
  return (
    sourceStatus !== null &&
    rows.length > 0 &&
    rows.length <= MAX_BATCH_SIZE &&
    rows.every((row) => row.id && row.status === sourceStatus)
  );
}

export async function executeBatchStatusUpdate(
  rows: ProductStatusItem[],
  targetStatus: number,
  update: (data: { id: number; status: number }) => Promise<unknown>,
): Promise<BatchStatusResult> {
  let nextIndex = 0;
  let successCount = 0;
  let failureCount = 0;

  async function worker() {
    while (nextIndex < rows.length) {
      const row = rows[nextIndex++];
      try {
        await update({ id: row!.id!, status: targetStatus });
        successCount += 1;
      } catch {
        failureCount += 1;
      }
    }
  }

  const workerCount = Math.min(MAX_CONCURRENCY, rows.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return { failureCount, successCount };
}

export function createBatchStatusController(
  options: BatchStatusControllerOptions,
) {
  let isRunning = false;

  return {
    async run(
      rows: ProductStatusItem[],
      targetStatus: number,
    ): Promise<BatchStatusControllerResult> {
      if (isRunning) return { status: 'busy' };
      if (!canBatchUpdateStatus(rows, targetStatus)) {
        return { status: 'invalid' };
      }

      const selectedRows = rows.map((row) => ({ ...row }));
      isRunning = true;
      options.onLoadingChange?.(true);
      try {
        try {
          await options.confirm(selectedRows, targetStatus);
        } catch {
          return { status: 'cancelled' };
        }

        const result = await executeBatchStatusUpdate(
          selectedRows,
          targetStatus,
          options.update,
        );
        await options.onCompleted?.(result, targetStatus);
        return { ...result, status: 'completed' };
      } finally {
        isRunning = false;
        options.onLoadingChange?.(false);
      }
    },
  };
}
