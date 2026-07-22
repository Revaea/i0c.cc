/**
 * @file features.ts
 * @description
 * [EN] Builds the ordered Runtime feature pipeline from validated remote plugin declarations.
 * Keeps optional feature failures isolated from redirect execution.
 *
 * [CN] 根据已校验的远程插件声明构建有序 Runtime Feature 管线。
 * 将可选功能故障与重定向执行隔离。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import type { AnalyticsClassificationHookContext } from "@i0c/analytics-domain/classification";
import type { DataConfig } from "@i0c/config";
import {
  resolveBotClassifierConfig
} from "@i0c/plugin-feature-bot-classifier/config";
import {
  BOT_CLASSIFIER_PLUGIN_ID
} from "@i0c/plugin-feature-bot-classifier/manifest";
import {
  createBotClassifierFeature
} from "@i0c/plugin-feature-bot-classifier/runtime";
import { RuntimeFeaturePipeline } from "@i0c/plugin-api";
import type { RuntimeFeatureRegistration } from "@i0c/plugin-api";

import type {
  RuntimeAnalyticsFeaturePipeline,
  RuntimeFeatureRegistrationInput
} from "@handlers/core/types";

import { runtimePluginLogger } from "./logger";
import {
  resolveRuntimePluginConfigurations,
  type RuntimePlatformSelection
} from "./registry";

export function createRuntimeFeaturePipeline(
  config: DataConfig,
  platform: RuntimePlatformSelection,
  additionalRegistrations: readonly RuntimeFeatureRegistrationInput[] = []
): RuntimeAnalyticsFeaturePipeline {
  const configuredPlugins = resolveRuntimePluginConfigurations(config, platform);
  const registrations: RuntimeFeatureRegistration<
    AnalyticsClassificationHookContext
  >[] = [...additionalRegistrations];
  const botClassifier = configuredPlugins.find(
    (plugin) => plugin.manifest.id === BOT_CLASSIFIER_PLUGIN_ID
  );

  if (botClassifier) {
    registrations.push(createBotClassifierFeature(
      resolveBotClassifierConfig(botClassifier.declaration.config)
    ));
  }

  return new RuntimeFeaturePipeline(registrations, runtimePluginLogger);
}
