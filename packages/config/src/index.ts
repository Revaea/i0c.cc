export type RobotsPolicy = "allow" | "disallow"
export type WebUiAccessMode = "authenticated" | "allowlist" | "public-readonly"

export interface AppConfig {
  redirects: {
    github: {
      owner: string
      repository: string
      branch: string
      path: string
    }
  }
  runtime: {
    canonicalOrigin: `https://${string}`
    robotsPolicy: RobotsPolicy
  }
  analytics: {
    ingestEndpoint: `https://${string}`
    sourceId: string
  }
  webui: {
    githubOAuthScope: string
    access: {
      mode: WebUiAccessMode
      managerGitHubUserIds: readonly string[]
    }
  }
}

export const appConfig = {
  redirects: {
    github: {
      owner: "Revaea",
      repository: "i0c.cc",
      branch: "data",
      path: "redirects.json",
    },
  },
  runtime: {
    canonicalOrigin: "https://i0c.cc",
    robotsPolicy: "allow",
  },
  analytics: {
    ingestEndpoint: "https://u.i0c.cc/api/analytics/events",
    sourceId: "i0c.cc",
  },
  webui: {
    githubOAuthScope: "read:user user:email public_repo",
    access: {
      mode: "public-readonly",
      managerGitHubUserIds: ["59095086", "186124801", "186082640"],
    },
  },
} as const satisfies AppConfig
