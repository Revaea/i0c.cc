import {
  PLUGIN_API_VERSION,
  type PluginManifest,
} from "@i0c/plugin-api"

import { httpAnalyticsSinkConfigSchema } from "./config"

export const HTTP_ANALYTICS_SINK_PLUGIN_ID = "@i0c/analytics-sink-http"

export const httpAnalyticsSinkManifest = {
  id: HTTP_ANALYTICS_SINK_PLUGIN_ID,
  name: "Signed HTTP analytics sink",
  version: "0.1.0",
  apiVersion: PLUGIN_API_VERSION,
  kind: "analytics-sink",
  slot: "analytics-sink",
  hosts: ["runtime"],
  capabilities: ["hmac-sha256", "retry:transient", "redirect:manual"],
  config: {
    version: 1,
    schema: httpAnalyticsSinkConfigSchema,
  },
  secrets: {
    writeKey: {
      required: true,
      sensitive: true,
      defaultBinding: "ANALYTICS_WRITE_KEY",
      description: "HMAC key shared with the analytics collector.",
    },
  },
} as const satisfies PluginManifest
