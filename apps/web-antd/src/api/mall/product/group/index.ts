import type { PageParam, PageResult } from '@vben/request';

import type { MallSpuApi } from '#/api/mall/product/spu';

import { CommonStatusEnum } from '@vben/constants';

import { requestClient } from '#/api/request';

export namespace MallProductGroupApi {
  export interface Group {
    id?: number;
    name: string;
    sort: number;
    status: number;
    storefrontVisible: boolean;
    spuCount?: number;
    saleSpuCount?: number;
    remark?: string;
    createTime?: Date;
    disabled?: boolean;
  }

  export interface GroupMemberBatchRequest {
    groupId: number;
    spuIds: number[];
  }

  export interface GroupMemberSortRequest {
    groupId: number;
    sort: number;
    spuId: number;
  }

  export interface SpuBatchUpdateRequest {
    spuIds: number[];
    groupIds: number[];
    operation: 'add' | 'remove';
  }
}

export function createGroup(data: MallProductGroupApi.Group) {
  return requestClient.post<number>('/product/group/create', data);
}

export function updateGroup(data: MallProductGroupApi.Group) {
  return requestClient.put('/product/group/update', data);
}

export function deleteGroup(id: number) {
  return requestClient.delete(`/product/group/delete?id=${id}`);
}

export function getGroup(id: number) {
  return requestClient.get<MallProductGroupApi.Group>(
    `/product/group/get?id=${id}`,
  );
}

export function getGroupPage(params: PageParam) {
  return requestClient.get<PageResult<MallProductGroupApi.Group>>(
    '/product/group/page',
    { params },
  );
}

export function getSimpleGroupList() {
  return requestClient.get<MallProductGroupApi.Group[]>(
    '/product/group/list-all-simple',
  );
}

export async function getSelectableGroupList() {
  const groups = await getSimpleGroupList();
  return groups.map((group) => ({
    ...group,
    label: getGroupLabel(group),
    disabled: group.status !== CommonStatusEnum.ENABLE,
  }));
}

export function getGroupLabel(group: MallProductGroupApi.Group) {
  const labels = [
    ...(group.storefrontVisible === false ? ['内部'] : []),
    ...(group.status === CommonStatusEnum.ENABLE ? [] : ['停用']),
  ];
  return labels.length > 0
    ? `${group.name}（${labels.join('、')}）`
    : group.name;
}

/** 大页按接口上限分批补充分组，避免逐商品查询。 */
export async function getSpuGroupMap(spuIds: number[]) {
  const ids = [...new Set(spuIds)];
  const result: Record<number, number[]> = {};
  for (let offset = 0; offset < ids.length; offset += 200) {
    Object.assign(
      result,
      await requestClient.get<Record<number, number[]>>(
        '/product/group/spu-group-map',
        { params: { spuIds: ids.slice(offset, offset + 200) } },
      ),
    );
  }
  return result;
}

export function updateSpuGroups(
  data: MallProductGroupApi.SpuBatchUpdateRequest,
) {
  return requestClient.post<boolean>('/product/group/spu-batch-update', data);
}

export function getGroupSpuPage(params: PageParam) {
  return requestClient.get<PageResult<MallSpuApi.Spu>>(
    '/product/group/spu-page',
    { params },
  );
}

export function addGroupSpus(
  data: MallProductGroupApi.GroupMemberBatchRequest,
) {
  return requestClient.post('/product/group/spu-add', data);
}

export function removeGroupSpus(
  data: MallProductGroupApi.GroupMemberBatchRequest,
) {
  return requestClient.delete('/product/group/spu-remove', { data });
}

export function updateGroupSpuSort(
  data: MallProductGroupApi.GroupMemberSortRequest,
) {
  return requestClient.put('/product/group/spu-sort', data);
}

export function getSpuGroupIds(spuId: number) {
  return requestClient.get<number[]>(
    `/product/group/spu-group-ids?spuId=${spuId}`,
  );
}
