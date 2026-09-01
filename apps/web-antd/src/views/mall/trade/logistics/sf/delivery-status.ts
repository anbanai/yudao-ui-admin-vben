const QUEUED_PRINT_TASK_STATUSES = new Set([
  'ACCEPTED',
  'DISPATCHED',
  'PENDING',
]);

export function isPrintTaskQueued(status?: string) {
  return Boolean(status && QUEUED_PRINT_TASK_STATUSES.has(status));
}

export function getPrintTaskErrorMessage(
  status?: string,
  backendMessage?: string,
) {
  if (backendMessage) return backendMessage;
  switch (status) {
    case 'CANCELLED': {
      return '打印任务已取消，请确认运单状态后再处理';
    }
    case 'FAILED': {
      return '打印任务创建失败，请查看运单管理后重试';
    }
    case 'UNKNOWN': {
      return '打印结果未知，请到打印任务中人工处理，禁止直接重打';
    }
    default: {
      return status
        ? `当前打印任务状态为 ${status}，未创建新的打印任务`
        : '顺丰运单或面单创建失败，请查看运单管理后重试';
    }
  }
}
