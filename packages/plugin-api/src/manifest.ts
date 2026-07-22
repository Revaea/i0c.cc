import type { JsonObject } from "./types"

export const PLUGIN_API_VERSION = 1 as const

export const pluginHosts = ["runtime", "collector", "webui"] as const

export const pluginKinds = [
  "runtime-platform",
  "data-source",
  "data-repository",
  "analytics-sink",
  "analytics-store",
  "feature",
] as const

export type PluginApiVersion = typeof PLUGIN_API_VERSION
export type PluginHost = (typeof pluginHosts)[number]
export type PluginKind = (typeof pluginKinds)[number]
export type PluginSlot = PluginKind | `feature:${string}`

export interface PluginConfigurationManifest {
  version: number
  schema?: JsonObject
}

export interface PluginSecretRequirement {
  required: boolean
  sensitive: true
  defaultBinding?: string
  description?: string
}

export interface PluginManifest<
  TKind extends PluginKind = PluginKind,
  THost extends PluginHost = PluginHost,
  TCapability extends string = string,
> {
  id: string
  name: string
  version: string
  apiVersion: PluginApiVersion
  kind: TKind
  slot: PluginSlot
  hosts: readonly THost[]
  capabilities: readonly TCapability[]
  config: PluginConfigurationManifest
  secrets: Readonly<Record<string, PluginSecretRequirement>>
}

export interface RuntimePlatformManifest<
  TCapability extends string = string,
> extends PluginManifest<"runtime-platform", "runtime", TCapability> {
  provider: string
}
