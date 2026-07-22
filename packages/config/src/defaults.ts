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
  plugins: {
    "@i0c/github-raw-source": {
      enabled: true,
      version: 1,
    },
    "@i0c/github-contents-repository": {
      enabled: true,
      version: 1,
    },
    "@i0c/runtime-cloudflare": {
      enabled: true,
      version: 1,
    },
    "@i0c/runtime-vercel": {
      enabled: true,
      version: 1,
    },
    "@i0c/runtime-netlify": {
      enabled: true,
      version: 1,
    },
    "@i0c/analytics-sink-http": {
      enabled: true,
      version: 1,
      config: {
        maximumDeliveryAttempts: 2,
      },
      secrets: {
        writeKey: "ANALYTICS_WRITE_KEY",
      },
    },
    "@i0c/feature-bot-classifier": {
      enabled: true,
      version: 1,
      config: {
        hookTimeoutMs: 20,
      },
    },
    "@i0c/analytics-store-postgres": {
      enabled: true,
      version: 1,
      config: {
        maxConnections: 3,
        idleTimeoutSeconds: 20,
        developmentIdleTimeoutSeconds: 0,
        connectTimeoutSeconds: 30,
        retentionDays: 181,
      },
      secrets: {
        databaseUrl: "DATABASE_URL",
      },
    },
    "@i0c/analytics-store-d1": {
      enabled: false,
      version: 1,
    },
  },
} as const satisfies DataConfig
