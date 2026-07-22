import type { JsonObject } from "@i0c/plugin-api"

export interface VercelRuntimeAdapterOptions {
  secretBindings: readonly string[]
}

export const vercelRuntimePluginConfigSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
} satisfies JsonObject
