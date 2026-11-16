/** 旧分组未保存可见性时继续作为公开分组。 */
export interface StorefrontGroup {
  id?: number;
  name: string;
  status: number;
  storefrontVisible?: boolean;
}

export function isStorefrontGroup(group: StorefrontGroup) {
  return group.status === 0 && group.storefrontVisible !== false;
}

export function getGroupDisplayName(id: number, groups: StorefrontGroup[]) {
  const group = groups.find((item) => item.id === id);
  if (!group) return `分组 ${id}（已删除或不可访问）`;
  const reasons = [
    ...(group.status === 0 ? [] : ['已禁用']),
    ...(group.storefrontVisible === false ? ['仅内部使用'] : []),
  ];
  return reasons.length > 0
    ? `${group.name}（${reasons.join('、')}）`
    : group.name;
}

export function getUnavailableGroupIds(
  ids: number[],
  groups: StorefrontGroup[],
) {
  return ids.filter(
    (id) =>
      !groups.some((group) => group.id === id && isStorefrontGroup(group)),
  );
}
