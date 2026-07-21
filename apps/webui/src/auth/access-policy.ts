import "server-only";

import type { JWT } from "next-auth/jwt";

import { appConfig, type WebUiAccessMode } from "@i0c/config";

import {
  applyWebUiTokenAuthorization as applyTokenAuthorization,
  canGitHubUserSignInForAccessMode,
  isGitHubUserManagerForAccessMode,
  isTokenAuthorizedForAccessMode,
  isValidGitHubUserId,
} from "./token-authorization";

export { hasWebUiAccessToken } from "./token-authorization";

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
  if (values.some((value) => !isValidGitHubUserId(value))) {
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
const emptyGitHubUserIds = new Set<string>();

function getManagerGitHubUserIds(): ReadonlySet<string> {
  return accessPolicy.mode === "authenticated"
    ? emptyGitHubUserIds
    : accessPolicy.allowedGitHubUserIds;
}

export function isWebUiPublicReadOnly(): boolean {
  return accessPolicy.mode === "public-readonly";
}

export function canGitHubUserSignIn(
  githubUserId: string | null | undefined,
): boolean {
  return canGitHubUserSignInForAccessMode(
    githubUserId,
    accessPolicy.mode,
    getManagerGitHubUserIds(),
  );
}

export function isGitHubUserManager(
  githubUserId: string | null | undefined,
): boolean {
  return isGitHubUserManagerForAccessMode(
    githubUserId,
    accessPolicy.mode,
    getManagerGitHubUserIds(),
  );
}

export function isWebUiTokenAuthorized(
  token: JWT | null,
): token is JWT & { accessToken: string } {
  return isTokenAuthorizedForAccessMode(
    token,
    accessPolicy.mode,
    getManagerGitHubUserIds(),
  );
}

export function applyWebUiTokenAuthorization(token: JWT): boolean {
  return applyTokenAuthorization(
    token,
    accessPolicy.mode,
    getManagerGitHubUserIds(),
  );
}
