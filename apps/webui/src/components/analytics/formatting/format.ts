import { analyticsRanges, type AnalyticsRange } from "../data/types"

const fallbackLocale = "en"

export function parseAnalyticsRange(value: string | string[] | undefined): AnalyticsRange {
  const candidate = Array.isArray(value) ? value[0] : value
  const numericValue = Number(candidate)

  return analyticsRanges.includes(numericValue as AnalyticsRange)
    ? (numericValue as AnalyticsRange)
    : 30
}

export function formatCount(value: number, locale = fallbackLocale) {
  return new Intl.NumberFormat(locale, {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10_000 ? 1 : 0,
  }).format(value)
}

export function formatPercent(value: number, locale = fallbackLocale) {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatDate(
  value: string | null | undefined,
  locale = fallbackLocale,
  timeZone?: string,
) {
  if (!value) {
    return "—"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date)
}

export function formatDay(value: string, locale = fallbackLocale, timeZone?: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone,
  }).format(date)
}

export function formatHour(value: string, locale = fallbackLocale, timeZone?: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date)
}

export function formatChangeRate(value: number | null | undefined, locale = fallbackLocale) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—"
  }

  const formatted = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
    signDisplay: "always",
  }).format(value)

  return formatted
}
