import { describe, expect, it } from 'vitest';

import {
  buildGroupMemberBatchRequest,
  mergeGroupMemberCandidates,
} from './member-utils';

describe('商品分组成员操作', () => {
  it('仅提交已有商品编号，并去除重复和当前成员', () => {
    expect(
      mergeGroupMemberCandidates(
        [
          { id: 1, name: '商品 A' },
          { id: 2, name: '商品 B' },
          { id: 2, name: '商品 B' },
          { id: 3, name: '商品 C' },
        ],
        [1, 3],
      ),
    ).toEqual([2]);
  });

  it('构造独立的分组成员批量请求', () => {
    expect(buildGroupMemberBatchRequest(8, [2, 2, 5])).toEqual({
      groupId: 8,
      spuIds: [2, 5],
    });
  });
});
