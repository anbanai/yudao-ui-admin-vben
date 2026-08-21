export interface OrderRemarkItem {
  key: 'merchant' | 'user';
  label: '商家备注' | '用户备注';
  content: string;
}

interface OrderRemarks {
  remark?: string;
  userRemark?: string;
}

type OrderRemarkCandidate = Omit<OrderRemarkItem, 'content'> & {
  content?: string;
};

export function getOrderRemarkItems({
  remark,
  userRemark,
}: OrderRemarks): OrderRemarkItem[] {
  const items: OrderRemarkCandidate[] = [
    { key: 'merchant', label: '商家备注', content: remark },
    { key: 'user', label: '用户备注', content: userRemark },
  ];

  return items.filter(
    (item): item is OrderRemarkItem =>
      typeof item.content === 'string' && item.content.trim().length > 0,
  );
}
