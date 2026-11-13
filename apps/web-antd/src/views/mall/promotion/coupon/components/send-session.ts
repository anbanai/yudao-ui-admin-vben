import type { MallCouponApi } from '#/api/mall/promotion/coupon/coupon';
import type { MallCouponTemplateApi } from '#/api/mall/promotion/coupon/couponTemplate';

import { reactive } from 'vue';

type SendRequest = Omit<MallCouponApi.CouponSendReqVO, 'idempotencyKey'>;
type Batch = MallCouponApi.SendBatch;
interface SendApi {
  preview: (request: MallCouponApi.CouponSendReqVO) => Promise<Batch>;
  submit: (batchId: number) => Promise<Batch>;
  read: (batchId: number) => Promise<Batch>;
}

export function parseMobileList(text: string) {
  const values = [
    ...new Set(
      text
        .replace(/^\uFEFF/, '')
        .split(/[\s,;，；]+/u)
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
  return {
    mobiles: values.filter((v) => /^1[3-9]\d{9}$/.test(v)),
    invalid: values.filter((v) => !/^1[3-9]\d{9}$/.test(v)),
  };
}

/** The backend stores audience as CSV and failures as newline-separated codes. */
export function readBatchSnapshot(batch: Batch) {
  const template = JSON.parse(
    batch.templateSnapshot,
  ) as MallCouponTemplateApi.CouponTemplate;
  if (
    !template ||
    typeof template.name !== 'string' ||
    ![1, 2].includes(template.validityType)
  ) {
    throw new Error('模板快照不完整，请重新预检');
  }
  const users = batch.userSnapshot.startsWith('[')
    ? (JSON.parse(batch.userSnapshot) as number[])
    : batch.userSnapshot.split(',').filter(Boolean).map(Number);
  if (
    !Array.isArray(users) ||
    users.some((id) => !Number.isSafeInteger(id) || id <= 0) ||
    users.length !== batch.totalCount
  ) {
    throw new Error('账号快照不完整，请重新预检');
  }
  return {
    template,
    users,
    mobiles: batch.mobileSnapshot,
    failures: batch.failureDetails,
  };
}

export function createCouponSendSession(
  api: SendApi,
  storage?: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
) {
  const pendingKey = 'marketing-coupon-pending-batch';
  const pendingId = () => Number(storage?.getItem(pendingKey)) || undefined;
  const state = reactive<{ batch?: Batch; busy: boolean; uncertain: boolean }>({
    busy: false,
    uncertain: Boolean(pendingId()),
  });
  let fingerprint = '';
  let key = '';
  return {
    state,
    async restore() {
      const id = pendingId();
      if (id) {
        state.uncertain = true;
        await this.recover(id);
      }
    },
    async preview(request: SendRequest) {
      if (state.busy || state.uncertain || pendingId())
        throw new Error('请先查询或重试当前批次');
      const next = JSON.stringify(request);
      if (next !== fingerprint || !key) {
        fingerprint = next;
        key = crypto.randomUUID();
      }
      state.busy = true;
      try {
        state.batch = undefined;
        const batch = await api.preview({ ...request, idempotencyKey: key });
        readBatchSnapshot(batch);
        state.batch = batch;
        return batch;
      } finally {
        state.busy = false;
      }
    },
    cancel() {
      if (state.busy || state.uncertain || pendingId()) return;
      state.batch = undefined;
      fingerprint = '';
      key = '';
    },
    async recover(id: number) {
      if (pendingId() && pendingId() !== id)
        throw new Error('请先查询待确认批次');
      if (state.busy || !Number.isSafeInteger(id) || id <= 0)
        throw new Error('请输入有效批次号');
      if (pendingId()) state.uncertain = true;
      state.busy = true;
      try {
        const batch = await api.read(id);
        readBatchSnapshot(batch);
        state.batch = batch;
        if (!state.uncertain || batch.status === 1) {
          storage?.removeItem(pendingKey);
          state.uncertain = false;
        }
      } finally {
        state.busy = false;
      }
    },
    async confirm() {
      if (state.busy || state.batch?.status === 1) return;
      const batch = state.batch;
      if (
        !batch ||
        batch.status !== 0 ||
        batch.failureCount > 0 ||
        batch.totalCount < 1
      )
        throw new Error('请修正名单并重新预检');
      readBatchSnapshot(batch);
      if (pendingId() && pendingId() !== batch.id) {
        state.uncertain = true;
        throw new Error('请先查询待确认批次');
      }
      state.busy = true;
      try {
        storage?.setItem(pendingKey, String(batch.id));
        state.uncertain = true;
        try {
          state.batch = await api.submit(batch.id);
        } catch (error) {
          try {
            state.batch = await api.read(batch.id);
          } catch {
            throw error;
          }
          if (state.batch?.status !== 1) throw error;
        }
        storage?.removeItem(pendingKey);
        state.uncertain = false;
      } finally {
        state.busy = false;
      }
    },
  };
}
