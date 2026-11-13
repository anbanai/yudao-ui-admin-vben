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
    cancel: async (id: number) => {
      calls.push(`cancel:${id}`);
      return { ...batch, status: 3, failureDetails: 'CANCELED_BY_OPERATOR' };
    },
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
  it.each([1, 2, 3])(
    'releases recovered terminal status %s for closing and a fresh preview',
    async (status) => {
      const values = new Map([['marketing-coupon-pending-batch', '17']]);
      const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
          values.set(key, value);
        },
        removeItem: (key: string) => {
          values.delete(key);
        },
      };
      const keys: string[] = [];
      let submitted = 0;
      const session = createCouponSendSession(
        {
          cancel: async () => ({ ...batch, status: 3 }),
          preview: async (request) => {
            keys.push(request.idempotencyKey);
            return { ...batch };
          },
          submit: async () => {
            submitted++;
            return { ...batch, status: 1 };
          },
          read: async () => ({
            ...batch,
            status,
            failureDetails: status === 2 ? '模板已变更' : '',
          }),
        },
        storage,
      );
      await session.restore();
      expect(session.state.batch?.status).toBe(status);
      expect(session.state.uncertain).toBe(false);
      expect(values.has('marketing-coupon-pending-batch')).toBe(false);
      await session.confirm();
      expect(submitted).toBe(0);
      session.cancel();
      expect(session.state.batch).toBeUndefined();
      await session.preview({ templateId: 1, userIds: [3, 5] });
      session.cancel();
      await session.preview({ templateId: 1, userIds: [3, 5] });
      expect(keys[0]).not.toBe(keys[1]);
    },
  );
  it.each([2, 3])(
    'handles terminal status %s returned directly by submit',
    async (status) => {
      const { session } = setup({ submit: async () => ({ ...batch, status }) });
      await session.preview({ templateId: 1, userIds: [3, 5] });
      await session.confirm();
      expect(session.state.uncertain).toBe(false);
      session.cancel();
      expect(session.state.batch).toBeUndefined();
    },
  );
  it.each([2, 3])(
    'resolves a timed-out submission when the query returns terminal status %s',
    async (status) => {
      const { session } = setup({
        submit: async () => {
          throw new Error('timeout');
        },
        read: async () => ({ ...batch, status }),
      });
      await session.preview({ templateId: 1, userIds: [3, 5] });
      await session.confirm();
      expect(session.state.batch?.status).toBe(status);
      expect(session.state.uncertain).toBe(false);
      session.cancel();
      expect(session.state.batch).toBeUndefined();
    },
  );
  it('does not release an ambiguous submission on a nonterminal submit response', async () => {
    const { session } = setup({ submit: async () => ({ ...batch }) });
    await session.preview({ templateId: 1, userIds: [3, 5] });
    await session.confirm().catch(() => {});
    expect(session.state.uncertain).toBe(true);
    session.cancel();
    expect(session.state.batch?.id).toBe(17);
  });
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

describe('safe discard of an uncertain batch', () => {
  function pendingSession(overrides = {}) {
    const calls: string[] = [];
    const values = new Map([['marketing-coupon-pending-batch', '17']]);
    const session = createCouponSendSession(
      {
        preview: async () => {
          calls.push('preview');
          return { ...batch };
        },
        submit: async () => {
          calls.push('submit');
          return { ...batch, status: 1 };
        },
        read: async () => {
          calls.push('read');
          return { ...batch };
        },
        cancel: async (id: number) => {
          calls.push(`cancel:${id}`);
          return {
            ...batch,
            status: 3,
            failureDetails: 'CANCELED_BY_OPERATOR',
          };
        },
        ...overrides,
      },
      {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
        removeItem: (key) => {
          values.delete(key);
        },
      },
    );
    return { session, calls, values };
  }
  it('safely discards the same pending batch once without submitting coupons', async () => {
    const { session, calls, values } = pendingSession();
    await session.restore();
    expect(session.state.uncertain).toBe(true);
    await Promise.all([session.discard(), session.discard()]);
    expect(calls).toEqual(['read', 'cancel:17']);
    expect(session.state.batch?.status).toBe(3);
    expect(session.state.uncertain).toBe(false);
    expect(values.has('marketing-coupon-pending-batch')).toBe(false);
    session.cancel();
    await session.preview({ templateId: 1, userIds: [3, 5] });
    expect(calls).toEqual(['read', 'cancel:17', 'preview']);
  });
  it.each([1, 2, 3])(
    'uses terminal status %s from the query when discard races a submission or times out',
    async (status) => {
      let reads = 0;
      const { session, values } = pendingSession({
        cancel: async () => {
          throw new Error('cancel rejected or timeout');
        },
        read: async () =>
          ++reads === 1
            ? { ...batch }
            : { ...batch, status, successCount: status === 1 ? 2 : 0 },
      });
      await session.restore();
      await session.discard();
      expect(session.state.batch?.status).toBe(status);
      expect(session.state.batch?.successCount).toBe(status === 1 ? 2 : 0);
      expect(session.state.uncertain).toBe(false);
      expect(values.has('marketing-coupon-pending-batch')).toBe(false);
    },
  );
  it.each(['pending', 'offline'])(
    'retains protection when discard is ambiguous and recovery is %s',
    async (recovery) => {
      let reads = 0;
      const { session, values } = pendingSession({
        cancel: async () => {
          throw new Error('cancel timeout');
        },
        read: async () => {
          if (++reads > 1 && recovery === 'offline') throw new Error('offline');
          return { ...batch };
        },
      });
      await session.restore();
      await expect(session.discard()).rejects.toThrow('cancel timeout');
      expect(session.state.uncertain).toBe(true);
      expect(values.get('marketing-coupon-pending-batch')).toBe('17');
      session.cancel();
      expect(session.state.batch?.id).toBe(17);
      await expect(
        session.preview({ templateId: 1, userIds: [3] }),
      ).rejects.toThrow('请先查询或重试当前批次');
    },
  );
  it('does not call the discard API for an already terminal batch', async () => {
    const { session, calls } = pendingSession({
      read: async () => ({ ...batch, status: 2 }),
    });
    await session.restore();
    await session.discard();
    expect(calls).toEqual([]);
    session.cancel();
    expect(session.state.batch).toBeUndefined();
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
      cancel: async () => ({ ...batch, status: 3 }),
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
    cancel: async () => ({ ...batch, status: 3 }),
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
    cancel: async () => ({ ...batch, status: 3 }),
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
    cancel: async () => ({ ...batch, status: 3 }),
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
