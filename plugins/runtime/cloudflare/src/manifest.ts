import {
  PLUGIN_API_VERSION,
  type PluginManifest,
} from "@i0c/plugin-api"

import { cloudflareRuntimePluginConfigSchema } from "./config"

export const cloudflareRuntimeManifest = {
  id: "@i0c/runtime-cloudflare",
  name: "Cloudflare Runtime",
  version: "0.1.0",
  apiVersion: PLUGIN_API_VERSION,
  kind: "runtime-platform",
  slot: "runtime-platform",
  hosts: ["runtime"],
  capabilities: ["edge", "cache-api", "country", "wait-until"],
  config: {
    version: 1,
    schema: cloudflareRuntimePluginConfigSchema,
  },
  secrets: {},
} as const satisfies PluginManifest
