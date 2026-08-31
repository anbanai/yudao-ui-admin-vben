import { describe, expect, it } from 'vitest';

import {
  createSpuSelectionRowsLoader,
  createSpuSelectionSession,
  loadSpuSelectionRows,
  mergeSpuSelectionRecords,
} from './spu-table-select-utils';

describe('商品表格多选记录', () => {
  it('合并跨页保留的旧商品和当前页新选择的商品', () => {
    const reservedSpus = [{ id: 1, name: '旧商品' }];
    const currentSpus = [{ id: 2, name: '新商品' }];

    expect(mergeSpuSelectionRecords(reservedSpus, currentSpus)).toEqual([
      { id: 1, name: '旧商品' },
      { id: 2, name: '新商品' },
    ]);
  });

  it('同一商品同时出现在保留记录和当前页时只返回当前页数据', () => {
    const reservedSpus = [{ id: 1, name: '旧名称' }];
    const currentSpus = [{ id: 1, name: '新名称' }];

    expect(mergeSpuSelectionRecords(reservedSpus, currentSpus)).toEqual([
      { id: 1, name: '新名称' },
    ]);
  });
});

describe('商品选择弹窗会话', () => {
  it('只允许最新且未关闭的弹窗会话继续回填选择', () => {
    const selectionSession = createSpuSelectionSession();
    const firstSessionId = selectionSession.begin();
    const secondSessionId = selectionSession.begin();

    expect(selectionSession.isActive(firstSessionId)).toBe(false);
    expect(selectionSession.isActive(secondSessionId)).toBe(true);

    selectionSession.invalidate();
    expect(selectionSession.isActive(secondSessionId)).toBe(false);
  });

  it('等待查询完成后再读取用于回显的商品行', async () => {
    let resolveQuery: (() => void) | undefined;
    let rows: Array<{ id: number; name: string }> = [];
    const query = new Promise<void>((resolve) => {
      resolveQuery = resolve;
    });
    const loadingRows = loadSpuSelectionRows(
      async () => {
        await query;
        rows = [{ id: 1, name: '已选商品' }];
      },
      () => true,
      () => rows,
    );

    expect(rows).toEqual([]);
    resolveQuery?.();
    await expect(loadingRows).resolves.toEqual([{ id: 1, name: '已选商品' }]);
  });

  it('关闭重开时等待前一次查询结束后再发起新查询', async () => {
    const loadRows = createSpuSelectionRowsLoader();
    let resolveFirstQuery: (() => void) | undefined;
    let firstSessionActive = true;
    let secondQueryStarted = false;
    const firstQuery = new Promise<void>((resolve) => {
      resolveFirstQuery = resolve;
    });

    const firstLoading = loadRows(
      () => firstQuery,
      () => firstSessionActive,
      () => [{ id: 1 }],
    );
    await Promise.resolve();
    firstSessionActive = false;
    const secondLoading = loadRows(
      async () => {
        secondQueryStarted = true;
      },
      () => true,
      () => [{ id: 2 }],
    );

    await Promise.resolve();
    expect(secondQueryStarted).toBe(false);
    resolveFirstQuery?.();
    await expect(firstLoading).resolves.toEqual([]);
    await expect(secondLoading).resolves.toEqual([{ id: 2 }]);
  });
});
