import "server-only";

import type { JWT } from "next-auth/jwt";

import type { WebUiAccessMode } from "@i0c/config";

import { getAuthoritativeDataConfig } from "@/lib/configuration/data-config";

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
      "config.json webui.access.managerGitHubUserIds must contain GitHub numeric user IDs",
    );
  }

  return new Set(values);
}

async function readWebUiAccessPolicy(): Promise<WebUiAccessPolicy> {
  const config = await getAuthoritativeDataConfig();
  const mode: WebUiAccessMode = config.webui.access.mode;
  const allowedGitHubUserIds = parseAllowedGitHubUserIds(
    config.webui.access.managerGitHubUserIds,
  );

  if (mode === "authenticated") {
    return { mode };
  }

  if (mode === "allowlist" || mode === "public-readonly") {
    if (mode === "allowlist" && allowedGitHubUserIds.size === 0) {
      throw new Error(
        "config.json webui.access.managerGitHubUserIds is required in allowlist mode",
      );
    }

    return {
      mode,
      allowedGitHubUserIds,
    };
  }

  throw new Error(
    "config.json webui.access.mode must be authenticated, allowlist, or public-readonly",
  );
}

const emptyGitHubUserIds = new Set<string>();

function getManagerGitHubUserIds(accessPolicy: WebUiAccessPolicy): ReadonlySet<string> {
  return accessPolicy.mode === "authenticated"
    ? emptyGitHubUserIds
    : accessPolicy.allowedGitHubUserIds;
}

export async function isWebUiPublicReadOnly(): Promise<boolean> {
  const accessPolicy = await readWebUiAccessPolicy();
  return accessPolicy.mode === "public-readonly";
}

export async function canGitHubUserSignIn(
  githubUserId: string | null | undefined,
): Promise<boolean> {
  const accessPolicy = await readWebUiAccessPolicy();
  return canGitHubUserSignInForAccessMode(
    githubUserId,
    accessPolicy.mode,
    getManagerGitHubUserIds(accessPolicy),
  );
}

export async function isGitHubUserManager(
  githubUserId: string | null | undefined,
): Promise<boolean> {
  const accessPolicy = await readWebUiAccessPolicy();
  return isGitHubUserManagerForAccessMode(
    githubUserId,
    accessPolicy.mode,
    getManagerGitHubUserIds(accessPolicy),
  );
}

export async function isWebUiTokenAuthorized(
  token: JWT | null,
): Promise<boolean> {
  const accessPolicy = await readWebUiAccessPolicy();
  return isTokenAuthorizedForAccessMode(
    token,
    accessPolicy.mode,
    getManagerGitHubUserIds(accessPolicy),
  );
}

export async function applyWebUiTokenAuthorization(token: JWT): Promise<boolean> {
  const accessPolicy = await readWebUiAccessPolicy();
  return applyTokenAuthorization(
    token,
    accessPolicy.mode,
    getManagerGitHubUserIds(accessPolicy),
  );
}
