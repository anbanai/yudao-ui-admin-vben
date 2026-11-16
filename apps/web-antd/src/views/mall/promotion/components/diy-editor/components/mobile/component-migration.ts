interface DiyComponentLike {
  id: string;
  property?: Record<string, unknown>;
}

/** 将旧版按分类查询的 ProductGroup 配置迁移为独立 ProductCategory。 */
export function migrateLegacyProductGroupComponent<T extends DiyComponentLike>(
  item: T,
): T {
  if (
    item.id !== 'ProductGroup' ||
    !Array.isArray(item.property?.categoryIds) ||
    (Array.isArray(item.property?.groupIds) &&
      item.property.groupIds.length > 0)
  ) {
    return item;
  }
  const property = { ...item.property };
  delete property.groupIds;
  return { ...item, id: 'ProductCategory', property };
}
