import {
  PLUGIN_API_VERSION,
  type PluginManifest,
} from "@i0c/plugin-api"

import { netlifyRuntimePluginConfigSchema } from "./config"

export const netlifyRuntimeManifest = {
  id: "@i0c/runtime-netlify",
  name: "Netlify Runtime",
  version: "0.1.0",
  apiVersion: PLUGIN_API_VERSION,
  kind: "runtime-platform",
  slot: "runtime-platform",
  hosts: ["runtime"],
  capabilities: ["edge", "country", "environment-bindings", "wait-until"],
  config: {
    version: 1,
    schema: netlifyRuntimePluginConfigSchema,
  },
  secrets: {},
} as const satisfies PluginManifest
