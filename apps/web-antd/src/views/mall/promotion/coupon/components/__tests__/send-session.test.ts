import { describe, expect, it } from 'vitest';

import {
  createCouponSendSession,
  parseMobileList,
  readBatchSnapshot,
} from '../send-session';

const batch = {
  id: 17,
  templateId: 1,
  status: 0,
  totalCount: 2,
  successCount: 0,
  failureCount: 0,
  templateSnapshot: '{"name":"新人券","validityType":2,"fixedEndTerm":7}',
  userSnapshot: '3,5',
  mobileSnapshot: '',
  failureDetails: '',
};
function setup(overrides = {}) {
  const calls: string[] = [];
  const api = {
    preview: async (request: any) => {
      calls.push(`preview:${request.idempotencyKey}`);
      return { ...batch };
    },
    submit: async (id: number) => {
      calls.push(`submit:${id}`);
      return { ...batch, status: 1, successCount: 2 };
    },
    read: async (id: number) => {
      calls.push(`read:${id}`);
      return { ...batch, status: 1, successCount: 2 };
    },
    ...overrides,
  };
  return { calls, session: createCouponSendSession(api) };
}
describe('coupon issuance session', () => {
  it('canceling a preview never submits', async () => {
    const { session, calls } = setup();
    await session.preview({ templateId: 1, userIds: [3, 5] });
    session.cancel();
    expect(calls.map((call) => call.split(':')[0])).toEqual(['preview']);
    expect(session.state.batch).toBeUndefined();
    await expect(session.confirm()).rejects.toThrow('请修正名单并重新预检');
  });
  it('only explicit confirmation submits the snapshot once, including double clicks', async () => {
    const { session, calls } = setup();
    await session.preview({ templateId: 1, userIds: [3, 5] });
    await Promise.all([session.confirm(), session.confirm()]);
    expect(calls.filter((c) => c.startsWith('submit'))).toEqual(['submit:17']);
    expect(session.state.batch?.successCount).toBe(2);
    await session.confirm();
    expect(calls.filter((c) => c.startsWith('submit'))).toHaveLength(1);
  });
  it('blocks batches with failures or no recipients', async () => {
    for (const result of [
      { ...batch, failureCount: 1 },
      { ...batch, totalCount: 0, userSnapshot: '' },
    ]) {
      const { session, calls } = setup({ preview: async () => result });
      await session.preview({ templateId: 1, mobiles: ['13800000000'] });
      await expect(session.confirm()).rejects.toThrow('请修正名单并重新预检');
      expect(calls).toEqual([]);
    }
  });
  it('recovers an ambiguous submit by reading the same batch without reissuing', async () => {
    const { session, calls } = setup({
      submit: async () => {
        calls.push('timeout');
        throw new Error('timeout');
      },
    });
    await session.preview({ templateId: 1, userIds: [3] });
    await session.confirm();
    expect(calls.slice(1)).toEqual(['timeout', 'read:17']);
    expect(session.state.batch?.status).toBe(1);
  });
  it('preserves batch and refuses a fresh preview when submit and recovery both fail', async () => {
    const { session } = setup({
      submit: async () => {
        throw new Error('timeout');
      },
      read: async () => {
        throw new Error('offline');
      },
    });
    await session.preview({ templateId: 1, userIds: [3] });
    await expect(session.confirm()).rejects.toThrow('timeout');
    expect(session.state.batch?.id).toBe(17);
    expect(session.state.uncertain).toBe(true);
    session.cancel();
    expect(session.state.batch?.id).toBe(17);
    await expect(
      session.preview({ templateId: 2, userIds: [3] }),
    ).rejects.toThrow('请先查询或重试当前批次');
  });
  it('reuses the idempotency key after an interrupted preview', async () => {
    const keys: string[] = [];
    const { session } = setup({
      preview: async (r: any) => {
        keys.push(r.idempotencyKey);
        throw new Error('offline');
      },
    });
    for (let i = 0; i < 2; i++)
      await session.preview({ templateId: 1, tagIds: [7] }).catch(() => {});
    expect(keys[0]).toBe(keys[1]);
  });
});
describe('import and confirmation snapshots', () => {
  it('deduplicates phones, strips BOM and reports malformed rows without inventing accounts', () => {
    expect(
      parseMobileList('\uFEFF13800000000\n13800000000,13900000000；bad'),
    ).toEqual({ mobiles: ['13800000000', '13900000000'], invalid: ['bad'] });
  });
  it('reads exact server template, recipients, validity and failures from JSON snapshots', () => {
    const result = readBatchSnapshot(batch);
    expect(result.template.name).toBe('新人券');
    expect(result.template.fixedEndTerm).toBe(7);
    expect(result.users).toEqual([3, 5]);
    expect(() =>
      readBatchSnapshot({ ...batch, templateSnapshot: 'bad' }),
    ).toThrow(SyntaxError);
  });
});

