import {
  PLUGIN_API_VERSION,
  type PluginManifest,
} from "@i0c/plugin-api"

import { botClassifierConfigSchema } from "./config"

export const BOT_CLASSIFIER_PLUGIN_ID = "@i0c/feature-bot-classifier"

export const botClassifierManifest = {
  id: BOT_CLASSIFIER_PLUGIN_ID,
  name: "Privacy-safe bot classifier",
  version: "0.1.0",
  apiVersion: PLUGIN_API_VERSION,
  kind: "feature",
  slot: "feature:bot-classifier",
  hosts: ["runtime"],
  capabilities: ["hook:on-analytics-event", "classification:privacy-safe"],
  config: {
    version: 1,
    schema: botClassifierConfigSchema,
  },
  secrets: {},
} as const satisfies PluginManifest
