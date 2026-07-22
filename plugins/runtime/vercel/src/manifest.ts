import {
  PLUGIN_API_VERSION,
  type PluginManifest,
} from "@i0c/plugin-api"

import { vercelRuntimePluginConfigSchema } from "./config"

export const vercelRuntimeManifest = {
  id: "@i0c/runtime-vercel",
  name: "Vercel Runtime",
  version: "0.1.0",
  apiVersion: PLUGIN_API_VERSION,
  kind: "runtime-platform",
  slot: "runtime-platform",
  hosts: ["runtime"],
  capabilities: ["edge", "country", "environment-bindings", "wait-until"],
  config: {
    version: 1,
    schema: vercelRuntimePluginConfigSchema,
  },
  secrets: {},
} as const satisfies PluginManifest
