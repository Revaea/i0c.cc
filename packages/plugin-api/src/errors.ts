export type PluginErrorCode =
  | "PLUGIN_API_INCOMPATIBLE"
  | "PLUGIN_CONFIG_INVALID"
  | "PLUGIN_DUPLICATE"
  | "PLUGIN_HEALTH_CHECK_FAILED"
  | "PLUGIN_HOST_UNSUPPORTED"
  | "PLUGIN_INITIALIZATION_FAILED"
  | "PLUGIN_MIGRATION_FAILED"
  | "PLUGIN_NOT_INSTALLED"
  | "PLUGIN_SECRET_MISSING"
  | "PLUGIN_SLOT_CONFLICT"

export interface PluginErrorOptions {
  cause?: unknown
  details?: Readonly<Record<string, unknown>>
}

export class PluginError extends Error {
  readonly code: PluginErrorCode
  readonly pluginId: string
  readonly details?: Readonly<Record<string, unknown>>
  override readonly cause?: unknown

  constructor(
    pluginId: string,
    code: PluginErrorCode,
    message: string,
    options: PluginErrorOptions = {},
  ) {
    super(message)
    this.name = "PluginError"
    this.pluginId = pluginId
    this.code = code
    this.details = options.details
    this.cause = options.cause
  }
}
