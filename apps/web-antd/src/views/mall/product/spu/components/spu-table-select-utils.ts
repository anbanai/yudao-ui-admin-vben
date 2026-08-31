import type { MallSpuApi } from '#/api/mall/product/spu';

export function createSpuSelectionSession() {
  let activeSessionId = 0;
  return {
    begin() {
      activeSessionId += 1;
      return activeSessionId;
    },
    invalidate() {
      activeSessionId += 1;
    },
    isActive(sessionId: number) {
      return sessionId === activeSessionId;
    },
  };
}

export async function loadSpuSelectionRows(
  query: () => Promise<void>,
  isActive: () => boolean,
  getRows: () => MallSpuApi.Spu[],
): Promise<MallSpuApi.Spu[]> {
  await query();
  return isActive() ? getRows() : [];
}

export function createSpuSelectionRowsLoader() {
  let pendingLoad: Promise<MallSpuApi.Spu[]> = Promise.resolve([]);
  return (
    query: () => Promise<void>,
    isActive: () => boolean,
    getRows: () => MallSpuApi.Spu[],
  ): Promise<MallSpuApi.Spu[]> => {
    const currentLoad = pendingLoad.then(() => {
      return isActive() ? loadSpuSelectionRows(query, isActive, getRows) : [];
    });
    pendingLoad = currentLoad.catch(() => []);
    return currentLoad;
  };
}

export function mergeSpuSelectionRecords(
  reservedSpus: MallSpuApi.Spu[],
  currentSpus: MallSpuApi.Spu[],
): MallSpuApi.Spu[] {
  const selectedSpus = new Map<number, MallSpuApi.Spu>();
  for (const spu of [...reservedSpus, ...currentSpus]) {
    if (spu.id !== undefined) {
      selectedSpus.set(spu.id, spu);
    }
  }
  return [...selectedSpus.values()];
}
