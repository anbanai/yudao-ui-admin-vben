import { requestClient } from '#/api/request';

export namespace MemberLevelApi {
  /** 会员等级信息 */
  export interface Level {
    id?: number;
    name: string;
    level: number;
    experience: number;
    value: number;
    discountPercent: number;
    /** 消费返积分倍率，千分比：1200 表示 1.2 倍 */
    pointTradeGiveMultiplier: number;
    icon: string;
    bgUrl: string;
    status: number;
    createTime?: Date;
  }
}

/** 查询会员等级列表 */
export function getLevelList(params: MemberLevelApi.Level) {
  return requestClient.get<MemberLevelApi.Level[]>('/member/level/list', {
    params,
  });
}

/** 查询会员等级详情 */
export function getLevel(id: number) {
  return requestClient.get<MemberLevelApi.Level>(`/member/level/get?id=${id}`);
}

/** 查询会员等级 - 精简信息列表 */
export function getSimpleLevelList() {
  return requestClient.get<MemberLevelApi.Level[]>(
    '/member/level/list-all-simple',
  );
}

/** 新增会员等级 */
export function createLevel(data: MemberLevelApi.Level) {
  return requestClient.post('/member/level/create', data);
}

/** 修改会员等级 */
export function updateLevel(data: MemberLevelApi.Level) {
  return requestClient.put('/member/level/update', data);
}

/** 删除会员等级 */
export function deleteLevel(id: number) {
  return requestClient.delete(`/member/level/delete?id=${id}`);
}
