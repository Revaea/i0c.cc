"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { validateRedirectConfig } from "@/lib/redirects/config-validation";

interface JsonEditorProps {
  jsonDraft: string;
  onJsonDraftChange: (value: string) => void;
  jsonError: string | null;
  isReadOnly: boolean;
}

const schemaAvailability = validateRedirectConfig(null);
const lineHeightPx = 20;
const paddingTopPx = 12;

export function JsonEditor({
  jsonDraft,
  onJsonDraftChange,
  jsonError,
  isReadOnly,
}: JsonEditorProps) {
  const t = useTranslations("editor");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeLine, setActiveLine] = useState(1);
  const [schemaValidationError, setSchemaValidationError] = useState<string | null>(null);

  const schemaLoadError = schemaAvailability.status === "unavailable"
    ? t("schemaLoadFail", { message: schemaAvailability.error })
    : null;
  const lineCount = useMemo(() => Math.max(1, jsonDraft.split("\n").length), [jsonDraft]);
  const lineNumbers = useMemo(() => {
    return Array.from({ length: lineCount }, (_, index) => index + 1);
  }, [lineCount]);
  const jsonFormatError = useMemo(() => {
    if (jsonDraft.trim() === "") {
      return null;
    }

    try {
      JSON.parse(jsonDraft);
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("unknownError");
      return t("jsonFormatError", { message });
    }
  }, [jsonDraft, t]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      if (jsonFormatError || jsonDraft.trim() === "") {
        setSchemaValidationError(null);
        return;
      }

      let data: unknown;
      try {
        data = JSON.parse(jsonDraft);
      } catch {
        setSchemaValidationError(null);
        return;
      }

      const validation = validateRedirectConfig(data);
      if (validation.status !== "invalid") {
        setSchemaValidationError(null);
        return;
      }

      if (validation.issues.length === 0) {
        setSchemaValidationError(t("schemaValidateFailUnknown"));
        return;
      }

      const shown = validation.issues.slice(0, 5).map((issue) => (
        `${issue.path}: ${issue.message}`
      ));
      const more = validation.issues.length > 5
        ? t("schemaValidateMore", { count: validation.issues.length - 5 })
        : "";
      setSchemaValidationError(t("schemaValidateFail", { lines: shown.join("\n"), more }));
    });

    return () => {
      cancelled = true;
    };
  }, [jsonDraft, jsonFormatError, t]);

  const updateActiveLineFromSelection = useCallback(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    const selectionStart = element.selectionStart ?? 0;
    let line = 1;
    for (let index = 0; index < selectionStart && index < jsonDraft.length; index += 1) {
      if (jsonDraft.charCodeAt(index) === 10) {
        line += 1;
      }
    }
    const clamped = Math.min(Math.max(1, line), lineCount);
    setActiveLine(clamped);
  }, [jsonDraft, lineCount]);

  const autosizeTextarea = () => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    element.style.height = "0px";
    const nextHeight = element.scrollHeight;
    element.style.height = `${nextHeight + 2}px`;
  };

  useLayoutEffect(() => {
    autosizeTextarea();
    const frame = requestAnimationFrame(() => {
      autosizeTextarea();
      updateActiveLineFromSelection();
    });
    return () => cancelAnimationFrame(frame);
  }, [jsonDraft, updateActiveLineFromSelection]);

  const highlightTop = paddingTopPx + (activeLine - 1) * lineHeightPx;

  return (
    <div className="space-y-3">
      {jsonError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {jsonError}
        </div>
      ) : null}

      {jsonFormatError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {jsonFormatError}
        </div>
      ) : null}

      {schemaLoadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {schemaLoadError}
        </div>
      ) : null}

      {schemaValidationError ? (
        <div className="whitespace-pre-wrap break-words rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {schemaValidationError}
        </div>
      ) : null}

      <div
        className={
          "flex w-full overflow-hidden rounded-xl border bg-panel focus-within:border-accent focus-within:ring-3 focus-within:ring-accent-soft "
          + (jsonFormatError ? "border-amber-200" : jsonError ? "border-rose-200" : "border-line")
        }
      >
        <div
          className="select-none border-r border-line bg-panel-muted px-3 py-3 text-right font-mono text-xs leading-5 text-muted"
        >
          {lineNumbers.map((line) => (
            <div
              key={line}
              className={
                "h-5 "
                + (line === activeLine ? "bg-accent-soft text-accent" : "text-muted")
              }
            >
              {line}
            </div>
          ))}
        </div>

        <div className="relative min-w-0 flex-1 bg-panel">
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 bg-panel-muted"
            style={{ top: highlightTop, height: lineHeightPx }}
          />
          <textarea
            ref={textareaRef}
            value={jsonDraft}
            readOnly={isReadOnly}
            onChange={(event) => {
              onJsonDraftChange(event.target.value);
              autosizeTextarea();
              updateActiveLineFromSelection();
            }}
            onSelect={updateActiveLineFromSelection}
            onKeyUp={updateActiveLineFromSelection}
            onMouseUp={updateActiveLineFromSelection}
            onFocus={updateActiveLineFromSelection}
            spellCheck={false}
            className="relative z-10 min-h-[60vh] w-full min-w-0 resize-none overflow-x-auto overflow-y-hidden whitespace-pre bg-transparent px-3 py-3 font-mono text-xs leading-5 text-ink outline-none"
          />
        </div>
      </div>
      <p className="text-xs text-muted">{t("tipParse")}</p>
    </div>
  );
}
