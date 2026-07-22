import {
  validateDataConfig,
  type DataConfigValidationResult,
} from "@i0c/config";
import { validateInstalledPluginDeclarations } from "@i0c/plugin-catalog";

import { runtimePlatformManifests } from "../../../../../i0c.runtime.config";

export function validateInstanceDataConfig(value: unknown): DataConfigValidationResult {
  const coreResult = validateDataConfig(value);
  if (coreResult.status === "invalid") {
    return coreResult;
  }

  const pluginIssues = validateInstalledPluginDeclarations(
    coreResult.config.plugins,
    runtimePlatformManifests
  );
  return pluginIssues.length > 0
    ? { status: "invalid", issues: [...pluginIssues] }
    : coreResult;
}
