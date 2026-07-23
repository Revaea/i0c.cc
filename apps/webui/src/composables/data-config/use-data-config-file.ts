"use client";

import { useCallback, useState, useTransition } from "react";

import { fetchDataConfig, saveDataConfig } from "./api";

interface UseDataConfigFileOptions {
  fallbackLoadErrorText: string;
  fallbackSaveErrorText: string;
  saveOkText: string;
}

export function useDataConfigFile(options: UseDataConfigFileOptions) {
  const [sha, setSha] = useState("");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [lastCommitUrl, setLastCommitUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setResultMessage(null);
    setLastCommitUrl(null);
    const data = await fetchDataConfig(options.fallbackLoadErrorText);
    setSha(data.document.sha);
    return data.document.content;
  }, [options.fallbackLoadErrorText]);

  const save = useCallback((content: string) => {
    startTransition(async () => {
      setResultMessage(null);
      setLastCommitUrl(null);
      try {
        const result = await saveDataConfig({
          content,
          message: "chore(config): update instance settings",
          sha,
        }, options.fallbackSaveErrorText);
        setSha(result.sha);
        setLastCommitUrl(result.commitUrl);
        setResultMessage(options.saveOkText);
      } catch (error) {
        setResultMessage(
          error instanceof Error ? error.message : options.fallbackSaveErrorText,
        );
      }
    });
  }, [options.fallbackSaveErrorText, options.saveOkText, sha]);

  return {
    isPending,
    lastCommitUrl,
    load,
    resultMessage,
    save,
  };
}
