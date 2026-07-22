export type RobotsPolicy = "allow" | "disallow"
export type WebUiAccessMode = "authenticated" | "allowlist" | "public-readonly"

export type JsonPrimitive = boolean | number | string | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
export type JsonObject = { [key: string]: JsonValue }

export interface DataSourceTarget {
  owner: string
  repository: string
  branch: string
  configPath: string
  redirectsPath: string
}

export interface BootstrapConfig {
  data: {
    github: DataSourceTarget
  }
  webui: {
    githubOAuthScope: string
  }
}

export interface PluginInstanceConfig {
  enabled: boolean
  config?: JsonObject
  secrets?: Record<string, string>
}

export interface DataConfig {
  $schema?: string
  schemaVersion: 1
  runtime: {
    canonicalOrigin: `https://${string}`
    robotsPolicy: RobotsPolicy
    configCacheTtlSeconds: number
    redirectsCacheTtlSeconds: number
  }
  analytics: {
    ingestEndpoint: `https://${string}`
    sourceId: string
  }
  webui: {
    access: {
      mode: WebUiAccessMode
      managerGitHubUserIds: readonly string[]
    }
  }
  plugins: Record<string, PluginInstanceConfig>
}
