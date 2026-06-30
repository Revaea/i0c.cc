import { Buffer } from "node:buffer";

const owner = process.env.GITHUB_REPO_OWNER ?? "";
const repo = process.env.GITHUB_REPO_NAME ?? "";
const branch = process.env.GITHUB_TARGET_BRANCH ?? "data";
const configPath = process.env.GITHUB_CONFIG_PATH ?? "redirects.json";

const apiBase = "https://api.github.com";

type RepoTarget = {
  owner: string;
  repo: string;
  branch: string;
  path: string;
};

export interface RedirectConfigPayload {
  content: string;
  sha: string;
  path: string;
  htmlUrl?: string;
  lastModified?: string;
}

export interface CommitEntry {
  sha: string;
  message: string;
  author?: {
    name?: string;
    avatarUrl?: string;
    date?: string;
  };
  url: string;
}

function requireAccessToken(token: string | undefined): string {
  if (!token) {
    throw new Error("Missing GitHub access token in session.");
  }
  return token;
}

function buildHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
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
    const ref = url.searchParams.get("ref") || branch;
    return {
      owner: repoOwner,
      repo: repoName,
      branch: ref,
      path: ensureJsonPath(rest.join("/"))
    };
  }

  throw new Error("Only GitHub config URLs are supported.");
}

function resolveTarget(sourceUrl?: string | null): RepoTarget {
  if (sourceUrl) {
    return parseGitHubSourceUrl(sourceUrl);
  }

  if (!owner || !repo) {
    throw new Error("Missing GITHUB_REPO_OWNER or GITHUB_REPO_NAME environment variables.");
  }

  if (!/\.json$/i.test(configPath)) {
    throw new Error("GITHUB_CONFIG_PATH must point to a .json file.");
  }

  return {
    owner,
    repo,
    branch,
    path: configPath
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

export async function getRedirectConfig(
  accessToken: string,
  options?: { sourceUrl?: string | null }
): Promise<RedirectConfigPayload> {
  const target = resolveTarget(options?.sourceUrl);
  const url = buildContentsUrl(target);
  const token = requireAccessToken(accessToken);
  const response = await fetch(`${url}?ref=${encodeURIComponent(target.branch)}`, {
    headers: buildHeaders(token),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load config from GitHub: ${response.status} ${response.statusText}`);
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

export interface UpdateRedirectConfigInput {
  content: string;
  sha: string;
  message?: string;
  sourceUrl?: string | null;
}

export interface UpdateRedirectConfigResult {
  sha: string;
  commitUrl: string;
}

export async function updateRedirectConfig(accessToken: string, input: UpdateRedirectConfigInput): Promise<UpdateRedirectConfigResult> {
  const target = resolveTarget(input.sourceUrl);
  const url = buildContentsUrl(target);
  const token = requireAccessToken(accessToken);
  const { content, sha, message } = input;
  const response = await fetch(url, {
    method: "PUT",
    headers: buildHeaders(token),
    body: JSON.stringify({
      message: message ?? "Update redirects via WebUI",
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

export async function listRedirectHistory(
  accessToken: string,
  perPage = 10,
  options?: { sourceUrl?: string | null }
): Promise<CommitEntry[]> {
  const target = resolveTarget(options?.sourceUrl);
  const token = requireAccessToken(accessToken);
  const url = new URL(`${apiBase}/repos/${target.owner}/${target.repo}/commits`);
  url.searchParams.set("path", target.path);
  url.searchParams.set("sha", target.branch);
  url.searchParams.set("per_page", String(perPage));

  const response = await fetch(url, {
    headers: buildHeaders(token),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load commit history: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as Array<{
    sha: string;
    html_url: string;
    commit: { message: string; author?: { name?: string; date?: string } };
    author?: { avatar_url?: string; login?: string };
  }>;

  return json.map((item) => ({
    sha: item.sha,
    url: item.html_url,
    message: item.commit.message,
    author: {
      name: item.author?.login ?? item.commit.author?.name,
      avatarUrl: item.author?.avatar_url,
      date: item.commit.author?.date
    }
  }));
}
