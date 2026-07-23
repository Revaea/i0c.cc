import type {
  DataConfig,
  JsonObject,
  PluginInstanceConfig,
  RobotsPolicy,
  WebUiAccessMode,
} from "./types"

export interface DataConfigValidationIssue {
  message: string
  path: string
}

export type DataConfigValidationResult =
  | { status: "valid"; config: DataConfig }
  | { status: "invalid"; issues: DataConfigValidationIssue[] }

const githubUserIdPattern = /^[1-9]\d*$/
const hostnameLabelPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
const pluginNamePattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/
const pluginSecretNamePattern = /^[A-Z][A-Z0-9_]*$/

export function validateDataConfig(value: unknown): DataConfigValidationResult {
  const issues: DataConfigValidationIssue[] = []

  if (!isRecord(value)) {
    return invalid("/", "must be an object")
  }

  validateKnownKeys(
    value,
    new Set(["$schema", "schemaVersion", "runtime", "analytics", "webui", "plugins"]),
    "",
    issues,
  )

  if (value.$schema !== undefined && !isHttpsUrl(value.$schema)) {
    issues.push(issue("/$schema", "must be an HTTPS URL without credentials"))
  }

  if (value.schemaVersion !== 1) {
    issues.push(issue("/schemaVersion", "must be 1"))
  }

  validateRuntime(value.runtime, issues)
  validateAnalytics(value.analytics, issues)
  validateWebUi(value.webui, issues)
  validatePlugins(value.plugins, issues)

  return issues.length > 0
    ? { status: "invalid", issues }
    : { status: "valid", config: value as unknown as DataConfig }
}

function validateRuntime(value: unknown, issues: DataConfigValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push(issue("/runtime", "must be an object"))
    return
  }

  validateKnownKeys(
    value,
    new Set(["canonicalOrigin", "robotsPolicy", "configCacheTtlSeconds", "redirectsCacheTtlSeconds"]),
    "/runtime",
    issues,
  )

  if (!isCanonicalHttpsOrigin(value.canonicalOrigin)) {
    issues.push(issue("/runtime/canonicalOrigin", "must be an HTTPS origin without credentials, path, query, or hash"))
  }

  if (!isRobotsPolicy(value.robotsPolicy)) {
    issues.push(issue("/runtime/robotsPolicy", "must be allow or disallow"))
  }

  validateCacheTtl(value.configCacheTtlSeconds, "/runtime/configCacheTtlSeconds", issues)
  validateCacheTtl(value.redirectsCacheTtlSeconds, "/runtime/redirectsCacheTtlSeconds", issues)
}

function validateAnalytics(value: unknown, issues: DataConfigValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push(issue("/analytics", "must be an object"))
    return
  }

  validateKnownKeys(value, new Set(["ingestEndpoint", "sourceId"]), "/analytics", issues)

  if (!isHttpsUrl(value.ingestEndpoint)) {
    issues.push(issue("/analytics/ingestEndpoint", "must be an HTTPS URL without credentials"))
  }

  if (!isHostname(value.sourceId)) {
    issues.push(issue("/analytics/sourceId", "must be a lowercase hostname"))
  }
}

function validateWebUi(value: unknown, issues: DataConfigValidationIssue[]): void {
  if (!isRecord(value) || !isRecord(value.access)) {
    issues.push(issue("/webui/access", "must be an object"))
    return
  }

  validateKnownKeys(value, new Set(["access"]), "/webui", issues)
  validateKnownKeys(
    value.access,
    new Set(["mode", "managerGitHubUserIds"]),
    "/webui/access",
    issues,
  )

  const { mode, managerGitHubUserIds } = value.access
  if (!isWebUiAccessMode(mode)) {
    issues.push(issue("/webui/access/mode", "must be authenticated, allowlist, or public-readonly"))
  }

  if (!Array.isArray(managerGitHubUserIds)) {
    issues.push(issue("/webui/access/managerGitHubUserIds", "must be an array"))
    return
  }

  const ids = managerGitHubUserIds.filter((item): item is string => typeof item === "string")
  if (ids.length !== managerGitHubUserIds.length || ids.some((id) => !githubUserIdPattern.test(id))) {
    issues.push(issue("/webui/access/managerGitHubUserIds", "must contain GitHub numeric user IDs"))
  }
  if (new Set(ids).size !== ids.length) {
    issues.push(issue("/webui/access/managerGitHubUserIds", "must not contain duplicate IDs"))
  }
  if (mode === "allowlist" && ids.length === 0) {
    issues.push(issue("/webui/access/managerGitHubUserIds", "must not be empty in allowlist mode"))
  }
}

