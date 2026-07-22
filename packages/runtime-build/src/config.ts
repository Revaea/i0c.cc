import type { RuntimePlatformManifest } from "@i0c/plugin-api"
import { validatePluginManifest } from "@i0c/plugin-api"

const installationKeyPattern = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/
const outputEntryPattern = /^[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*$/

export interface RuntimePlatformInstallation {
  bundlePackages: readonly string[]
  key: string
  manifest: RuntimePlatformManifest
  outputEntry: string
  runtimeModule: string
}

export interface RuntimeInstallationConfig {
  platforms: readonly RuntimePlatformInstallation[]
}

export function defineRuntimePlatformInstallation(
  installation: RuntimePlatformInstallation,
): RuntimePlatformInstallation {
  validateRuntimePlatformInstallation(installation)
  return installation
}

export function defineRuntimeInstallationConfig(
  config: RuntimeInstallationConfig,
): RuntimeInstallationConfig {
  const keys = new Set<string>()
  const ids = new Set<string>()
  const providers = new Set<string>()

  for (const platform of config.platforms) {
    validateRuntimePlatformInstallation(platform)
    assertUnique(keys, platform.key, "installation key")
    assertUnique(ids, platform.manifest.id, "plugin ID")
    assertUnique(providers, platform.manifest.provider, "provider")
  }

  return config
}

export function parseRuntimeInstallationConfig(
  value: unknown,
): RuntimeInstallationConfig {
  if (!isRecord(value) || !Array.isArray(value.platforms)) {
    throw new TypeError("Runtime installation config must contain a platforms array")
  }
  return defineRuntimeInstallationConfig({
    platforms: value.platforms as RuntimePlatformInstallation[],
  })
}

export function resolveRuntimePlatformInstallation(
  config: RuntimeInstallationConfig,
  key: string,
): RuntimePlatformInstallation {
  const installation = config.platforms.find((candidate) => candidate.key === key)
  if (!installation) {
    throw new TypeError(`Runtime platform ${key} is not installed`)
  }
  return installation
}

function validateRuntimePlatformInstallation(
  installation: RuntimePlatformInstallation,
): void {
  const manifestResult = validatePluginManifest(installation.manifest)
  if (!manifestResult.valid) {
    throw new TypeError(manifestResult.issues.join("\n"))
  }
  if (!installationKeyPattern.test(installation.key)) {
    throw new TypeError("Runtime platform installation key is invalid")
  }
  if (!installation.runtimeModule.trim()) {
    throw new TypeError("Runtime platform module must not be empty")
  }
  if (!outputEntryPattern.test(installation.outputEntry)) {
    throw new TypeError("Runtime platform output entry must be a safe relative path")
  }
  if (installation.bundlePackages.some((name) => !name.trim())) {
    throw new TypeError("Runtime platform bundle package names must not be empty")
  }
}

function assertUnique(values: Set<string>, value: string, label: string): void {
  if (values.has(value)) {
    throw new TypeError(`Runtime platform ${label} ${value} is duplicated`)
  }
  values.add(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
