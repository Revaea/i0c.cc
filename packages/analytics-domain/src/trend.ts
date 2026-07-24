import type { AnalyticsTrendComparison } from "./types"

export function createTrendComparison(
  currentValue: number,
  previousValue: number,
  hasPreviousPeriodObservations: boolean,
): AnalyticsTrendComparison {
  if (!hasPreviousPeriodObservations) {
    return { status: "unavailable" }
  }

  if (previousValue === currentValue) {
    return { status: "unchanged" }
  }

  if (previousValue > 0) {
    return {
      status: "percentage",
      percent: ((currentValue - previousValue) / previousValue) * 100,
    }
  }

  return {
    status: "started",
    currentValue,
  }
}
