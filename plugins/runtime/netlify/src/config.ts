import type { JsonObject } from "@i0c/plugin-api"

export interface NetlifyRuntimeAdapterOptions {
  secretBindings: readonly string[]
}

export const netlifyRuntimePluginConfigSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
} satisfies JsonObject
