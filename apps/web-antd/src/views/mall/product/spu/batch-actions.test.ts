import { describe, expect, it, vi } from 'vitest';

import {
  canBatchUpdateStatus,
  createBatchStatusController,
  executeBatchStatusUpdate,
} from './batch-actions';

describe('商品批量上下架', () => {
  it('仅允许对 1 至 100 个且状态需要变化的商品执行批量操作', () => {
    expect(canBatchUpdateStatus([], 1)).toBe(false);
    expect(canBatchUpdateStatus([{ status: 0 }], 1)).toBe(false);
    expect(canBatchUpdateStatus([{ id: 1, status: 0 }], 1)).toBe(true);
    expect(canBatchUpdateStatus([{ id: 1, status: 1 }], 0)).toBe(true);
    expect(canBatchUpdateStatus([{ id: 1, status: 1 }], 1)).toBe(false);
    expect(canBatchUpdateStatus([{ id: 1, status: -1 }], 1)).toBe(false);
    expect(
      canBatchUpdateStatus(
        Array.from({ length: 100 }, (_, index) => ({
          id: index + 1,
          status: 0,
        })),
        1,
      ),
    ).toBe(true);
    expect(
      canBatchUpdateStatus(
        Array.from({ length: 101 }, (_, index) => ({
          id: index + 1,
          status: 0,
        })),
        1,
      ),
    ).toBe(false);
  });

  it('汇总每个商品的成功和失败结果', async () => {
    const result = await executeBatchStatusUpdate(
      [
        { id: 1, status: 0 },
        { id: 2, status: 0 },
        { id: 3, status: 0 },
      ],
      1,
      async ({ id }) => {
        if (id === 2) {
          throw new Error('商品不存在');
        }
      },
    );

    expect(result).toEqual({ failureCount: 1, successCount: 2 });
  });

  it('最多并发执行五个状态更新请求', async () => {
    let activeCount = 0;
    let maxActiveCount = 0;
    let releaseRequests!: () => void;
    const requestGate = new Promise<void>((resolve) => {
      releaseRequests = resolve;
    });
    const rows = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      status: 0,
    }));

    const pending = executeBatchStatusUpdate(rows, 1, async () => {
      activeCount += 1;
      maxActiveCount = Math.max(maxActiveCount, activeCount);
      await requestGate;
      activeCount -= 1;
    });

    await Promise.resolve();
    expect(maxActiveCount).toBe(5);
    releaseRequests();
    await pending;
    expect(maxActiveCount).toBe(5);
  });

  it('确认期间忽略重复触发并固定首次选择的商品', async () => {
    let releaseConfirmation!: () => void;
    const confirmationGate = new Promise<void>((resolve) => {
      releaseConfirmation = resolve;
    });
    const confirm = vi.fn(() => confirmationGate);
    const update = vi.fn(async () => undefined);
    const loadingChanges: boolean[] = [];
    const controller = createBatchStatusController({
      confirm,
      onLoadingChange: (loading) => loadingChanges.push(loading),
      update,
    });
    const rows = [{ id: 1, status: 0 }];

    const firstRun = controller.run(rows, 1);
    rows.push({ id: 2, status: 0 });
    const secondResult = await controller.run(rows, 1);

    expect(secondResult).toEqual({ status: 'busy' });
    expect(confirm).toHaveBeenCalledOnce();
    expect(loadingChanges).toEqual([true]);

    releaseConfirmation();
    await expect(firstRun).resolves.toEqual({
      failureCount: 0,
      status: 'completed',
      successCount: 1,
    });
    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith({ id: 1, status: 1 });
    expect(loadingChanges).toEqual([true, false]);
  });

  it('取消确认时结束忙碌状态且不发送更新请求', async () => {
    const update = vi.fn(async () => undefined);
    const loadingChanges: boolean[] = [];
    const controller = createBatchStatusController({
      confirm: vi.fn(async () => {
        throw new Error('cancelled');
      }),
      onLoadingChange: (loading) => loadingChanges.push(loading),
      update,
    });

    await expect(controller.run([{ id: 1, status: 0 }], 1)).resolves.toEqual({
      status: 'cancelled',
    });
    expect(update).not.toHaveBeenCalled();
    expect(loadingChanges).toEqual([true, false]);
  });
});
