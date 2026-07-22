import {
  PLUGIN_API_VERSION,
  pluginHosts,
  pluginKinds,
  type PluginManifest,
} from "./manifest"

const pluginIdPattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/
const pluginVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const secretNamePattern = /^[a-z][A-Za-z0-9]*$/
const secretBindingPattern = /^[A-Z][A-Z0-9_]*$/

export interface PluginManifestValidationResult {
  valid: boolean
  issues: readonly string[]
}

export function validatePluginManifest(manifest: PluginManifest): PluginManifestValidationResult {
  const issues: string[] = []

  if (!pluginIdPattern.test(manifest.id)) {
    issues.push("id must be a lowercase package-style identifier")
  }

  if (!manifest.name.trim()) {
    issues.push("name must not be empty")
  }

  if (!pluginVersionPattern.test(manifest.version)) {
    issues.push("version must be a semantic version")
  }

  if (manifest.apiVersion !== PLUGIN_API_VERSION) {
    issues.push(`apiVersion must be ${PLUGIN_API_VERSION}`)
  }

  if (!pluginKinds.includes(manifest.kind)) {
    issues.push("kind is not supported")
  }

  if (!manifest.slot.trim()) {
    issues.push("slot must not be empty")
  }

  if (manifest.hosts.length === 0 || manifest.hosts.some((host) => !pluginHosts.includes(host))) {
    issues.push("hosts must contain at least one supported host")
  }

  if (new Set(manifest.hosts).size !== manifest.hosts.length) {
    issues.push("hosts must not contain duplicates")
  }

  if (new Set(manifest.capabilities).size !== manifest.capabilities.length) {
    issues.push("capabilities must not contain duplicates")
  }

  if (!Number.isSafeInteger(manifest.config.version) || manifest.config.version < 1) {
    issues.push("config.version must be a positive integer")
  }

  for (const [name, requirement] of Object.entries(manifest.secrets)) {
    if (!secretNamePattern.test(name)) {
      issues.push(`secret ${name} must be a lower camel-case identifier`)
    }

    if (requirement.sensitive !== true) {
      issues.push(`secret ${name} must be marked sensitive`)
    }

    if (
      requirement.defaultBinding !== undefined &&
      !secretBindingPattern.test(requirement.defaultBinding)
    ) {
      issues.push(`secret ${name} defaultBinding must use SCREAMING_SNAKE_CASE`)
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}
