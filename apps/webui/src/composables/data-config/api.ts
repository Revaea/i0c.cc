"use client";

import type { GitHubDataDocumentPayload } from "@/lib/github";

interface DataConfigResponse {
  document: GitHubDataDocumentPayload;
}

interface ErrorResponse {
  error?: unknown;
}

export async function fetchDataConfig(fallbackErrorText: string): Promise<DataConfigResponse> {
  const response = await fetch("/api/data/config", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await readError(response, fallbackErrorText));
  }
  return (await response.json()) as DataConfigResponse;
}

export async function saveDataConfig(input: {
  content: string;
  message: string;
  sha: string;
}, fallbackErrorText: string): Promise<{ sha: string; commitUrl: string }> {
  const response = await fetch("/api/data/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readError(response, fallbackErrorText));
  }
  return (await response.json()) as { sha: string; commitUrl: string };
}

async function readError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as ErrorResponse | null;
  if (typeof data?.error === "string") {
    return data.error;
  }
  if (data?.error) {
    return JSON.stringify(data.error);
  }
  return fallback;
}
