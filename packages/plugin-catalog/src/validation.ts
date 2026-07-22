import type {
  PluginConfigurationDeclaration,
  PluginManifest,
  PluginRegistryIssue,
} from "@i0c/plugin-api"
import { StaticPluginRegistry } from "@i0c/plugin-api"

import { installedPluginManifests } from "./catalog"

export function validateInstalledPluginDeclarations(
  declarations: Readonly<Record<string, PluginConfigurationDeclaration>>,
  additionalManifests: readonly PluginManifest[] = [],
): readonly PluginRegistryIssue[] {
  const issues: PluginRegistryIssue[] = []
  const manifests = mergeManifests(installedPluginManifests, additionalManifests)
  const registry = new StaticPluginRegistry(manifests)
  const runtimePlatformPluginIds = manifests
    .filter((manifest) => manifest.kind === "runtime-platform")
    .map((manifest) => manifest.id)

  for (const selectedPlatformId of runtimePlatformPluginIds) {
    const runtimeDeclarations = { ...declarations }
    for (const platformId of runtimePlatformPluginIds) {
      if (platformId !== selectedPlatformId) {
        delete runtimeDeclarations[platformId]
      }
    }
    collectIssues(registry, "runtime", runtimeDeclarations, issues)
  }
  collectIssues(registry, "collector", declarations, issues)
  collectIssues(registry, "webui", declarations, issues)

  return issues.filter((issue, index, allIssues) =>
    allIssues.findIndex((candidate) =>
      candidate.path === issue.path && candidate.message === issue.message,
    ) === index,
  )
}

function collectIssues(
  registry: StaticPluginRegistry,
  host: "collector" | "runtime" | "webui",
  declarations: Readonly<Record<string, PluginConfigurationDeclaration>>,
  issues: PluginRegistryIssue[],
): void {
  const result = registry.resolve(host, declarations)
  if (result.status === "invalid") {
    issues.push(...result.issues)
  }
}

function mergeManifests(
  baseManifests: readonly PluginManifest[],
  additionalManifests: readonly PluginManifest[],
): readonly PluginManifest[] {
  const manifests = new Map(baseManifests.map((manifest) => [manifest.id, manifest]))
  for (const manifest of additionalManifests) {
    manifests.set(manifest.id, manifest)
  }
  return [...manifests.values()]
}
