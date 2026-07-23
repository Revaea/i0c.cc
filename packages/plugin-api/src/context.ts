import type { JsonObject, JsonValue } from "./types"

export interface PluginLogger {
  debug(message: string, metadata?: Readonly<Record<string, JsonValue>>): void
  info(message: string, metadata?: Readonly<Record<string, JsonValue>>): void
  warn(message: string, metadata?: Readonly<Record<string, JsonValue>>): void
  error(message: string, metadata?: Readonly<Record<string, JsonValue>>): void
}

export interface PluginSecrets {
  get(name: string): string | undefined
  require(name: string): string
}

export interface PluginInitializationContext<
  TConfig extends object = JsonObject,
  TServices extends object = Record<string, never>,
> {
  pluginId: string
  config: Readonly<TConfig>
  secrets: PluginSecrets
  logger: PluginLogger
  services: Readonly<TServices>
  signal?: AbortSignal
}
