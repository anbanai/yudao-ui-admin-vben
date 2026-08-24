import { APP_LINK_TYPE_ENUM } from './data';

/** 获取链接参数名。商品列表通过 categoryId 筛选，其余详情使用 id。 */
export function getLinkParamKey(type?: APP_LINK_TYPE_ENUM) {
  return type === APP_LINK_TYPE_ENUM.PRODUCT_LIST ? 'categoryId' : 'id';
}

/** 在站内链接上设置参数，并保留已有查询参数。 */
export function appendLinkParam(path: string, key: string, value: number) {
  const url = new URL(path, 'http://127.0.0.1');
  url.searchParams.set(key, `${value}`);
  return `${url.pathname}${url.search}`;
}

/** 给需要选择具体数据的链接补充可读名称。 */
export function formatAppLinkName(baseName: string, detailName?: string) {
  return detailName ? `${baseName}：${detailName}` : baseName;
}

/** 更新具体数据名称；没有重新选择记录时保留已有名称。 */
export function resolveAppLinkName(currentName: string, detailName?: string) {
  return detailName
    ? formatAppLinkName(currentName.split('：')[0]!, detailName)
    : currentName;
}

/** 详情记录优先展示商品名，其次展示记录名称或标题。 */
export function getLinkDetailName(row?: Record<string, unknown>) {
  if (!row) {
    return undefined;
  }
  for (const key of ['spuName', 'name', 'title']) {
    const value = row[key];
    if (typeof value === 'string' && value) {
      return value;
    }
  }
  return undefined;
}
