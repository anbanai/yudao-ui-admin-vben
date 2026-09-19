export function moveArrayItem<T>(
  items: T[],
  fromIndex: number,
  toIndex: number,
) {
  const result = [...items];
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= result.length ||
    toIndex >= result.length
  ) {
    return result;
  }
  const [item] = result.splice(fromIndex, 1);
  if (item !== undefined) {
    result.splice(toIndex, 0, item);
  }
  return result;
}
