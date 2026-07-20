export type DatabaseNumber = bigint | number | string | null;

export function toNumber(value: DatabaseNumber): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
