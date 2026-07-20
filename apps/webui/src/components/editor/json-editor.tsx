"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Ajv, { type AnySchema, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import redirectsSchema from "i0c-redirect-worker/redirects.schema.json";

interface SchemaValidatorResult {
  error: string | null;
  validate: ValidateFunction | null;
}

interface JsonEditorProps {
  jsonDraft: string;
  onJsonDraftChange: (value: string) => void;
  jsonError: string | null;
  isReadOnly: boolean;
}

function createSchemaValidator(): SchemaValidatorResult {
  try {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    return {
      error: null,
      validate: ajv.compile(redirectsSchema as AnySchema),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown schema error",
      validate: null,
    };
  }
}

const schemaValidator = createSchemaValidator();
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

  const schemaLoadError = schemaValidator.error
    ? t("schemaLoadFail", { message: schemaValidator.error })
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

      const validate = schemaValidator.validate;
      if (!validate) {
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

      const isValid = validate(data) as boolean;
      if (isValid) {
        setSchemaValidationError(null);
        return;
      }

      const errors = validate.errors as
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
          "flex w-full overflow-hidden rounded-xl border bg-panel focus-within:border-accent focus-within:ring-3 focus-within:ring-blue-100 "
          + (jsonFormatError ? "border-amber-200" : jsonError ? "border-rose-200" : "border-line")
        }
      >
        <div
          className="select-none border-r border-line bg-panel-muted px-3 py-3 text-right font-mono text-xs leading-5 text-slate-400"
        >
          {lineNumbers.map((line) => (
            <div
              key={line}
              className={
                "h-5 "
                + (line === activeLine ? "bg-accent-soft text-accent" : "text-slate-400")
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
