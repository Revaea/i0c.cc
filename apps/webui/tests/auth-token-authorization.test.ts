import assert from "node:assert/strict";
import test from "node:test";

import type { JWT } from "next-auth/jwt";

import {
  applyWebUiTokenAuthorization,
  canGitHubUserSignInForAccessMode,
  isTokenBlockedForAccessMode,
  isTokenAuthorizedForAccessMode,
} from "../src/auth/token-authorization";

const managerGitHubUserIds = new Set(["10000001"]);
const blockedGitHubUserIds = new Set<string>();

test("authorizes legacy manager tokens before session migration", () => {
  const token: JWT = {
    sub: "10000001",
    accessToken: "github-token",
  };

  assert.equal(
    isTokenAuthorizedForAccessMode(
      token,
      "public-readonly",
      managerGitHubUserIds,
      blockedGitHubUserIds,
    ),
    true,
  );
  assert.equal(token.githubUserId, undefined);
});

test("migrates legacy manager tokens without removing the access token", () => {
  const token: JWT = {
    sub: "10000001",
    accessToken: "github-token",
  };

  assert.equal(
    applyWebUiTokenAuthorization(
      token,
      "public-readonly",
      managerGitHubUserIds,
      blockedGitHubUserIds,
    ),
    true,
  );
  assert.equal(token.githubUserId, "10000001");
  assert.equal(token.accessToken, "github-token");
});

test("keeps current manager tokens authorized", () => {
  const token: JWT = {
    githubUserId: "10000001",
    sub: "10000001",
    accessToken: "github-token",
  };

  assert.equal(
    isTokenAuthorizedForAccessMode(
      token,
      "public-readonly",
      managerGitHubUserIds,
      blockedGitHubUserIds,
    ),
    true,
  );
});

test("removes the access token from public read-only users", () => {
  const token: JWT = {
    sub: "99999999",
    accessToken: "github-token",
  };

  assert.equal(
    applyWebUiTokenAuthorization(
      token,
      "public-readonly",
      managerGitHubUserIds,
      blockedGitHubUserIds,
    ),
    false,
  );
  assert.equal(token.githubUserId, "99999999");
  assert.equal(token.accessToken, undefined);
});

test("requires sign-in again after an older token already lost its access token", () => {
  const token: JWT = {
    sub: "10000001",
  };

  assert.equal(
    applyWebUiTokenAuthorization(
      token,
      "public-readonly",
      managerGitHubUserIds,
      blockedGitHubUserIds,
    ),
    false,
  );
  assert.equal(token.githubUserId, "10000001");
});

test("rejects blocked users in authenticated and public read-only modes", () => {
  const blockedIds = new Set(["99999999"]);

  assert.equal(
    canGitHubUserSignInForAccessMode(
      "99999999",
      "authenticated",
      managerGitHubUserIds,
      blockedIds,
    ),
    false,
  );
  assert.equal(
    canGitHubUserSignInForAccessMode(
      "99999999",
      "public-readonly",
      managerGitHubUserIds,
      blockedIds,
    ),
    false,
  );
});

test("ignores blocked user IDs in manager-only mode", () => {
  const blockedIds = new Set(["10000001"]);

  assert.equal(
    canGitHubUserSignInForAccessMode(
      "10000001",
      "allowlist",
      managerGitHubUserIds,
      blockedIds,
    ),
    true,
  );
});

test("revokes an existing blocked user token", () => {
  const token: JWT = {
    sub: "99999999",
    accessToken: "github-token",
  };
  const blockedIds = new Set(["99999999"]);

  assert.equal(
    applyWebUiTokenAuthorization(
      token,
      "authenticated",
      managerGitHubUserIds,
      blockedIds,
    ),
    false,
  );
  assert.equal(
    isTokenBlockedForAccessMode(token, "authenticated", blockedIds),
    true,
  );
  assert.equal(token.accessToken, undefined);
});
