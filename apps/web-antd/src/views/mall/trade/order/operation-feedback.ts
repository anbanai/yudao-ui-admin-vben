import { message } from 'ant-design-vue';

import { $t } from '#/locales';

export async function withOperationFeedback<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const hideLoading = message.loading({ content: '保存中...', duration: 0 });
  try {
    const result = await operation();
    message.success($t('ui.actionMessage.operationSuccess'));
    return result;
  } finally {
    hideLoading();
  }
}
