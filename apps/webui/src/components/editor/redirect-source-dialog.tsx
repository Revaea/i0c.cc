"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/controls/button";
import {
  fieldLabelClassName,
  fieldLabelRowClassName,
  formControlClassName,
} from "@/components/ui/controls/form-control";

interface RedirectSourceDialogProps {
  disabled: boolean;
  onLoad: (url: string) => Promise<void>;
  sourceUrl?: string | null;
}

export function RedirectSourceDialog({
  disabled,
  onLoad,
  sourceUrl,
}: RedirectSourceDialogProps) {
  const t = useTranslations("groups");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [sourceUrlDraft, setSourceUrlDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const normalizedSourceUrl = sourceUrlDraft.trim();
  const isHttpsUrl = /^https:\/\//i.test(normalizedSourceUrl);
  const isJsonUrl = /\.json(\?|#|$)/i.test(normalizedSourceUrl);
  const canLoadSourceUrl = isHttpsUrl && isJsonUrl;
  const sourceUrlHint = useMemo(() => {
    if (!normalizedSourceUrl) {
      return null;
    }
    if (!isHttpsUrl) {
      return t("configUrlInvalid");
    }
    if (!isJsonUrl) {
      return t("configUrlTypeHint");
    }
    return null;
  }, [isHttpsUrl, isJsonUrl, normalizedSourceUrl, t]);

  function openDialog() {
    setSourceUrlDraft(sourceUrl ?? "");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (!isLoading) {
      dialogRef.current?.close();
    }
  }

  async function loadSource() {
    if (!canLoadSourceUrl || isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      await onLoad(normalizedSourceUrl);
      dialogRef.current?.close();
    } catch {
      return;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        onClick={openDialog}
        disabled={disabled}
        size="sm"
        variant="secondary"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.14-1.14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t("sourceButton")}
      </Button>

      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          if (isLoading) {
            event.preventDefault();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDialog();
          }
        }}
        className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border border-line bg-panel p-0 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-[2px]"
      >
        <form
          method="dialog"
          onSubmit={(event) => {
            event.preventDefault();
            void loadSource();
          }}
          className="p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {t("sourceDialogTitle")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                {t("sourceDialogDescription")}
              </p>
            </div>
            <Button
              onClick={closeDialog}
              disabled={isLoading}
              size="icon"
              variant="ghost"
              title={t("sourceDialogCancel")}
              aria-label={t("sourceDialogCancel")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  d="M6 6l12 12M18 6 6 18"
                  strokeLinecap="round"
                />
              </svg>
            </Button>
          </div>

          <div className="mt-5">
            <label className={fieldLabelRowClassName}>
              <span className={fieldLabelClassName}>{t("configUrl")}</span>
            </label>
            <input
              value={sourceUrlDraft}
              onChange={(event) => setSourceUrlDraft(event.target.value)}
              placeholder={t("configUrlPlaceholder")}
              className={formControlClassName({ className: "w-full" })}
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
            />
            {sourceUrlHint ? (
              <p className="mt-1.5 text-xs text-rose-600">{sourceUrlHint}</p>
            ) : (
              <p className="mt-1.5 text-xs leading-5 text-muted">
                {t("sourceDialogHint")}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              onClick={closeDialog}
              disabled={isLoading}
              variant="secondary"
            >
              {t("sourceDialogCancel")}
            </Button>
            <Button
              type="submit"
              disabled={!canLoadSourceUrl || isLoading}
              variant="primary"
            >
              {isLoading ? t("sourceDialogLoading") : t("loadConfig")}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
