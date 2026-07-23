import {
  PLUGIN_API_VERSION,
  pluginHosts,
  pluginKinds,
  type PluginManifest,
} from "./manifest"
import { validateJsonSchemaDefinition } from "./json-schema"

const pluginIdPattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/
const pluginVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const secretNamePattern = /^[a-z][A-Za-z0-9]*$/
const secretBindingPattern = /^[A-Z][A-Z0-9_]*$/
const runtimeProviderPattern = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/
const manifestKeys = new Set([
  "apiVersion",
  "capabilities",
  "config",
  "hosts",
  "id",
  "kind",
  "name",
  "provider",
  "secrets",
  "slot",
  "version",
])
const configKeys = new Set(["required", "schema", "version"])
const secretRequirementKeys = new Set([
  "defaultBinding",
  "description",
  "required",
  "sensitive",
])

export interface PluginManifestValidationResult {
  valid: boolean
  issues: readonly string[]
}

export function arePluginManifestsEquivalent(
  left: PluginManifest,
  right: PluginManifest,
): boolean {
  try {
    return JSON.stringify(toCanonicalJson(left)) === JSON.stringify(toCanonicalJson(right))
  } catch {
    return false
  }
}

export function validatePluginManifest(manifest: unknown): PluginManifestValidationResult {
  const issues: string[] = []

  if (!isRecord(manifest)) {
    return {
      valid: false,
      issues: ["manifest must be an object"],
    }
  }

  validateKnownKeys(manifest, manifestKeys, "manifest", issues)

  if (typeof manifest.id !== "string" || !pluginIdPattern.test(manifest.id)) {
    issues.push("id must be a lowercase package-style identifier")
  }

  if (typeof manifest.name !== "string" || !manifest.name.trim()) {
    issues.push("name must not be empty")
  }

  if (typeof manifest.version !== "string" || !pluginVersionPattern.test(manifest.version)) {
    issues.push("version must be a semantic version")
  }

  if (manifest.apiVersion !== PLUGIN_API_VERSION) {
    issues.push(`apiVersion must be ${PLUGIN_API_VERSION}`)
  }

  const isSupportedKind = typeof manifest.kind === "string"
    && pluginKinds.some((kind) => kind === manifest.kind)
  if (!isSupportedKind) {
    issues.push("kind is not supported")
  }

  if (typeof manifest.slot !== "string" || !manifest.slot.trim()) {
    issues.push("slot must not be empty")
  } else if (
    isSupportedKind && (manifest.kind === "feature"
      ? manifest.slot !== "feature" && !manifest.slot.startsWith("feature:")
      : manifest.slot !== manifest.kind)
  ) {
    issues.push(`slot must match plugin kind ${manifest.kind}`)
  }

  const hosts = Array.isArray(manifest.hosts) ? manifest.hosts : []
  if (
    hosts.length === 0
    || hosts.some((host) => (
      typeof host !== "string"
      || !pluginHosts.some((supportedHost) => supportedHost === host)
    ))
  ) {
    issues.push("hosts must contain at least one supported host")
  }

  if (hosts.length > 0 && new Set(hosts).size !== hosts.length) {
    issues.push("hosts must not contain duplicates")
  }

  const capabilities = Array.isArray(manifest.capabilities) ? manifest.capabilities : []
  if (
    !Array.isArray(manifest.capabilities)
    || capabilities.some((capability) => typeof capability !== "string")
  ) {
    issues.push("capabilities must be a string array")
  } else if (new Set(capabilities).size !== capabilities.length) {
    issues.push("capabilities must not contain duplicates")
  }

  const config = isRecord(manifest.config) ? manifest.config : undefined
  if (!config) {
    issues.push("config must be an object")
  } else {
    validateKnownKeys(config, configKeys, "config", issues)
    if (!Number.isSafeInteger(config.version) || Number(config.version) < 1) {
      issues.push("config.version must be a positive integer")
    }
  }

  if (
    config?.required !== undefined
    && typeof config.required !== "boolean"
  ) {
    issues.push("config.required must be a boolean")
  }

  if (config?.schema !== undefined) {
    issues.push(...validateJsonSchemaDefinition(
      config.schema,
      "/config/schema",
    ).map((issue) => `${issue.path}: ${issue.message}`))
  }

  if (manifest.kind === "runtime-platform") {
    const provider = manifest.provider
    if (
      typeof provider !== "string"
      || provider.length > 64
      || !runtimeProviderPattern.test(provider)
    ) {
      issues.push("runtime platform provider must be a lowercase stable identifier")
    }
  } else if (manifest.provider !== undefined) {
    issues.push("provider is only allowed for runtime-platform plugins")
  }

  const secrets = isRecord(manifest.secrets) ? manifest.secrets : undefined
  if (!secrets) {
    issues.push("secrets must be an object")
  }
  for (const [name, requirement] of Object.entries(secrets ?? {})) {
    if (!secretNamePattern.test(name)) {
      issues.push(`secret ${name} must be a lower camel-case identifier`)
    }

    if (!isRecord(requirement)) {
      issues.push(`secret ${name} must be an object`)
      continue
    }

    validateKnownKeys(
      requirement,
      secretRequirementKeys,
      `secret ${name}`,
      issues,
    )

    if (typeof requirement.required !== "boolean") {
      issues.push(`secret ${name} required must be a boolean`)
    }

    if (requirement.sensitive !== true) {
      issues.push(`secret ${name} must be marked sensitive`)
    }

    if (
      requirement.description !== undefined
      && typeof requirement.description !== "string"
    ) {
      issues.push(`secret ${name} description must be a string`)
    }

    if (
      requirement.defaultBinding !== undefined
      && (
        typeof requirement.defaultBinding !== "string"
        || !secretBindingPattern.test(requirement.defaultBinding)
      )
    ) {
      issues.push(`secret ${name} defaultBinding must use SCREAMING_SNAKE_CASE`)
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function validateKnownKeys(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  path: string,
  issues: string[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      issues.push(`${path}.${key} is not supported`)
    }
  }
}

function toCanonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toCanonicalJson)
  }
  if (typeof value !== "object" || value === null) {
    return value
  }

  const record = value as Record<string, unknown>
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => [key, toCanonicalJson(record[key])]),
  )
}
