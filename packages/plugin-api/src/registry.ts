import { validateJsonSchema } from "./json-schema"
import type { PluginHost, PluginManifest } from "./manifest"
import type { JsonObject } from "./types"
import { validatePluginManifest } from "./validation"

export interface PluginConfigurationDeclaration {
  enabled: boolean
  version?: number
  config?: JsonObject
  secrets?: Readonly<Record<string, string>>
}

export interface PluginRegistryIssue {
  path: string
  message: string
}

export interface ResolvedPluginConfiguration {
  manifest: PluginManifest
  declaration: PluginConfigurationDeclaration
}

export type PluginRegistryResolution =
  | { status: "valid"; plugins: readonly ResolvedPluginConfiguration[] }
  | { status: "invalid"; issues: readonly PluginRegistryIssue[] }

export interface StaticPluginRegistryOptions {
  recognizedPluginIds?: readonly string[]
}

export class StaticPluginRegistry {
  readonly manifests: readonly PluginManifest[]
  private readonly byId: ReadonlyMap<string, PluginManifest>
  private readonly recognizedPluginIds: ReadonlySet<string>

  constructor(
    manifests: readonly PluginManifest[],
    options: StaticPluginRegistryOptions = {},
  ) {
    const issues: PluginRegistryIssue[] = []
    const byId = new Map<string, PluginManifest>()
    for (const [index, manifest] of manifests.entries()) {
      const result = validatePluginManifest(manifest)
      const manifestId = manifest !== null
        && typeof manifest === "object"
        && "id" in manifest
        && typeof manifest.id === "string"
        ? manifest.id
        : `invalid-${index}`
      issues.push(...result.issues.map((message) => ({
        path: `/manifests/${escapeJsonPointer(manifestId)}`,
        message,
      })))
      if (byId.has(manifestId)) {
        issues.push({
          path: `/manifests/${escapeJsonPointer(manifestId)}`,
          message: "plugin ID is registered more than once",
        })
      }
      byId.set(manifestId, manifest)
    }
    if (issues.length > 0) {
      throw new TypeError(formatRegistryIssues(issues))
    }
    this.manifests = [...manifests]
    this.byId = byId
    this.recognizedPluginIds = new Set([
      ...byId.keys(),
      ...(options.recognizedPluginIds ?? []),
    ])
  }

  resolve(
    host: PluginHost,
    declarations: Readonly<Record<string, PluginConfigurationDeclaration>>,
  ): PluginRegistryResolution {
    const issues: PluginRegistryIssue[] = []
    const enabled: ResolvedPluginConfiguration[] = []
    const slots = new Map<string, string>()

    for (const [id, declaration] of Object.entries(declarations)) {
      const path = `/plugins/${escapeJsonPointer(id)}`
      const manifest = this.byId.get(id)
      if (!manifest) {
        if (this.recognizedPluginIds.has(id)) {
          continue
        }
        issues.push({ path, message: "plugin is not installed in this host" })
        continue
      }
      if (!declaration.enabled) {
        continue
      }
      if (!manifest.hosts.includes(host)) {
        continue
      }
      if (
        declaration.version !== undefined
        && declaration.version !== manifest.config.version
      ) {
        issues.push({
          path: `${path}/version`,
          message: `must be ${manifest.config.version}`,
        })
      }
      if (manifest.config.required && declaration.config === undefined) {
        issues.push({
          path: `${path}/config`,
          message: "is required",
        })
      } else if (declaration.config !== undefined && manifest.config.schema) {
        issues.push(...validateJsonSchema(
          manifest.config.schema,
          declaration.config,
          `${path}/config`,
        ))
      }
      validateSecrets(manifest, declaration, path, issues)

      const occupyingPlugin = slots.get(manifest.slot)
      if (occupyingPlugin) {
        issues.push({
          path,
          message: `slot ${manifest.slot} is already occupied by ${occupyingPlugin}`,
        })
      } else {
        slots.set(manifest.slot, manifest.id)
      }
      enabled.push({ manifest, declaration })
    }

    return issues.length > 0
      ? { status: "invalid", issues }
      : { status: "valid", plugins: enabled }
  }
}

function validateSecrets(
  manifest: PluginManifest,
  declaration: PluginConfigurationDeclaration,
  path: string,
  issues: PluginRegistryIssue[],
): void {
  const bindings = declaration.secrets ?? {}
  for (const key of Object.keys(bindings)) {
    if (!(key in manifest.secrets)) {
      issues.push({
        path: `${path}/secrets/${escapeJsonPointer(key)}`,
        message: "secret is not declared by the plugin manifest",
      })
    }
  }
  for (const [key, requirement] of Object.entries(manifest.secrets)) {
    if (requirement.required && !bindings[key] && !requirement.defaultBinding) {
      issues.push({
        path: `${path}/secrets/${escapeJsonPointer(key)}`,
        message: "required secret binding is missing",
      })
    }
  }
}

function formatRegistryIssues(issues: readonly PluginRegistryIssue[]): string {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n")
}

function escapeJsonPointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1")
}
