import {
  PLUGIN_API_VERSION,
  type PluginManifest,
} from "@i0c/plugin-api"

import {
  githubContentsRepositoryPluginConfigSchema,
  githubRawSourcePluginConfigSchema,
} from "./config"

export const githubRawSourceManifest = {
  id: "@i0c/github-raw-source",
  name: "GitHub Raw data source",
  version: "0.1.0",
  apiVersion: PLUGIN_API_VERSION,
  kind: "data-source",
  slot: "data-source",
  hosts: ["runtime"],
  capabilities: [
    "config:read",
    "redirects:read",
    "http:etag",
    "cache:last-valid",
  ],
  config: {
    version: 1,
    schema: githubRawSourcePluginConfigSchema,
  },
  secrets: {},
} as const satisfies PluginManifest

export const githubContentsRepositoryManifest = {
  id: "@i0c/github-contents-repository",
  name: "GitHub Contents data repository",
  version: "0.1.0",
  apiVersion: PLUGIN_API_VERSION,
  kind: "data-repository",
  slot: "data-repository",
  hosts: ["webui"],
  capabilities: [
    "config:read",
    "config:write",
    "redirects:read",
    "redirects:write",
    "version:optimistic",
  ],
  config: {
    version: 1,
    schema: githubContentsRepositoryPluginConfigSchema,
  },
  secrets: {},
} as const satisfies PluginManifest
