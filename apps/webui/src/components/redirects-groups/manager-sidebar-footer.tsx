'use client';

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

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
        <div className="text-xs font-medium text-slate-600">{tGroups("configUrl")}</div>
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
            className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="button"
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
            className={
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white " +
              (!onLoadConfigUrl || !canLoadConfigUrl || isPending
                ? "cursor-not-allowed text-slate-300"
                : "text-slate-700 hover:bg-slate-50")
            }
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3v10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 10l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {configUrlHint ? (
          <div className="text-xs text-rose-600">{configUrlHint}</div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo || isPending}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          title={tGroups("undo")}
          aria-label={tGroups("undo")}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
            <path d="M9 14l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 20a8 8 0 0 0-8-8H5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tGroups("undo")}
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo || isPending}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          title={tGroups("redo")}
          aria-label={tGroups("redo")}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
            <path d="M15 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 20a8 8 0 0 1 8-8h7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tGroups("redo")}
        </button>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={isPending}
        className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending ? tGroups("saving") : tGroups("save")}
      </button>
      
      {resultMessage ? (
        <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">
          {resultMessage}
          {lastCommitUrl ? (
            <a
              href={lastCommitUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-2 inline-flex align-middle text-slate-600 hover:text-slate-500"
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
