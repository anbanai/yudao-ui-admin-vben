import { beforeEach, describe, expect, it, vi } from 'vitest';

const hideLoading = vi.hoisted(() => vi.fn());
const loading = vi.hoisted(() => vi.fn(() => hideLoading));
const success = vi.hoisted(() => vi.fn());
const error = vi.hoisted(() => vi.fn());

vi.mock('ant-design-vue', () => ({
  message: { error, loading, success },
}));

vi.mock('#/locales', () => ({
  $t: (key: string) => key,
}));

describe('withOperationFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading and success feedback and always hides loading', async () => {
    const { withOperationFeedback } = await import('./operation-feedback');

    await expect(withOperationFeedback(async () => 'saved')).resolves.toBe(
      'saved',
    );
    expect(loading).toHaveBeenCalledWith({ content: '保存中...', duration: 0 });
    expect(success).toHaveBeenCalledWith('ui.actionMessage.operationSuccess');
    expect(error).not.toHaveBeenCalled();
    expect(hideLoading).toHaveBeenCalledOnce();
  });

  it('hides loading and preserves a rejection for global error handling', async () => {
    const { withOperationFeedback } = await import('./operation-feedback');
    const failure = new Error('request failed');

    await expect(
      withOperationFeedback(async () => Promise.reject(failure)),
    ).rejects.toBe(failure);
    expect(success).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(hideLoading).toHaveBeenCalledOnce();
  });
});
