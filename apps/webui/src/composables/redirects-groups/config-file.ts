'use client';

import { useCallback, useState, useTransition } from "react";

import { fetchRedirectsConfig, saveRedirectsConfig } from "./api";

export function useRedirectsConfigFile(options: {
  fallbackLoadErrorText: string;
  fallbackSaveErrorText: string;
  saveOkText: string;
  commitMessage: string;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sha, setSha] = useState<string>("");

  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [lastCommitUrl, setLastCommitUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async (nextSourceUrl?: string | null) => {
    setIsLoading(true);
    setLoadError(null);
    setResultMessage(null);
    setLastCommitUrl(null);

    const normalizedSourceUrl = typeof nextSourceUrl === "string" ? nextSourceUrl.trim() : null;
    if (typeof nextSourceUrl !== "undefined") {
      setSourceUrl(normalizedSourceUrl || null);
    }

    try {
      const data = await fetchRedirectsConfig({
        fallbackLoadErrorText: options.fallbackLoadErrorText,
        sourceUrl: typeof nextSourceUrl === "undefined" ? sourceUrl : (normalizedSourceUrl || null),
      });

      setSha(data.config.sha);
      return data.config.content;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : options.fallbackLoadErrorText;
      setLoadError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [options.fallbackLoadErrorText, sourceUrl]);

  const save = useCallback(
    (content: string) => {
      startTransition(async () => {
        setResultMessage(null);
        setLastCommitUrl(null);

        try {
          const result = await saveRedirectsConfig(
            {
              content,
              sha,
              message: options.commitMessage,
              ...(sourceUrl ? { sourceUrl } : {}),
            },
            {
              fallbackSaveErrorText: options.fallbackSaveErrorText,
            }
          );

          setSha(result.sha);
          setLastCommitUrl(result.commitUrl);
          setResultMessage(options.saveOkText);
        } catch (error) {
          setResultMessage(
            error instanceof Error
              ? error.message
              : options.fallbackSaveErrorText
          );
        }
      });
    },
    [options.commitMessage, options.fallbackSaveErrorText, options.saveOkText, sha, sourceUrl]
  );

  return {
    isLoading,
    loadError,
    isPending,
    sourceUrl,
    load,
    save,
    resultMessage,
    lastCommitUrl,
  };
}
