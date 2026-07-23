import { defineRuntimeInstallationConfig } from "@i0c/runtime-build/config"
import {
  resolveHttpAnalyticsSinkConfig,
} from "@i0c/plugin-analytics-sink-http/config"
import { httpAnalyticsSinkManifest } from "@i0c/plugin-analytics-sink-http/manifest"
import { createHttpAnalyticsSink } from "@i0c/plugin-analytics-sink-http/runtime"
import { resolveBotClassifierConfig } from "@i0c/plugin-feature-bot-classifier/config"
import { botClassifierManifest } from "@i0c/plugin-feature-bot-classifier/manifest"
import { createBotClassifierFeature } from "@i0c/plugin-feature-bot-classifier/runtime"
import { githubRawSourcePlugin } from "@i0c/plugin-github-data/runtime"

import type {
  RuntimeAnalyticsSinkContext,
  RuntimeAnalyticsSinkEvent,
  RuntimePluginInstallations,
} from "@i0c/runtime-host/installations"

import { externalRuntimeFeaturePlugin } from "./src/feature"
import { externalRuntimeInstallation } from "./src/installation"

export const runtimePluginInstallations = {
  bundlePackages: [
    "@i0c/plugin-analytics-sink-http",
    "@i0c/plugin-feature-bot-classifier",
    "@i0c/plugin-github-data",
    "@i0c/runtime-fixture-external",
  ],
  dataSource: {
    enabledByDefault: true,
    manifest: githubRawSourcePlugin.manifest,
    create: githubRawSourcePlugin.create,
  },
  analyticsSinks: [
    {
      enabledByDefault: true,
      manifest: httpAnalyticsSinkManifest,
      create: (config) => createHttpAnalyticsSink<
        RuntimeAnalyticsSinkEvent,
        RuntimeAnalyticsSinkContext
      >(resolveHttpAnalyticsSinkConfig(config)),
    },
  ],
  features: [
    {
      enabledByDefault: true,
      manifest: botClassifierManifest,
      create: (config) => createBotClassifierFeature(
        resolveBotClassifierConfig(config),
      ),
    },
    {
      enabledByDefault: true,
      manifest: externalRuntimeFeaturePlugin.manifest,
      create: externalRuntimeFeaturePlugin.create,
    },
  ],
} satisfies RuntimePluginInstallations

export const runtimeInstallationConfig = defineRuntimeInstallationConfig({
  platforms: [externalRuntimeInstallation],
})
