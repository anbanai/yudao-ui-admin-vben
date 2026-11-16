import { requestClient } from '#/api/request';

export interface ShareCoverConfig {
  default: string;
  home: string;
  user: string;
  pages: Record<string, string>;
}

export interface ShareCoverConfigRecord {
  id?: number;
  category: string;
  name: string;
  key: string;
  value: string;
  type: number;
  visible: boolean;
  remark: string;
}

export function getShareCoverConfig() {
  return requestClient.get<ShareCoverConfig>('/infra/share-cover/get');
}

export function saveShareCoverConfig(data: ShareCoverConfig) {
  return requestClient.put('/infra/share-cover/save', data);
}
