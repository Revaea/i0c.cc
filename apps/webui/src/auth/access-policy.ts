import "server-only";

import { appConfig, type WebUiAccessMode } from "@i0c/config";
import type { JWT } from "next-auth/jwt";

const githubUserIdPattern = /^[1-9]\d*$/;

interface AuthenticatedAccessPolicy {
  mode: "authenticated";
}

interface PublicReadOnlyAccessPolicy {
  mode: "public-readonly";
  allowedGitHubUserIds: ReadonlySet<string>;
}

interface AllowlistAccessPolicy {
  mode: "allowlist";
  allowedGitHubUserIds: ReadonlySet<string>;
}

type WebUiAccessPolicy =
  | AuthenticatedAccessPolicy
  | PublicReadOnlyAccessPolicy
  | AllowlistAccessPolicy;

function parseAllowedGitHubUserIds(values: readonly string[]): ReadonlySet<string> {
  if (values.some((value) => !githubUserIdPattern.test(value))) {
    throw new Error(
      "appConfig.webui.access.managerGitHubUserIds must contain GitHub numeric user IDs",
    );
  }

  return new Set(values);
}

function readConfiguredAccessMode(): WebUiAccessMode {
  return appConfig.webui.access.mode;
}

function readWebUiAccessPolicy(): WebUiAccessPolicy {
  const mode = readConfiguredAccessMode();
  const allowedGitHubUserIds = parseAllowedGitHubUserIds(
    appConfig.webui.access.managerGitHubUserIds,
  );

  if (mode === "authenticated") {
    return { mode };
  }

  if (mode === "allowlist" || mode === "public-readonly") {
    if (mode === "allowlist" && allowedGitHubUserIds.size === 0) {
      throw new Error(
        "appConfig.webui.access.managerGitHubUserIds is required in allowlist mode",
      );
    }

    return {
      mode,
      allowedGitHubUserIds,
    };
  }

  throw new Error(
    "appConfig.webui.access.mode must be authenticated, allowlist, or public-readonly",
  );
}

const accessPolicy = readWebUiAccessPolicy();

export function isWebUiPublicReadOnly(): boolean {
  return accessPolicy.mode === "public-readonly";
}

function isValidGitHubUserId(
  githubUserId: string | null | undefined,
): githubUserId is string {
  return Boolean(githubUserId && githubUserIdPattern.test(githubUserId));
}

export function canGitHubUserSignIn(
  githubUserId: string | null | undefined,
): boolean {
  if (!isValidGitHubUserId(githubUserId)) {
    return false;
  }

  if (
    accessPolicy.mode === "authenticated" ||
    accessPolicy.mode === "public-readonly"
  ) {
    return true;
  }

  return accessPolicy.allowedGitHubUserIds.has(githubUserId);
}

export function isGitHubUserManager(
  githubUserId: string | null | undefined,
): boolean {
  if (!isValidGitHubUserId(githubUserId)) {
    return false;
  }

  if (accessPolicy.mode === "authenticated") {
    return true;
  }

  return accessPolicy.allowedGitHubUserIds.has(githubUserId);
}

export function hasWebUiAccessToken(
  token: JWT | null,
): token is JWT & { accessToken: string } {
  return typeof token?.accessToken === "string" && token.accessToken.length > 0;
}

export function isWebUiTokenAuthorized(
  token: JWT | null,
): token is JWT & { accessToken: string } {
  if (!hasWebUiAccessToken(token)) {
    return false;
  }

  if (accessPolicy.mode === "authenticated") {
    return true;
  }

  return isGitHubUserManager(token.githubUserId);
}
