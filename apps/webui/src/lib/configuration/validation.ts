import {
  validateDataConfig,
  type DataConfigValidationResult,
} from "@i0c/config";
import { validateInstalledPluginDeclarations } from "@i0c/plugin-catalog";

export function validateInstanceDataConfig(value: unknown): DataConfigValidationResult {
  const coreResult = validateDataConfig(value);
  if (coreResult.status === "invalid") {
    return coreResult;
  }

  const pluginIssues = validateInstalledPluginDeclarations(coreResult.config.plugins);
  return pluginIssues.length > 0
    ? { status: "invalid", issues: [...pluginIssues] }
    : coreResult;
}
