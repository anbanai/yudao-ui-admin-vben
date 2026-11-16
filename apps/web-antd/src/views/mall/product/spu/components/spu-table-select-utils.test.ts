import { describe, expect, it } from 'vitest';

import {
  createSpuSelectionRowsLoader,
  createSpuSelectionSession,
  createSpuSelectionStore,
  loadSpuSelectionRows,
  mergeSpuSelectionRecords,
} from './spu-table-select-utils';

describe('商品选择弹窗独立选中状态', () => {
  it('搜索到新结果并勾选商品时保留搜索前的选择', () => {
    const selectionStore = createSpuSelectionStore([
      { id: 1, name: '商品一' },
      { id: 2, name: '商品二' },
    ]);

    selectionStore.reconcilePage(
      [
        { id: 3, name: '商品三' },
        { id: 4, name: '商品四' },
      ],
      [{ id: 3, name: '商品三' }],
    );

    expect(selectionStore.getSelected()).toEqual([
      { id: 1, name: '商品一' },
      { id: 2, name: '商品二' },
      { id: 3, name: '商品三' },
    ]);
  });

  it('重新搜索到已选商品并取消勾选时只移除该商品', () => {
    const selectionStore = createSpuSelectionStore([
      { id: 1, name: '商品一' },
      { id: 2, name: '商品二' },
      { id: 3, name: '商品三' },
    ]);

    selectionStore.reconcilePage(
      [
        { id: 1, name: '商品一' },
        { id: 2, name: '商品二' },
      ],
      [{ id: 1, name: '商品一（最新）' }],
    );

    expect(selectionStore.getSelected()).toEqual([
      { id: 1, name: '商品一（最新）' },
      { id: 3, name: '商品三' },
    ]);
  });

  it('查询刷新后只回显当前结果中已经选过的商品', () => {
    const selectionStore = createSpuSelectionStore([
      { id: 1, name: '商品一' },
      { id: 3, name: '商品三' },
    ]);

    expect(
      selectionStore.getSelectedFromPage([
        { id: 2, name: '商品二' },
        { id: 3, name: '商品三（最新）' },
        { id: 4, name: '商品四' },
      ]),
    ).toEqual([{ id: 3, name: '商品三（最新）' }]);
  });

  it('读取空的查询结果时不会清空已保存的选择', () => {
    const selectionStore = createSpuSelectionStore([
      { id: 1, name: '商品一' },
      { id: 2, name: '商品二' },
    ]);

    expect(selectionStore.getSelectedFromPage([])).toEqual([]);

    expect(selectionStore.getSelected()).toEqual([
      { id: 1, name: '商品一' },
      { id: 2, name: '商品二' },
    ]);
  });
});

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
