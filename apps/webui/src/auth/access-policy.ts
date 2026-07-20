import "server-only";

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

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parseAllowedGitHubUserIds(value: string): ReadonlySet<string> {
  const values = value
    .split(",")
    .map((value) => value.trim());

  if (values.some((value) => !githubUserIdPattern.test(value))) {
    throw new Error("GITHUB_ALLOWED_USER_IDS must contain comma-separated GitHub numeric user IDs");
  }

  return new Set(values);
}

function readAllowedGitHubUserIds(): ReadonlySet<string> {
  return parseAllowedGitHubUserIds(requireEnv("GITHUB_ALLOWED_USER_IDS"));
}

function readOptionalAllowedGitHubUserIds(): ReadonlySet<string> {
  const value = process.env.GITHUB_ALLOWED_USER_IDS?.trim();
  return value ? parseAllowedGitHubUserIds(value) : new Set();
}

function readWebUiAccessPolicy(): WebUiAccessPolicy {
  const mode = requireEnv("WEBUI_ACCESS_MODE");

  if (mode === "authenticated") {
    return { mode };
  }

  if (mode === "allowlist" || mode === "public-readonly") {
    return {
      mode,
      allowedGitHubUserIds:
        mode === "allowlist"
          ? readAllowedGitHubUserIds()
          : readOptionalAllowedGitHubUserIds(),
    };
  }

  throw new Error(
    "WEBUI_ACCESS_MODE must be authenticated, allowlist, or public-readonly",
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
