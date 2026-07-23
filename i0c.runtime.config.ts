import { defineRuntimeInstallationConfig } from "@i0c/runtime-build/config"
import {
  resolveHttpAnalyticsSinkConfig,
} from "@i0c/plugin-analytics-sink-http/config"
import {
  createHttpAnalyticsSink,
} from "@i0c/plugin-analytics-sink-http/runtime"
import {
  resolveBotClassifierConfig,
} from "@i0c/plugin-feature-bot-classifier/config"
import {
  createBotClassifierFeature,
} from "@i0c/plugin-feature-bot-classifier/runtime"
import {
  githubRawSourcePlugin,
} from "@i0c/plugin-github-data/runtime"
import { cloudflareRuntimeInstallation } from "@i0c/plugin-runtime-cloudflare/installation"
import { netlifyRuntimeInstallation } from "@i0c/plugin-runtime-netlify/installation"
import { vercelRuntimeInstallation } from "@i0c/plugin-runtime-vercel/installation"
import {
  defineRuntimePluginInstallations,
  type RuntimeAnalyticsSinkContext,
  type RuntimeAnalyticsSinkEvent,
} from "@i0c/runtime-host/installations"

import { runtimePluginDescriptors } from "./i0c.runtime.manifests"

export const runtimePluginInstallations = defineRuntimePluginInstallations({
  bundlePackages: [
    "@i0c/plugin-analytics-sink-http",
    "@i0c/plugin-feature-bot-classifier",
    "@i0c/plugin-github-data",
  ],
  dataSource: {
    ...runtimePluginDescriptors.dataSource,
    create: githubRawSourcePlugin.create,
  },
  analyticsSinks: [
    {
      ...runtimePluginDescriptors.analyticsSinks[0],
      create: (config) => createHttpAnalyticsSink<
        RuntimeAnalyticsSinkEvent,
        RuntimeAnalyticsSinkContext
      >(resolveHttpAnalyticsSinkConfig(config)),
    },
  ],
  features: [
    {
      ...runtimePluginDescriptors.features[0],
      create: (config) => createBotClassifierFeature(
        resolveBotClassifierConfig(config),
      ),
    },
  ],
})

export { runtimePluginManifests } from "./i0c.runtime.manifests"

export const runtimeInstallationConfig = /* @__PURE__ */ defineRuntimeInstallationConfig({
  platforms: [
    cloudflareRuntimeInstallation,
    vercelRuntimeInstallation,
    netlifyRuntimeInstallation,
  ],
})

export { runtimePlatformManifests } from "./i0c.runtime.manifests"
