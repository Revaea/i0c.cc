import type { DataSourceTarget } from "@i0c/config"
import type { JsonObject } from "@i0c/plugin-api"

export interface GitHubRawSourceBootstrapConfig {
  dataConfigUrl?: string
  redirectsConfigUrl: string
  dataConfigCacheTtlSeconds: number
  redirectsCacheTtlSeconds: number
  configFailureBackoffSeconds: number
  redirectsFailureBackoffSeconds: number
}

export interface GitHubContentsRepositoryBootstrapConfig extends DataSourceTarget {
  publicRevalidateSeconds: number
}

export const githubRawSourcePluginConfigSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
} satisfies JsonObject

export const githubContentsRepositoryPluginConfigSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
} satisfies JsonObject