function validatePlugins(value: unknown, issues: DataConfigValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push(issue("/plugins", "must be an object"))
    return
  }

  for (const [name, plugin] of Object.entries(value)) {
    const path = `/plugins/${escapeJsonPointer(name)}`
    if (!pluginNamePattern.test(name)) {
      issues.push(issue(path, "plugin name must be a lowercase package name with an optional scope"))
      continue
    }
    validatePlugin(plugin, path, issues)
  }
}

function validatePlugin(value: unknown, path: string, issues: DataConfigValidationIssue[]): void {
  if (!isRecord(value) || typeof value.enabled !== "boolean") {
    issues.push(issue(path, "must be an object with an enabled boolean"))
    return
  }

  validateKnownKeys(value, new Set(["enabled", "version", "config", "secrets"]), path, issues)

  if (
    value.version !== undefined &&
    (!Number.isSafeInteger(value.version) || typeof value.version !== "number" || value.version < 1)
  ) {
    issues.push(issue(`${path}/version`, "must be a positive integer"))
  }

  if (value.config !== undefined && !isJsonObject(value.config)) {
    issues.push(issue(`${path}/config`, "must be a JSON object"))
  }

  if (value.secrets === undefined) {
    return
  }
  if (!isRecord(value.secrets)) {
    issues.push(issue(`${path}/secrets`, "must be an object"))
    return
  }
  for (const [key, binding] of Object.entries(value.secrets)) {
    if (typeof binding !== "string" || !pluginSecretNamePattern.test(binding)) {
      issues.push(issue(`${path}/secrets/${escapeJsonPointer(key)}`, "must name an environment variable"))
    }
  }
}

function validateCacheTtl(value: unknown, path: string, issues: DataConfigValidationIssue[]): void {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 1 || value > 86_400) {
    issues.push(issue(path, "must be an integer from 1 through 86400"))
  }
}

function isCanonicalHttpsOrigin(value: unknown): value is `https://${string}` {
  if (typeof value !== "string") {
    return false
  }
  try {
    const url = new URL(value)
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && url.pathname === "/"
      && !url.search
      && !url.hash
      && value === url.origin
  } catch {
    return false
  }
}

function isHttpsUrl(value: unknown): value is `https://${string}` {
  if (typeof value !== "string") {
    return false
  }
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password
  } catch {
    return false
  }
}

function isHostname(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 253 || value !== value.toLowerCase()) {
    return false
  }
  const normalized = value.replace(/\.+$/, "")
  return normalized === value
    && normalized.split(".").every((label) => label.length <= 63 && hostnameLabelPattern.test(label))
}

function isRobotsPolicy(value: unknown): value is RobotsPolicy {
  return value === "allow" || value === "disallow"
}

function isWebUiAccessMode(value: unknown): value is WebUiAccessMode {
  return value === "authenticated" || value === "allowlist" || value === "public-readonly"
}

function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value) && Object.values(value).every(isJsonValue)
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return true
  }
  if (typeof value === "number") {
    return Number.isFinite(value)
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue)
  }
  return isRecord(value) && Object.values(value).every(isJsonValue)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function escapeJsonPointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1")
}

function validateKnownKeys(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  path: string,
  issues: DataConfigValidationIssue[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      issues.push(issue(`${path}/${escapeJsonPointer(key)}`, "is not allowed"))
    }
  }
}

function issue(path: string, message: string): DataConfigValidationIssue {
  return { path, message }
}

function invalid(path: string, message: string): DataConfigValidationResult {
  return { status: "invalid", issues: [issue(path, message)] }
}

export function isPluginInstanceConfig(value: unknown): value is PluginInstanceConfig {
  const issues: DataConfigValidationIssue[] = []
  validatePlugin(value, "/plugin", issues)
  return issues.length === 0
}
