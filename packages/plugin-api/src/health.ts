import type { Awaitable, JsonObject } from "./types"

export type PluginHealthStatus = "healthy" | "degraded" | "unhealthy"

export interface PluginHealthReport {
  status: PluginHealthStatus
  message?: string
  details?: JsonObject
}

export interface PluginHealthCheck {
  healthCheck(): Awaitable<PluginHealthReport>
}
