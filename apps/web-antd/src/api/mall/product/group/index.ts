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
    disabled: group.status !== CommonStatusEnum.ENABLE,
  }));
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
