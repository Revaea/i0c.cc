import type { BootstrapConfig, DataConfig } from "./types"

export const bootstrapConfig = {
  data: {
    github: {
      owner: "Revaea",
      repository: "i0c.cc",
      branch: "data",
      configPath: "config.json",
      redirectsPath: "redirects.json",
    },
  },
  webui: {
    githubOAuthScope: "read:user user:email public_repo",
  },
} as const satisfies BootstrapConfig

export const defaultDataConfig = {
  $schema: "https://raw.githubusercontent.com/Revaea/i0c.cc/main/packages/config/config.schema.json",
  schemaVersion: 1,
  runtime: {
    canonicalOrigin: "https://i0c.cc",
    robotsPolicy: "allow",
    configCacheTtlSeconds: 600,
    redirectsCacheTtlSeconds: 60,
  },
  analytics: {
    ingestEndpoint: "https://u.i0c.cc/api/analytics/events",
    sourceId: "i0c.cc",
  },
  webui: {
    access: {
      mode: "public-readonly",
      managerGitHubUserIds: ["59095086", "186124801", "186082640"],
    },
  },
  plugins: {},
} as const satisfies DataConfig
