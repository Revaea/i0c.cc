import type { VersionedDataRepository } from "@i0c/plugin-api";

export type AppDataDocumentKind = "config" | "redirects";

export interface AppDataDocumentPayload {
  content: string;
  htmlUrl?: string;
  lastModified?: string;
  path: string;
  sha: string;
}

export interface AppDataReadOptions {
  accessToken?: string;
  cacheMode?: "default" | "no-store";
  cacheTags?: readonly string[];
  sourceUrl?: string | null;
}

export interface AppDataWriteInput {
  accessToken: string;
  content: string;
  message?: string;
  sha: string;
  sourceUrl?: string | null;
}

export interface AppDataWriteResult {
  commitUrl: string;
  sha: string;
}

export type AppDataRepository = VersionedDataRepository<
  AppDataDocumentKind,
  AppDataReadOptions,
  AppDataWriteInput,
  AppDataDocumentPayload,
  AppDataWriteResult
>;
