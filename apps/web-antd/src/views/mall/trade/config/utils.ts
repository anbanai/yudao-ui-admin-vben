export function setTradeConfigTab<T>(
  formData: T | undefined,
  activeKey: string,
): (T & { type: string }) | undefined {
  if (!formData) {
    return undefined;
  }
  return { ...formData, type: activeKey };
}

/** Merge form values without allowing an omitted field to erase loaded config. */
export function mergeTradeConfigFormValues<T extends Record<string, any>>(
  loadedValues: T | undefined,
  formValues: Partial<T> & Record<string, any>,
): T {
  const mergedValues = { ...loadedValues } as T;
  for (const [fieldName, value] of Object.entries(formValues)) {
    if (value !== undefined) {
      mergedValues[fieldName as keyof T] = value as T[keyof T];
    }
  }
  return mergedValues;
}
