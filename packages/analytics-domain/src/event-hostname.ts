export function normalizeAnalyticsHostname(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "")
}

export function isValidAnalyticsHostname(value: string): boolean {
  if (value.length === 0 || value.length > 253) {
    return false
  }

  return value.split(".").every((label) => (
    label.length > 0
    && label.length <= 63
    && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  ))
}
