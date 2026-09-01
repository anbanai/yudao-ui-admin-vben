import type { MallSpuApi } from '#/api/mall/product/spu';

export function normalizeSpuIds(spuIds: number[]) {
  return [...new Set(spuIds.filter((id) => Number.isInteger(id) && id > 0))];
}

export function mergeGroupMemberCandidates(
  selectedSpus: MallSpuApi.Spu[],
  currentSpuIds: number[],
) {
  const currentIds = new Set(currentSpuIds);
  return normalizeSpuIds(
    selectedSpus
      .map((spu) => spu.id)
      .filter((id): id is number => id !== undefined && !currentIds.has(id)),
  );
}

export function buildGroupMemberBatchRequest(
  groupId: number,
  spuIds: number[],
) {
  return { groupId, spuIds: normalizeSpuIds(spuIds) };
}
