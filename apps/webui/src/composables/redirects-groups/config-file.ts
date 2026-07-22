'use client';

import { useCallback, useRef, useState, useTransition } from "react";

import { fetchRedirectsConfig, saveRedirectsConfig } from "./api";

export function useRedirectsConfigFile(options: {
  fallbackLoadErrorText: string;
  fallbackSaveErrorText: string;
  saveOkText: string;
  commitMessage: string;
}) {
  const [sha, setSha] = useState<string>("");
  const [canonicalOrigin, setCanonicalOrigin] = useState<string>("");

  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const sourceUrlRef = useRef<string | null>(null);

  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [lastCommitUrl, setLastCommitUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async (nextSourceUrl?: string | null) => {
    setResultMessage(null);
    setLastCommitUrl(null);

    const normalizedSourceUrl = typeof nextSourceUrl === "string" ? nextSourceUrl.trim() : null;
    const requestedSourceUrl = typeof nextSourceUrl === "undefined"
      ? sourceUrlRef.current
      : (normalizedSourceUrl || null);

    const data = await fetchRedirectsConfig({
      fallbackLoadErrorText: options.fallbackLoadErrorText,
      sourceUrl: requestedSourceUrl,
    });

    if (typeof nextSourceUrl !== "undefined") {
      sourceUrlRef.current = requestedSourceUrl;
      setSourceUrl(requestedSourceUrl);
    }

    setSha(data.config.sha);
    setCanonicalOrigin(data.runtime.canonicalOrigin);
    return data.config.content;
  }, [options.fallbackLoadErrorText]);

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
    isPending,
    canonicalOrigin,
    sourceUrl,
    load,
    save,
    resultMessage,
    lastCommitUrl,
  };
}
