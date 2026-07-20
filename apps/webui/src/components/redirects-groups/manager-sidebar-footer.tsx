'use client';

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { fieldLabelClassName, formControlClassName } from "@/components/ui/form-control";

export type ManagerSidebarFooterProps = {
  canUndo: boolean;
  canRedo: boolean;
  isPending: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  configUrl?: string | null;
  onLoadConfigUrl?: (url: string) => void;
  resultMessage?: string | null;
  lastCommitUrl?: string | null;
};

export function ManagerSidebarFooter({
  canUndo,
  canRedo,
  isPending,
  onUndo,
  onRedo,
  onSave,
  configUrl,
  onLoadConfigUrl,
  resultMessage,
  lastCommitUrl,
}: ManagerSidebarFooterProps) {
  const tGroups = useTranslations("groups");

  const [configUrlDraft, setConfigUrlDraft] = useState("");
  const [configUrlDirty, setConfigUrlDirty] = useState(false);

  const configUrlValue = configUrlDirty ? configUrlDraft : (configUrl ?? "");

  const normalizedConfigUrl = useMemo(() => configUrlValue.trim(), [configUrlValue]);
  const isHttpsUrl = useMemo(
    () => /^https:\/\//i.test(normalizedConfigUrl),
    [normalizedConfigUrl]
  );

  const isJsonUrl = useMemo(
    () => (/\.json(\?|#|$)/i.test(normalizedConfigUrl)),
    [normalizedConfigUrl]
  );

  const canLoadConfigUrl = isHttpsUrl && isJsonUrl;

  const configUrlHint = useMemo(() => {
    if (!normalizedConfigUrl) {
      return null;
    }

    if (!isHttpsUrl) {
      return tGroups("configUrlInvalid");
    }

    if (!isJsonUrl) {
      return tGroups("configUrlTypeHint");
    }

    return null;
  }, [isHttpsUrl, isJsonUrl, normalizedConfigUrl, tGroups]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className={fieldLabelClassName}>{tGroups("configUrl")}</div>
        <div className="flex items-center gap-2">
          <input
            value={configUrlValue}
            onChange={(e) => {
              if (!configUrlDirty) {
                setConfigUrlDirty(true);
              }
              setConfigUrlDraft(e.target.value);
            }}
            placeholder={tGroups("configUrlPlaceholder")}
            className={formControlClassName({ className: "flex-1", size: "sm" })}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button
            onClick={() => {
              if (!onLoadConfigUrl) {
                return;
              }
              if (!canLoadConfigUrl) {
                return;
              }
              onLoadConfigUrl(normalizedConfigUrl);
            }}
            disabled={!onLoadConfigUrl || !canLoadConfigUrl || isPending}
            aria-label={tGroups("loadConfig")}
            title={tGroups("loadConfig")}
            size="icon"
            variant="secondary"
            className="shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3v10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 10l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </div>

        {configUrlHint ? (
          <div className="text-xs text-rose-600">{configUrlHint}</div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onUndo}
          disabled={!canUndo || isPending}
          className="w-full"
          size="sm"
          variant="secondary"
          title={tGroups("undo")}
          aria-label={tGroups("undo")}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
            <path d="M9 14l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 20a8 8 0 0 0-8-8H5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tGroups("undo")}
        </Button>

        <Button
          onClick={onRedo}
          disabled={!canRedo || isPending}
          className="w-full"
          size="sm"
          variant="secondary"
          title={tGroups("redo")}
          aria-label={tGroups("redo")}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
            <path d="M15 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 20a8 8 0 0 1 8-8h7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tGroups("redo")}
        </Button>
      </div>

      <Button
        onClick={onSave}
        disabled={isPending}
        className="w-full"
        variant="primary"
      >
        {isPending ? tGroups("saving") : tGroups("save")}
      </Button>
      
      {resultMessage ? (
        <p className="whitespace-pre-wrap break-words text-sm text-muted">
          {resultMessage}
          {lastCommitUrl ? (
            <a
              href={lastCommitUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-2 inline-flex align-middle text-accent hover:text-accent-strong"
              aria-label={tGroups("viewCommit")}
              title={tGroups("viewCommit")}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M14 3h7v7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 3l-9 9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
