import assert from "node:assert/strict"
import { Buffer } from "node:buffer"
import test from "node:test"

import { defaultDataConfig, type DataConfig } from "@i0c/config"
import type { PluginLogger } from "@i0c/plugin-api"
import {
  assertPluginManifest,
  assertRuntimeDataSourceContract,
  assertVersionedDataRepositoryContract,
} from "@i0c/plugin-testkit"

import {
  githubContentsRepositoryManifest,
  githubRawSourceManifest,
} from "../src/manifest"
import { createGitHubRawDataSource } from "../src/runtime"
import { createGitHubContentsRepository } from "../src/webui"

const logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
} satisfies PluginLogger

test("declares valid source and repository manifests", () => {
  assertPluginManifest(githubRawSourceManifest)
  assertPluginManifest(githubContentsRepositoryManifest)
})

test("loads data config and redirects through the source contract", async () => {
  let currentConfig: DataConfig = defaultDataConfig
  const source = createGitHubRawDataSource(
    {
      dataConfigUrl: "https://example.com/plugin-test/config.json",
      redirectsConfigUrl: "https://example.com/plugin-test/redirects.json",
      dataConfigCacheTtlSeconds: 60,
      redirectsCacheTtlSeconds: 60,
      configFailureBackoffSeconds: 30,
      redirectsFailureBackoffSeconds: 10,
    },
    {
      async fetchImpl(input) {
        return String(input).endsWith("config.json")
          ? Response.json(defaultDataConfig)
          : Response.json({ Slots: { Main: { "/": "https://example.com" } } })
      },
      getCurrentDataConfig: () => currentConfig,
      logger,
      now: () => 0,
      setCurrentDataConfig(config) {
        currentConfig = config
      },
    },
  )

  await assertRuntimeDataSourceContract({
    source,
    expectedConfig: defaultDataConfig,
    expectedRules: {
      Slots: {
        Main: {
          "/": "https://example.com",
        },
      },
    },
  })
})

test("reads and writes versioned GitHub documents through the repository contract", async () => {
  let content = "before"
  let sha = "1"
  const repository = createGitHubContentsRepository(
    {
      owner: "Revaea",
      repository: "i0c.cc",
      branch: "data",
      configPath: "config.json",
      redirectsPath: "redirects.json",
      publicRevalidateSeconds: 60,
    },
    {
      async fetchImpl(_input, init) {
        if (init?.method === "PUT") {
          const body = JSON.parse(String(init.body)) as {
            content: string
            sha: string
          }
          assert.equal(body.sha, sha)
          content = Buffer.from(body.content, "base64").toString("utf8")
          sha = "2"
          return Response.json({
            content: { sha },
            commit: { html_url: "https://github.com/Revaea/i0c.cc/commit/2" },
          })
        }

        return Response.json({
          content: Buffer.from(content, "utf8").toString("base64"),
          sha,
          path: "config.json",
        })
      },
    },
  )

  await assertVersionedDataRepositoryContract({
    repository,
    kind: "config",
    readOptions: {},
    writeInput: {
      accessToken: "test-token",
      content: "after",
      sha: "1",
    },
    expectedBefore: {
      content: "before",
      sha: "1",
      path: "config.json",
      htmlUrl: undefined,
      lastModified: undefined,
    },
    expectedWriteResult: {
      sha: "2",
      commitUrl: "https://github.com/Revaea/i0c.cc/commit/2",
    },
    expectedAfter: {
      content: "after",
      sha: "2",
      path: "config.json",
      htmlUrl: undefined,
      lastModified: undefined,
    },
  })
})
