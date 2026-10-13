export function setTradeConfigTab<T extends { type?: string }>(
  formData: T | undefined,
  activeKey: string,
) {
  if (!formData) {
    return undefined;
  }
  formData.type = activeKey;
  return formData;
}
