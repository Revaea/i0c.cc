import type { JWT } from "next-auth/jwt";

import type { WebUiAccessMode } from "@i0c/config";

const githubUserIdPattern = /^[1-9]\d*$/;

export type AuthorizedWebUiToken = JWT & { accessToken: string };

export function isValidGitHubUserId(
  githubUserId: string | null | undefined,
): githubUserId is string {
  return Boolean(githubUserId && githubUserIdPattern.test(githubUserId));
}

export function resolveTokenGitHubUserId(
  token: JWT | null,
): string | undefined {
  if (isValidGitHubUserId(token?.githubUserId)) {
    return token.githubUserId;
  }

  // NextAuth's JWT strategy stored the GitHub profile ID in sub before githubUserId existed.
  return isValidGitHubUserId(token?.sub) ? token.sub : undefined;
}

export function migrateTokenGitHubUserId(token: JWT): void {
  const githubUserId = resolveTokenGitHubUserId(token);
  if (githubUserId) {
    token.githubUserId = githubUserId;
  }
}

export function hasWebUiAccessToken(
  token: JWT | null,
): token is AuthorizedWebUiToken {
  return typeof token?.accessToken === "string" && token.accessToken.length > 0;
}

export function canGitHubUserSignInForAccessMode(
  githubUserId: string | null | undefined,
  mode: WebUiAccessMode,
  managerGitHubUserIds: ReadonlySet<string>,
): boolean {
  if (!isValidGitHubUserId(githubUserId)) {
    return false;
  }

  return mode === "authenticated"
    || mode === "public-readonly"
    || managerGitHubUserIds.has(githubUserId);
}

export function isGitHubUserManagerForAccessMode(
  githubUserId: string | null | undefined,
  mode: WebUiAccessMode,
  managerGitHubUserIds: ReadonlySet<string>,
): boolean {
  if (!isValidGitHubUserId(githubUserId)) {
    return false;
  }

  return mode === "authenticated" || managerGitHubUserIds.has(githubUserId);
}

export function isTokenAuthorizedForAccessMode(
  token: JWT | null,
  mode: WebUiAccessMode,
  managerGitHubUserIds: ReadonlySet<string>,
): token is AuthorizedWebUiToken {
  if (!hasWebUiAccessToken(token)) {
    return false;
  }

  if (mode === "authenticated") {
    return true;
  }

  return isGitHubUserManagerForAccessMode(
    resolveTokenGitHubUserId(token),
    mode,
    managerGitHubUserIds,
  );
}

export function applyWebUiTokenAuthorization(
  token: JWT,
  mode: WebUiAccessMode,
  managerGitHubUserIds: ReadonlySet<string>,
): boolean {
  migrateTokenGitHubUserId(token);
  const isAuthorized = isTokenAuthorizedForAccessMode(
    token,
    mode,
    managerGitHubUserIds,
  );

  if (!isAuthorized) {
    delete token.accessToken;
  }

  return isAuthorized;
}
