'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import Ajv, { type AnySchema, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

export type EditorMode = "rules" | "json";

export type RightPanelProps = {
  editorMode: EditorMode;
  onEnterRulesMode: () => void;
  onEnterJsonMode: () => void;
  jsonDraft: string;
  onJsonDraftChange: (value: string) => void;
  jsonError: string | null;
  rulesContent: ReactNode;
};

export function RightPanel({
  editorMode,
  onEnterRulesMode,
  onEnterJsonMode,
  jsonDraft,
  onJsonDraftChange,
  jsonError,
  rulesContent,
}: RightPanelProps) {
  const t = useTranslations("editor");

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeLine, setActiveLine] = useState(1);

  const [schemaLoadError, setSchemaLoadError] = useState<string | null>(null);
  const [schemaValidationError, setSchemaValidationError] = useState<string | null>(null);
  const schemaValidatorRef = useRef<((data: unknown) => boolean) | null>(null);
  const schemaValidatorErrorsRef = useRef<unknown>(null);
  const schemaLoadingRef = useRef(false);

  const lineHeightPx = 20;
  const paddingTopPx = 12;

  const schemaUrl = "https://raw.githubusercontent.com/Revaea/i0c.cc/main/redirects.schema.json";

  const lineCount = useMemo(() => Math.max(1, jsonDraft.split("\n").length), [jsonDraft]);

  const lineNumbers = useMemo(() => {
    return Array.from({ length: lineCount }, (_, index) => index + 1);
  }, [lineCount]);

  const jsonFormatError = useMemo(() => {
    if (editorMode !== "json") {
      return null;
    }
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
  }, [editorMode, jsonDraft, t]);

  useEffect(() => {
    if (editorMode !== "json") {
      return;
    }

    if (schemaValidatorRef.current || schemaLoadingRef.current) {
      return;
    }

    schemaLoadingRef.current = true;
    setSchemaLoadError(null);

    void (async () => {
      try {
        const response = await fetch(schemaUrl, { cache: "force-cache" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const schema = (await response.json()) as AnySchema;
        const ajv = new Ajv({ allErrors: true, strict: false });
        addFormats(ajv);
        const validate: ValidateFunction = ajv.compile(schema);
        schemaValidatorRef.current = (data: unknown) => {
          const ok = validate(data);
          schemaValidatorErrorsRef.current = validate.errors;
          return ok as boolean;
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : t("unknownError");
        setSchemaLoadError(t("schemaLoadFail", { message }));
      } finally {
        schemaLoadingRef.current = false;
      }
    })();
  }, [editorMode, schemaUrl, t]);

  useEffect(() => {
    if (editorMode !== "json") {
      setSchemaValidationError(null);
      return;
    }

    if (jsonFormatError) {
      setSchemaValidationError(null);
      return;
    }

    const validate = schemaValidatorRef.current;
    if (!validate) {
      return;
    }

    if (jsonDraft.trim() === "") {
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

    const ok = validate(data);
    if (ok) {
      setSchemaValidationError(null);
      return;
    }

    const errors = schemaValidatorErrorsRef.current as
      | Array<{ instancePath?: string; message?: string }>
      | null
      | undefined;

    if (!errors || errors.length === 0) {
      setSchemaValidationError(t("schemaValidateFailUnknown"));
      return;
    }

    const shown = errors.slice(0, 5).map((item) => {
      const path = (item.instancePath || "(root)").trim() || "(root)";
      return `${path}: ${item.message ?? "invalid"}`;
    });
    const more = errors.length > 5 ? t("schemaValidateMore", { count: errors.length - 5 }) : "";
    setSchemaValidationError(t("schemaValidateFail", { lines: shown.join("\n"), more }));
  }, [editorMode, jsonDraft, jsonFormatError, t]);

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
    if (editorMode !== "json") {
      return;
    }

    autosizeTextarea();
    const frame = requestAnimationFrame(() => {
      autosizeTextarea();
      updateActiveLineFromSelection();
    });
    return () => cancelAnimationFrame(frame);
  }, [editorMode, jsonDraft, updateActiveLineFromSelection]);

  const highlightTop = paddingTopPx + (activeLine - 1) * lineHeightPx;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={onEnterRulesMode}
            className={
              "rounded-lg px-3 py-1.5 text-xs font-medium transition " +
              (editorMode === "rules" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50")
            }
          >
            {t("rules")}
          </button>
          <button
            type="button"
            onClick={onEnterJsonMode}
            className={
              "rounded-lg px-3 py-1.5 text-xs font-medium transition " +
              (editorMode === "json" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50")
            }
          >
            {t("json")}
          </button>
        </div>
        <p className="text-xs text-slate-500">{editorMode === "json" ? t("jsonPreferred") : t("editAndSave")}</p>
      </div>

      {editorMode === "json" ? (
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
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 whitespace-pre-wrap break-words">
              {schemaValidationError}
            </div>
          ) : null}

          <div
            className={
              "flex w-full rounded-2xl border bg-white focus-within:border-slate-300 overflow-hidden " +
              (jsonFormatError ? "border-amber-200" : jsonError ? "border-rose-200" : "border-slate-200")
            }
          >
            <div className="select-none border-r border-slate-200 bg-white px-3 py-3 text-right font-mono text-xs leading-5 text-slate-400">
              {lineNumbers.map((line) => (
                <div
                  key={line}
                  className={
                    "h-5 " +
                    (line === activeLine ? "bg-slate-100 text-slate-600" : "text-slate-400")
                  }
                >
                  {line}
                </div>
              ))}
            </div>

            <div className="relative min-w-0 flex-1 bg-white">
              <div
                aria-hidden
                className="pointer-events-none absolute left-0 right-0 bg-slate-50"
                style={{ top: highlightTop, height: lineHeightPx }}
              />
              <textarea
                ref={textareaRef}
                value={jsonDraft}
                onChange={(e) => {
                  onJsonDraftChange(e.target.value);
                  autosizeTextarea();
                  updateActiveLineFromSelection();
                }}
                onSelect={updateActiveLineFromSelection}
                onKeyUp={updateActiveLineFromSelection}
                onMouseUp={updateActiveLineFromSelection}
                onFocus={updateActiveLineFromSelection}
                spellCheck={false}
                className="relative z-10 min-h-[60vh] min-w-0 w-full whitespace-pre bg-transparent px-3 py-3 font-mono text-xs leading-5 text-slate-900 outline-none resize-none overflow-x-auto overflow-y-hidden"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">{t("tipParse")}</p>
        </div>
      ) : (
        rulesContent
      )}
    </div>
  );
}
