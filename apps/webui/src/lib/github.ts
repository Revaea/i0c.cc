import { Buffer } from "node:buffer";

import { bootstrapConfig } from "@i0c/config";
import type { VersionedDataRepository } from "@i0c/plugin-contracts";

const dataTarget = bootstrapConfig.data.github;

const apiBase = "https://api.github.com";
const publicConfigRevalidateSeconds = 60;

type RepoTarget = {
  owner: string;
  repo: string;
  branch: string;
  path: string;
};

export type GitHubDataDocumentKind = "config" | "redirects";

export interface GitHubDataDocumentPayload {
  content: string;
  sha: string;
  path: string;
  htmlUrl?: string;
  lastModified?: string;
}

export type RedirectConfigPayload = GitHubDataDocumentPayload;

function requireAccessToken(token: string | undefined): string {
  if (!token) {
    throw new Error("Missing GitHub access token in session.");
  }
  return token;
}

function buildHeaders(accessToken?: string): HeadersInit {
  return {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json"
  } satisfies Record<string, string>;
}

function encodeGitHubPath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function parseGitHubSourceUrl(sourceUrl: string): RepoTarget {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new Error("Invalid config URL.");
  }

  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  const ensureJsonPath = (path: string) => {
    if (!/\.json$/i.test(path)) {
      throw new Error("Config URL must point to a .json file.");
    }
    return path;
  };

  if (host === "github.com" || host === "www.github.com") {
    // https://github.com/{owner}/{repo}/blob/{branch}/{path...}
    // https://github.com/{owner}/{repo}/raw/{branch}/{path...}
    const [repoOwner, repoName, mode, repoBranch, ...rest] = parts;
    if (!repoOwner || !repoName || !mode || !repoBranch || rest.length === 0) {
      throw new Error("Unsupported GitHub config URL.");
    }
    if (mode !== "blob" && mode !== "raw") {
      throw new Error("Unsupported GitHub config URL.");
    }
    return {
      owner: repoOwner,
      repo: repoName,
      branch: repoBranch,
      path: ensureJsonPath(rest.join("/"))
    };
  }

  if (host === "raw.githubusercontent.com") {
    // https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path...}
    const [repoOwner, repoName, repoBranch, ...rest] = parts;
    if (!repoOwner || !repoName || !repoBranch || rest.length === 0) {
      throw new Error("Unsupported GitHub config URL.");
    }
    return {
      owner: repoOwner,
      repo: repoName,
      branch: repoBranch,
      path: ensureJsonPath(rest.join("/"))
    };
  }

  if (host === "api.github.com") {
    // https://api.github.com/repos/{owner}/{repo}/contents/{path...}?ref={branch}
    const [reposKeyword, repoOwner, repoName, contentsKeyword, ...rest] = parts;
    if (reposKeyword !== "repos" || contentsKeyword !== "contents" || !repoOwner || !repoName || rest.length === 0) {
      throw new Error("Unsupported GitHub config URL.");
    }
    const ref = url.searchParams.get("ref") || dataTarget.branch;
    return {
      owner: repoOwner,
      repo: repoName,
      branch: ref,
      path: ensureJsonPath(rest.join("/"))
    };
  }

  throw new Error("Only GitHub config URLs are supported.");
}

function resolveTarget(
  kind: GitHubDataDocumentKind,
  sourceUrl?: string | null,
): RepoTarget {
  if (sourceUrl) {
    return parseGitHubSourceUrl(sourceUrl);
  }

  if (!dataTarget.owner || !dataTarget.repository) {
    throw new Error("The configured GitHub data repository is missing an owner or name.");
  }

  const path = kind === "config"
    ? dataTarget.configPath
    : dataTarget.redirectsPath;
  if (!/\.json$/i.test(path)) {
    throw new Error("The configured GitHub data path must point to a .json file.");
  }

  return {
    owner: dataTarget.owner,
    repo: dataTarget.repository,
    branch: dataTarget.branch,
    path,
  };
}

function buildContentsUrl(target: RepoTarget): string {
  return `${apiBase}/repos/${target.owner}/${target.repo}/contents/${encodeGitHubPath(target.path)}`;
}

function normalizeGitHubErrorBody(status: number, rawBody: string): string {
  const trimmed = rawBody.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const json = JSON.parse(trimmed) as { message?: string; documentation_url?: string; status?: string | number };
    const message = typeof json?.message === "string" ? json.message : trimmed;
    if (status === 404) {
      return `${message} (repo/branch/path not found, or the current account lacks write permission)`;
    }
    return message;
  } catch {
    if (status === 404) {
      return `${trimmed} (repo/branch/path not found, or the current account lacks write permission)`;
    }
    return trimmed;
  }
}

