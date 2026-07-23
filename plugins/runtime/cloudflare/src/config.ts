import type { JsonObject } from "@i0c/plugin-api"

export interface CloudflareRuntimeAdapterOptions {
  useDefaultCache: boolean
}

export const cloudflareRuntimePluginConfigSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
} satisfies JsonObject
