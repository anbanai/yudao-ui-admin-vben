import { describe, expect, it } from 'vitest';

import { useFormSchema } from './data';

describe('商品评价表单图片上传策略', () => {
  it('限制评论图片为商品图片格式和大小', () => {
    const picUrls = useFormSchema().find(
      (field) => field.fieldName === 'picUrls',
    );

    expect(picUrls?.componentProps).toMatchObject({
      maxSize: 3,
      accept: ['jpg', 'jpeg', 'png', 'bmp'],
      scene: 'product',
    });
  });
});
