import { webUiPluginInstallations } from "@i0c/webui-config";

import type {
  AppDataDocumentKind,
  AppDataDocumentPayload,
  AppDataReadOptions,
  AppDataWriteInput,
  AppDataWriteResult
} from "@/lib/data/repository";

export type GitHubDataDocumentKind = AppDataDocumentKind;
export type GitHubDataDocumentPayload = AppDataDocumentPayload;
export type RedirectConfigPayload = AppDataDocumentPayload;
export type UpdateDataDocumentInput = Omit<AppDataWriteInput, "accessToken">;
export type UpdateDataDocumentResult = AppDataWriteResult;

export const APP_DATA_CONFIG_CACHE_TAG = "i0c:data-config";

export const githubDataRepository = webUiPluginInstallations.dataRepository.create();

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
  return githubDataRepository.read("config", {
    accessToken,
    cacheTags: [APP_DATA_CONFIG_CACHE_TAG]
  });
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

export type GitHubRepositoryReadOptions = AppDataReadOptions;
export type GitHubRepositoryWriteInput = AppDataWriteInput;
