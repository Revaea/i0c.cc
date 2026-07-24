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
  "description",
  "hosts",
  "id",
  "kind",
  "name",
  "provider",
  "secrets",
  "slot",
  "version",
])
const configKeys = new Set(["required", "schema", "ui", "version"])
const descriptionKeys = new Set(["summary"])
const configUiKeys = new Set(["fields"])
const configFieldUiControls = new Set([
  "number",
  "secret-binding",
  "select",
  "switch",
  "text",
])
const configFieldUiKeys = new Set([
  "control",
  "help",
  "label",
  "order",
  "placeholder",
])
const secretRequirementKeys = new Set([
  "defaultBinding",
  "description",
  "help",
  "label",
  "order",
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
  if (manifest.description !== undefined) {
    const description = isRecord(manifest.description)
      ? manifest.description
      : undefined
    if (!description) {
      issues.push("description must be an object")
    } else {
      validateKnownKeys(description, descriptionKeys, "description", issues)
      if (description.summary === undefined) {
        issues.push("description.summary is required")
      }
      validateLocalizedText(description.summary, "description.summary", issues)
    }
  }

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

  if (config?.ui !== undefined) {
    validateConfigUi(config.ui, issues)
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

    validateLocalizedText(requirement.help, `secret ${name} help`, issues)
    validateLocalizedText(requirement.label, `secret ${name} label`, issues)

    if (
      requirement.order !== undefined
      && (!Number.isSafeInteger(requirement.order) || Number(requirement.order) < 0)
    ) {
      issues.push(`secret ${name} order must be a non-negative integer`)
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

function validateConfigUi(value: unknown, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push("config.ui must be an object")
    return
  }

  validateKnownKeys(value, configUiKeys, "config.ui", issues)
  if (value.fields === undefined) {
    return
  }

  if (!isRecord(value.fields)) {
    issues.push("config.ui.fields must be an object")
    return
  }

  for (const [fieldName, field] of Object.entries(value.fields)) {
    const path = `config.ui.fields.${fieldName}`
    if (!isRecord(field)) {
      issues.push(`${path} must be an object`)
      continue
    }

    validateKnownKeys(field, configFieldUiKeys, path, issues)
    if (
      field.control !== undefined
      && (
        typeof field.control !== "string"
        || !configFieldUiControls.has(field.control)
      )
    ) {
      issues.push(`${path}.control is not supported`)
    }
    if (
      field.order !== undefined
      && (!Number.isSafeInteger(field.order) || Number(field.order) < 0)
    ) {
      issues.push(`${path}.order must be a non-negative integer`)
    }
    validateLocalizedText(field.label, `${path}.label`, issues)
    validateLocalizedText(field.help, `${path}.help`, issues)
    validateLocalizedText(field.placeholder, `${path}.placeholder`, issues)
  }
}

function validateLocalizedText(
  value: unknown,
  path: string,
  issues: string[],
): void {
  if (value === undefined) {
    return
  }
  if (typeof value === "string") {
    if (!value.trim()) {
      issues.push(`${path} must not be empty`)
    }
    return
  }
  if (!isRecord(value)) {
    issues.push(`${path} must be a string or locale map`)
    return
  }

  const entries = Object.entries(value)
  if (entries.length === 0) {
    issues.push(`${path} must not be empty`)
    return
  }

  for (const [locale, text] of entries) {
    if (!locale.trim() || typeof text !== "string" || !text.trim()) {
      issues.push(`${path}.${locale} must be a non-empty string`)
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
