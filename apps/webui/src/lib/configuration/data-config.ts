import "server-only";

import {
  bootstrapConfig,
  defaultDataConfig,
} from "@i0c/config";
import type { DataConfig } from "@i0c/config";

import {
  APP_DATA_CONFIG_CACHE_TAG,
  getAppDataConfig,
  type GitHubDataDocumentPayload,
} from "@/lib/github";
import { validateInstanceDataConfig } from "@/lib/configuration/validation";
import { resolveWebUiPlugins } from "@/lib/plugins/registry";

import { EffectiveDataConfigCache } from "./effective-data-config-cache";

interface DataConfigDocument {
  config: DataConfig;
  document: GitHubDataDocumentPayload;
}

interface DataConfigGlobalState {
  effectiveDataConfigCache?: EffectiveDataConfigCache;
}

const publicDataConfigUrl = buildPublicDataConfigUrl();
const dataConfigGlobal = globalThis as typeof globalThis & DataConfigGlobalState;
const effectiveDataConfigCache = dataConfigGlobal.effectiveDataConfigCache
  ?? new EffectiveDataConfigCache({
    adoptCacheSeconds: 60,
    defaultConfig: defaultDataConfig,
    failureRetrySeconds: 10,
    loadRemote: readRemoteDataConfig,
    onLoadError: (error) => {
      console.error("Failed to load remote instance config", error);
    },
    successCacheSeconds: (config) =>
      Math.min(config.runtime.configCacheTtlSeconds, 60),
  });
dataConfigGlobal.effectiveDataConfigCache = effectiveDataConfigCache;

export async function readDataConfigDocument(
  accessToken?: string,
): Promise<DataConfigDocument> {
  const document = await readRawDataConfigDocument(accessToken);
  return {
    config: parseDataConfig(document.content),
    document,
  };
}

export function readRawDataConfigDocument(
  accessToken?: string,
): Promise<GitHubDataDocumentPayload> {
  return getAppDataConfig(accessToken);
}

export async function getEffectiveDataConfig(): Promise<DataConfig> {
  return (await effectiveDataConfigCache.get()).config;
}

export function getAuthoritativeDataConfig(): Promise<DataConfig> {
  return effectiveDataConfigCache.getAuthoritative();
}

export function adoptDataConfigCache(config: DataConfig): void {
  effectiveDataConfigCache.adopt(config);
}

export function parseDataConfig(content: string): DataConfig {
  let value: unknown;
  try {
    value = JSON.parse(content) as unknown;
  } catch {
    throw new Error("Instance config must be valid JSON");
  }

  const result = validateInstanceDataConfig(value);
  if (result.status === "valid") {
    resolveWebUiPlugins(result.config);
    return result.config;
  }

  const shownIssues = result.issues
    .slice(0, 5)
    .map((item) => `${item.path}: ${item.message}`);
  const remainingCount = result.issues.length - shownIssues.length;
  const details = [
    ...shownIssues,
    ...(remainingCount > 0 ? [`and ${remainingCount} more`] : []),
  ].join("; ");
  throw new Error(`Instance config validation failed: ${details}`);
}

async function readRemoteDataConfig(): Promise<DataConfig> {
  let publicSourceError: unknown;
  try {
    const response = await fetch(publicDataConfigUrl, {
      next: {
        revalidate: 60,
        tags: [APP_DATA_CONFIG_CACHE_TAG],
      },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to load public instance config: ${response.status} ${response.statusText}`,
      );
    }
    return parseDataConfig(await response.text());
  } catch (error) {
    publicSourceError = error;
  }

  try {
    return (await readDataConfigDocument()).config;
  } catch (repositoryError) {
    throw new AggregateError(
      [publicSourceError, repositoryError],
      "All remote instance config sources failed",
    );
  }
}

function buildPublicDataConfigUrl(): string {
  const target = bootstrapConfig.data.github;
  const path = target.configPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return [
    "https://raw.githubusercontent.com",
    encodeURIComponent(target.owner),
    encodeURIComponent(target.repository),
    encodeURIComponent(target.branch),
    path,
  ].join("/");
}
