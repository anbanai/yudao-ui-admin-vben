export function setTradeConfigTab<T>(
  formData: T | undefined,
  activeKey: string,
): (T & { type: string }) | undefined {
  if (!formData) {
    return undefined;
  }
  return { ...formData, type: activeKey };
}
