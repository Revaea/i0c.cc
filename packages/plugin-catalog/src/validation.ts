import type {
  PluginConfigurationDeclaration,
  PluginRegistryIssue,
} from "@i0c/plugin-api"

import { installedPluginRegistry } from "./catalog"

const runtimePlatformPluginIds = [
  "@i0c/runtime-cloudflare",
  "@i0c/runtime-vercel",
  "@i0c/runtime-netlify",
] as const

export function validateInstalledPluginDeclarations(
  declarations: Readonly<Record<string, PluginConfigurationDeclaration>>,
): readonly PluginRegistryIssue[] {
  const issues: PluginRegistryIssue[] = []

  for (const selectedPlatformId of runtimePlatformPluginIds) {
    const runtimeDeclarations = { ...declarations }
    for (const platformId of runtimePlatformPluginIds) {
      if (platformId !== selectedPlatformId) {
        delete runtimeDeclarations[platformId]
      }
    }
    collectIssues("runtime", runtimeDeclarations, issues)
  }
  collectIssues("collector", declarations, issues)
  collectIssues("webui", declarations, issues)

  return issues.filter((issue, index, allIssues) =>
    allIssues.findIndex((candidate) =>
      candidate.path === issue.path && candidate.message === issue.message,
    ) === index,
  )
}

function collectIssues(
  host: "collector" | "runtime" | "webui",
  declarations: Readonly<Record<string, PluginConfigurationDeclaration>>,
  issues: PluginRegistryIssue[],
): void {
  const result = installedPluginRegistry.resolve(host, declarations)
  if (result.status === "invalid") {
    issues.push(...result.issues)
  }
}
