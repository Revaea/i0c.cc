export function getLabelTickIndices(
  length: number,
  maximumLabels: number,
): number[] {
  if (length <= 0 || maximumLabels <= 0) {
    return [];
  }

  if (length <= maximumLabels) {
    return Array.from({ length }, (_, index) => index);
  }

  const lastIndex = length - 1;
  const labelCount = Math.max(2, Math.min(length, maximumLabels));
  const step = lastIndex / (labelCount - 1);

  return Array.from(
    { length: labelCount },
    (_, index) => Math.round(index * step),
  ).filter((value, index, values) => index === 0 || value !== values[index - 1]);
}