describe('interrupted browser session', () => {
  it('restores an unknown submission and blocks fresh preview until recovery succeeds', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const api = {
      preview: async () => ({ ...batch }),
      submit: async () => {
        throw new Error('timeout');
      },
      read: async () => {
        throw new Error('offline');
      },
    };
    const first = createCouponSendSession(api, storage);
    await first.preview({ templateId: 1, userIds: [3] });
    await first.confirm().catch(() => {});
    const reopened = createCouponSendSession(api, storage);
    expect(reopened.state.uncertain).toBe(true);
    await expect(
      reopened.preview({ templateId: 1, userIds: [3] }),
    ).rejects.toThrow('请先查询或重试当前批次');
    await expect(reopened.restore()).rejects.toThrow('offline');
    expect(reopened.state.uncertain).toBe(true);
    const recovered = createCouponSendSession(
      { ...api, read: async () => ({ ...batch, status: 1, successCount: 2 }) },
      storage,
    );
    await recovered.restore();
    expect(recovered.state.batch?.status).toBe(1);
    expect(recovered.state.uncertain).toBe(false);
    const next = createCouponSendSession(api, storage);
    expect(next.state.uncertain).toBe(false);
  });
});

it('clears a successful pending batch before starting another browser session', async () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const api = {
    preview: async () => ({ ...batch }),
    submit: async () => ({ ...batch, status: 1, successCount: 2 }),
    read: async () => ({ ...batch }),
  };
  const session = createCouponSendSession(api, storage);
  await session.preview({ templateId: 1, userIds: [3, 5] });
  await session.confirm();
  expect(createCouponSendSession(api, storage).state.uncertain).toBe(false);
});

it('keeps an in-flight batch protected when the query still returns preview status', async () => {
  const values = new Map<string, string>([
    ['marketing-coupon-pending-batch', '17'],
  ]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const api = {
    preview: async () => ({ ...batch }),
    submit: async () => ({ ...batch, status: 1, successCount: 2 }),
    read: async () => ({ ...batch }),
  };
  const session = createCouponSendSession(api, storage);
  await session.restore();
  expect(session.state.uncertain).toBe(true);
  session.cancel();
  expect(session.state.batch?.id).toBe(17);
  await expect(
    session.preview({ templateId: 1, userIds: [3] }),
  ).rejects.toThrow('请先查询或重试当前批次');
  await session.confirm();
  expect(session.state.batch?.status).toBe(1);
  expect(session.state.uncertain).toBe(false);
});

it('blocks a pre-existing component when another component left a pending batch', async () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const api = {
    preview: async () => ({ ...batch }),
    submit: async () => {
      throw new Error('timeout');
    },
    read: async () => {
      throw new Error('offline');
    },
  };
  const first = createCouponSendSession(api, storage);
  const second = createCouponSendSession(api, storage);
  await first.preview({ templateId: 1, userIds: [3] });
  await first.confirm().catch(() => {});
  await expect(second.restore()).rejects.toThrow('offline');
  expect(second.state.uncertain).toBe(true);
  await expect(second.preview({ templateId: 2, userIds: [3] })).rejects.toThrow(
    '请先查询或重试当前批次',
  );
});
