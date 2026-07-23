import { d1AnalyticsStoreManifest } from "@i0c/plugin-analytics-store-d1/manifest"
import { postgresAnalyticsStoreManifest } from "@i0c/plugin-analytics-store-postgres/manifest"
import { githubContentsRepositoryManifest } from "@i0c/plugin-github-data/manifest"

export const webUiPluginDescriptors = {
  dataRepository: {
    enabledByDefault: true,
    manifest: githubContentsRepositoryManifest,
  },
  analyticsStores: [
    {
      enabledByDefault: true,
      manifest: postgresAnalyticsStoreManifest,
    },
    {
      enabledByDefault: false,
      manifest: d1AnalyticsStoreManifest,
    },
  ],
} as const

export const webUiPluginManifests = [
  webUiPluginDescriptors.dataRepository.manifest,
  ...webUiPluginDescriptors.analyticsStores.map(
    (installation) => installation.manifest,
  ),
] as const