export async function getGitHubDataDocument(
  kind: GitHubDataDocumentKind,
  accessToken: string | undefined,
  options?: { sourceUrl?: string | null }
): Promise<GitHubDataDocumentPayload> {
  const target = resolveTarget(kind, options?.sourceUrl);
  const url = buildContentsUrl(target);
  const response = await fetch(`${url}?ref=${encodeURIComponent(target.branch)}`, {
    headers: buildHeaders(accessToken),
    ...(accessToken
      ? { cache: "no-store" as const }
      : { next: { revalidate: publicConfigRevalidateSeconds } })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const normalized = normalizeGitHubErrorBody(response.status, errorBody);
    throw new Error(
      `Failed to load config from GitHub: ${response.status} ${response.statusText}${normalized ? ` - ${normalized}` : ""}`
    );
  }

  const json = (await response.json()) as {
    content: string;
    sha: string;
    path: string;
    html_url?: string;
  };

  const rawContent = Buffer.from(json.content, "base64").toString("utf-8");

  return {
    content: rawContent,
    sha: json.sha,
    path: json.path,
    htmlUrl: json.html_url,
    lastModified: response.headers.get("last-modified") ?? undefined
  };
}

export function getRedirectConfig(
  accessToken: string | undefined,
  options?: { sourceUrl?: string | null },
): Promise<RedirectConfigPayload> {
  return githubDataRepository.read("redirects", {
    accessToken,
    sourceUrl: options?.sourceUrl,
  });
}

export function getAppDataConfig(
  accessToken?: string,
): Promise<GitHubDataDocumentPayload> {
  return githubDataRepository.read("config", { accessToken });
}

export interface UpdateDataDocumentInput {
  content: string;
  sha: string;
  message?: string;
  sourceUrl?: string | null;
}

export interface UpdateDataDocumentResult {
  sha: string;
  commitUrl: string;
}

interface GitHubDataReadOptions {
  accessToken?: string;
  sourceUrl?: string | null;
}

interface GitHubDataWriteInput extends UpdateDataDocumentInput {
  accessToken: string;
}

export async function updateGitHubDataDocument(
  kind: GitHubDataDocumentKind,
  accessToken: string,
  input: UpdateDataDocumentInput,
): Promise<UpdateDataDocumentResult> {
  const target = resolveTarget(kind, input.sourceUrl);
  const url = buildContentsUrl(target);
  const token = requireAccessToken(accessToken);
  const { content, sha, message } = input;
  const response = await fetch(url, {
    method: "PUT",
    headers: buildHeaders(token),
    body: JSON.stringify({
      message: message ?? (kind === "config"
        ? "chore(config): update instance settings"
        : "chore(redirects): update config"),
      content: Buffer.from(content, "utf-8").toString("base64"),
      sha,
      branch: target.branch
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const normalized = normalizeGitHubErrorBody(response.status, errorBody);
    throw new Error(
      `Failed to update config: ${response.status} ${response.statusText}${normalized ? ` - ${normalized}` : ""}`
    );
  }

  const json = (await response.json()) as {
    content: { sha: string; html_url?: string };
    commit: { html_url: string };
  };

  return {
    sha: json.content.sha,
    commitUrl: json.commit.html_url
  };
}

export const githubDataRepository = {
  read(kind: GitHubDataDocumentKind, options: GitHubDataReadOptions) {
    return getGitHubDataDocument(kind, options.accessToken, {
      sourceUrl: options.sourceUrl,
    });
  },
  write(kind: GitHubDataDocumentKind, input: GitHubDataWriteInput) {
    const { accessToken, ...document } = input;
    return updateGitHubDataDocument(kind, accessToken, document);
  },
} satisfies VersionedDataRepository<
  GitHubDataDocumentKind,
  GitHubDataReadOptions,
  GitHubDataWriteInput,
  GitHubDataDocumentPayload,
  UpdateDataDocumentResult
>;

export function updateRedirectConfig(
  accessToken: string,
  input: UpdateDataDocumentInput,
): Promise<UpdateDataDocumentResult> {
  return githubDataRepository.write("redirects", { ...input, accessToken });
}

export function updateAppDataConfig(
  accessToken: string,
  input: UpdateDataDocumentInput,
): Promise<UpdateDataDocumentResult> {
  return githubDataRepository.write("config", { ...input, accessToken });
}
