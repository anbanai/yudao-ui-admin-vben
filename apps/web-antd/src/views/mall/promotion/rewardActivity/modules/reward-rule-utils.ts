import type { MallRewardActivityApi } from '#/api/mall/promotion/reward/rewardActivity';

type RewardRule = MallRewardActivityApi.RewardRule;

interface CouponCountValue {
  giveCount?: number;
  id: number;
}

export function appendRewardRule(rules: RewardRule[]): RewardRule[] {
  return [
    ...rules,
    {
      discountPrice: 0,
      freeDelivery: false,
      limit: 0,
      point: 0,
    },
  ];
}

export function removeRewardRule(
  rules: RewardRule[],
  index: number,
): RewardRule[] {
  return rules.filter((_, ruleIndex) => ruleIndex !== index);
}

export function patchRewardRule(
  rules: RewardRule[],
  index: number,
  key: keyof RewardRule,
  value: unknown,
): RewardRule[] {
  return rules.map((rule, ruleIndex) =>
    ruleIndex === index ? { ...rule, [key]: value } : rule,
  );
}

export function replaceRewardRule(
  rules: RewardRule[],
  index: number,
  rule: RewardRule,
): RewardRule[] {
  return rules.map((currentRule, ruleIndex) =>
    ruleIndex === index ? rule : currentRule,
  );
}

export function withGiveCouponTemplateCounts(
  rule: RewardRule,
  coupons: CouponCountValue[],
): RewardRule {
  return {
    ...rule,
    giveCouponTemplateCounts: Object.fromEntries(
      coupons.map(({ giveCount, id }) => [id, giveCount ?? 0]),
    ),
  };
}
