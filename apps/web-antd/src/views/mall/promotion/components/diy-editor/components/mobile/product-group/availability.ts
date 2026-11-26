export interface ProductGroupOption {
  id?: number;
  name: string;
  status: number;
}

export function isEnabledGroup(group: ProductGroupOption) {
  return group.status === 0;
}

export function getGroupDisplayName(id: number, groups: ProductGroupOption[]) {
  const group = groups.find((item) => item.id === id);
  if (!group) return `分组 ${id}（已删除或不可访问）`;
  return isEnabledGroup(group) ? group.name : `${group.name}（已禁用）`;
}

export function getUnavailableGroupIds(
  ids: number[],
  groups: ProductGroupOption[],
) {
  return ids.filter(
    (id) => !groups.some((group) => group.id === id && isEnabledGroup(group)),
  );
}
