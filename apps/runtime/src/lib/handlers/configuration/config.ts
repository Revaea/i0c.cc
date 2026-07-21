/**
 * @file config.ts
 * @description
 * [EN] Versioned redirect configuration resolution.
 * Builds the redirection rules URL from the repository-owned shared configuration.
 *
 * [CN] 版本化重定向配置解析。
 * 根据仓库维护的共享配置构建重定向规则地址。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import { appConfig } from "@i0c/config";

const redirectSource = appConfig.redirects.github;
const CONFIG_REPO = `${redirectSource.owner}/${redirectSource.repository}`;
const CONFIG_BRANCH = redirectSource.branch;
const CONFIG_PATH = redirectSource.path;

export function buildConfigUrl(parts?: { repo?: string; branch?: string; path?: string }): string {
  const repo = parts?.repo ?? CONFIG_REPO;
  const branch = parts?.branch ?? CONFIG_BRANCH;
  const path = parts?.path ?? CONFIG_PATH;
  return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
}

export const DEFAULT_CONFIG_URL = buildConfigUrl();
