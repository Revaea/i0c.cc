import type { AnalyticsRange } from "./types"

interface AnalyticsHrefOptions {
  entryDomain: string
  range: AnalyticsRange
}

export function buildAnalyticsHref(basePath: string, options: AnalyticsHrefOptions) {
  const searchParams = new URLSearchParams({ range: String(options.range) })
  if (options.entryDomain !== "all") {
    searchParams.set("entryDomain", options.entryDomain)
  }

  return `${basePath}?${searchParams.toString()}`
}
