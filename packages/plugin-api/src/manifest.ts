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

export type PluginLocalizedText =
  | string
  | Readonly<Record<string, string>>

export type PluginConfigurationFieldControl =
  | "number"
  | "secret-binding"
  | "select"
  | "switch"
  | "text"

export interface PluginConfigurationFieldUi {
  control?: PluginConfigurationFieldControl
  help?: PluginLocalizedText
  label?: PluginLocalizedText
  order?: number
  placeholder?: PluginLocalizedText
}

export interface PluginConfigurationUiManifest {
  fields?: Readonly<Record<string, PluginConfigurationFieldUi>>
}

export interface PluginConfigurationManifest {
  required?: boolean
  version: number
  schema?: JsonObject
  ui?: PluginConfigurationUiManifest
}

export interface PluginDescriptionManifest {
  summary: PluginLocalizedText
}

export interface PluginSecretRequirement {
  required: boolean
  sensitive: true
  defaultBinding?: string
  description?: string
  help?: PluginLocalizedText
  label?: PluginLocalizedText
  order?: number
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
  description?: PluginDescriptionManifest
  config: PluginConfigurationManifest
  secrets: Readonly<Record<string, PluginSecretRequirement>>
}

export interface RuntimePlatformManifest<
  TCapability extends string = string,
> extends PluginManifest<"runtime-platform", "runtime", TCapability> {
  provider: string
}
