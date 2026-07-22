import { bootstrapConfig } from "@i0c/config";
import {
  createGitHubContentsRepository,
  type GitHubDataDocumentKind,
  type GitHubDataDocumentPayload,
  type GitHubDataReadOptions,
  type GitHubDataWriteInput,
  type GitHubFetch,
  type RedirectConfigPayload,
  type UpdateDataDocumentInput,
  type UpdateDataDocumentResult
} from "@i0c/plugin-github-data/webui";

export type {
  GitHubDataDocumentKind,
  GitHubDataDocumentPayload,
  RedirectConfigPayload,
  UpdateDataDocumentInput,
  UpdateDataDocumentResult
} from "@i0c/plugin-github-data/webui";

const dataTarget = bootstrapConfig.data.github;
const webuiFetch: GitHubFetch = (input, init) => fetch(input, init);

export const githubDataRepository = createGitHubContentsRepository(
  {
    ...dataTarget,
    publicRevalidateSeconds: 60
  },
  {
    fetchImpl: webuiFetch
  }
);

export function getGitHubDataDocument(
  kind: GitHubDataDocumentKind,
  accessToken: string | undefined,
  options?: { sourceUrl?: string | null }
): Promise<GitHubDataDocumentPayload> {
  return githubDataRepository.read(kind, {
    accessToken,
    sourceUrl: options?.sourceUrl
  });
}

export function getRedirectConfig(
  accessToken: string | undefined,
  options?: { sourceUrl?: string | null }
): Promise<RedirectConfigPayload> {
  return githubDataRepository.read("redirects", {
    accessToken,
    sourceUrl: options?.sourceUrl
  });
}

export function getAppDataConfig(
  accessToken?: string
): Promise<GitHubDataDocumentPayload> {
  return githubDataRepository.read("config", { accessToken });
}

export function updateGitHubDataDocument(
  kind: GitHubDataDocumentKind,
  accessToken: string,
  input: UpdateDataDocumentInput
): Promise<UpdateDataDocumentResult> {
  return githubDataRepository.write(kind, { ...input, accessToken });
}

export function updateRedirectConfig(
  accessToken: string,
  input: UpdateDataDocumentInput
): Promise<UpdateDataDocumentResult> {
  return githubDataRepository.write("redirects", { ...input, accessToken });
}

export function updateAppDataConfig(
  accessToken: string,
  input: UpdateDataDocumentInput
): Promise<UpdateDataDocumentResult> {
  return githubDataRepository.write("config", { ...input, accessToken });
}

export type GitHubRepositoryReadOptions = GitHubDataReadOptions;
export type GitHubRepositoryWriteInput = GitHubDataWriteInput;
