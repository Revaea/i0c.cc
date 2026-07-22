import type { JsonObject } from "@i0c/plugin-api"

export interface HttpAnalyticsSinkConfig {
  maximumDeliveryAttempts: number
}

export const defaultHttpAnalyticsSinkConfig = {
  maximumDeliveryAttempts: 2,
} as const satisfies HttpAnalyticsSinkConfig

export const httpAnalyticsSinkConfigSchema = {
  type: "object",
  additionalProperties: false,
  required: ["maximumDeliveryAttempts"],
  properties: {
    maximumDeliveryAttempts: {
      type: "integer",
      minimum: 1,
      maximum: 5,
    },
  },
} satisfies JsonObject

export function resolveHttpAnalyticsSinkConfig(
  value: JsonObject | undefined,
): HttpAnalyticsSinkConfig {
  const maximumDeliveryAttempts = value?.maximumDeliveryAttempts
  return {
    maximumDeliveryAttempts:
      typeof maximumDeliveryAttempts === "number"
      && Number.isSafeInteger(maximumDeliveryAttempts)
        ? maximumDeliveryAttempts
        : defaultHttpAnalyticsSinkConfig.maximumDeliveryAttempts,
  }
}
