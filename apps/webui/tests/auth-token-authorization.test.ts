import assert from "node:assert/strict";
import test from "node:test";

import type { JWT } from "next-auth/jwt";

import {
  applyWebUiTokenAuthorization,
  isTokenAuthorizedForAccessMode,
} from "../src/auth/token-authorization";

const managerGitHubUserIds = new Set(["59095086"]);

test("authorizes legacy manager tokens before session migration", () => {
  const token: JWT = {
    sub: "59095086",
    accessToken: "github-token",
  };

  assert.equal(
    isTokenAuthorizedForAccessMode(
      token,
      "public-readonly",
      managerGitHubUserIds,
    ),
    true,
  );
  assert.equal(token.githubUserId, undefined);
});

test("migrates legacy manager tokens without removing the access token", () => {
  const token: JWT = {
    sub: "59095086",
    accessToken: "github-token",
  };

  assert.equal(
    applyWebUiTokenAuthorization(
      token,
      "public-readonly",
      managerGitHubUserIds,
    ),
    true,
  );
  assert.equal(token.githubUserId, "59095086");
  assert.equal(token.accessToken, "github-token");
});

test("keeps current manager tokens authorized", () => {
  const token: JWT = {
    githubUserId: "59095086",
    sub: "59095086",
    accessToken: "github-token",
  };

  assert.equal(
    isTokenAuthorizedForAccessMode(
      token,
      "public-readonly",
      managerGitHubUserIds,
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
    ),
    false,
  );
  assert.equal(token.githubUserId, "99999999");
  assert.equal(token.accessToken, undefined);
});

test("requires sign-in again after an older token already lost its access token", () => {
  const token: JWT = {
    sub: "59095086",
  };

  assert.equal(
    applyWebUiTokenAuthorization(
      token,
      "public-readonly",
      managerGitHubUserIds,
    ),
    false,
  );
  assert.equal(token.githubUserId, "59095086");
});
