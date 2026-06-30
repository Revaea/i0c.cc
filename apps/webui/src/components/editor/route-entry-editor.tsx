'use client';

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";

import { QRCodeButton } from "@/components/ui/qr-code";
import { LabelWithTooltip } from "@/components/ui/label-with-tooltip";

import { DropdownSelect } from "@/components/ui/dropdown-select";
import {
  asString,
  createEmptyConfig,
  getDestinationKey,
  getMode,
  isRecord,
  normalizePriority,
  normalizeStatus,
  setExclusiveDestination,
  type DestinationKey,
  type RouteMode,
} from "@/composables/editor/route-utils";

export type RouteEntryEditorProps = {
  value: unknown;
  onChange: (next: unknown) => void;
  level?: number;
  allowArray?: boolean;
  pathKey?: string;
};

export function RouteEntryEditor({ 
  value, 
  onChange, 
  level = 0, 
  allowArray = true, 
  pathKey = "" 
}: RouteEntryEditorProps) {
  const t = useTranslations("routeEntry");

  const mode = useMemo(() => getMode(value), [value]);

  const stringValue = mode === "string" ? asString(value) : "";
  const configValue = mode === "object" && isRecord(value) ? value : null;
  const arrayValue = mode === "array" && Array.isArray(value) ? value : null;

  const stringDraftRef = useRef<string>(stringValue);
  const objectDraftRef = useRef<Record<string, unknown> | null>(configValue);
  const arrayDraftRef = useRef<unknown[] | null>(arrayValue);

  useEffect(() => {
    if (mode === "string") stringDraftRef.current = stringValue;
  }, [mode, stringValue]);

  useEffect(() => {
    if (mode === "object" && configValue) objectDraftRef.current = configValue;
  }, [configValue, mode]);

  useEffect(() => {
    if (mode === "array" && arrayValue) arrayDraftRef.current = arrayValue;
  }, [arrayValue, mode]);

  const setMode = useCallback(
    (nextMode: RouteMode) => {
      if (nextMode === mode) return;
      if (nextMode === "string") {
        const cached = stringDraftRef.current;
        if (cached.trim() !== "") {
          onChange(cached);
          return;
        }
        if (configValue) {
          const destinationKey = getDestinationKey(configValue);
          onChange(asString(configValue[destinationKey]));
          return;
        }
        if (arrayValue && arrayValue.length > 0) {
          const first = arrayValue[0];
          if (isRecord(first)) {
            const destinationKey = getDestinationKey(first);
            onChange(asString(first[destinationKey]));
            return;
          }
          onChange(asString(first));
          return;
        }
        onChange("");
        return;
      }
      if (nextMode === "object") {
        const cached = objectDraftRef.current;
        if (cached) {
          onChange(cached);
          return;
        }
        if (arrayValue && arrayValue.length > 0) {
          const first = arrayValue[0];
          if (isRecord(first)) {
            onChange(first);
            return;
          }
          const seed = createEmptyConfig();
          const seededConfig =
            asString(first).trim() === "" ? seed : setExclusiveDestination(seed, "target", asString(first).trim());
          onChange(seededConfig);
          return;
        }
        const seed = createEmptyConfig();
        const seededConfig =
          stringValue.trim() === "" ? seed : setExclusiveDestination(seed, "target", stringValue.trim());
        onChange(seededConfig);
        return;
      }
      if (nextMode === "array") {
        const cached = arrayDraftRef.current;
        if (cached && cached.length > 0) {
          onChange(cached);
          return;
        }
        if (arrayValue && arrayValue.length > 0) {
          onChange(arrayValue);
          return;
        }
        if (configValue) {
          onChange([configValue]);
          return;
        }
        if (stringValue.trim() !== "") {
          onChange([stringValue]);
          return;
        }
        onChange([""]);
        return;
      }
    },
    [arrayValue, configValue, mode, onChange, stringValue]
  );

  const containerClassName = level > 0 ? "mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4" : "";

  return (
    <div className={containerClassName}>
      <div className="space-y-2">
        <span className="block text-xs font-medium text-slate-500">{t("ruleType")}</span>

        <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setMode("string")}
            className={
              "relative inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg py-1.5 px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 " +
              (mode === "string"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-50")
            }
          >
            {t("quick")}
          </button>

          <button
            type="button"
            onClick={() => setMode("object")}
            className={
              "relative inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg py-1.5 px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 " +
              (mode === "object"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-50")
            }
          >
            {t("detail")}
          </button>

          {allowArray ? (
            <button
              type="button"
              onClick={() => setMode("array")}
              className={
                "relative inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg py-1.5 px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 " +
                (mode === "array"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-50")
              }
            >
              {t("multi")}
            </button>
          ) : (
            <div aria-hidden className="h-7" />
          )}
        </div>
      </div>

      {mode === "string" ? (
        <div className="mt-3">
          <LabelWithTooltip label={t("targetLabel")} tooltip={t("targetTooltip")} />
          <div className="flex gap-2">
            <input
              value={stringValue}
              onChange={(e) => onChange(e.target.value)}
              placeholder={t("targetPlaceholder")}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
            />
            {pathKey && <QRCodeButton pathKey={pathKey} />}
          </div>
        </div>
      ) : null}

      {mode === "array" && arrayValue ? (
        <div className="mt-4 space-y-3">
          {arrayValue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">{t("noRuleItems")}</p>
            </div>
          ) : null}

          {arrayValue.map((item, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-500">{t("ruleItem", { index: index + 1 })}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(t("confirmDeleteRule"))) return;
                    const next = arrayValue.slice();
                    if (next.length <= 1) {
                      next[0] = "";
                      onChange(next);
                      return;
                    }
                    next.splice(index, 1);
                    onChange(next);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-600 hover:bg-rose-50"
                  title={t("deleteRule")}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
                    <path
                      d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M10 11v6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <div className="mt-3">
                <RouteEntryEditor
                  value={Array.isArray(item) ? "" : item}
                  allowArray={false}
                  level={level + 1}
                  pathKey={pathKey}
                  onChange={(nextItem) => {
                    const safeNext = Array.isArray(nextItem) ? "" : nextItem;
                    const next = arrayValue.slice();
                    next[index] = safeNext;
                    onChange(next);
                  }}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => onChange([...(arrayValue ?? []), ""])}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
              <path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("addRuleItem")}
          </button>
        </div>
      ) : null}

      {mode === "object" && configValue ? (
        <div className="mt-4 grid grid-cols-1 gap-3">
          {(() => {
            const routeType = ((configValue.type as string | undefined) ?? "prefix").trim();
            const showAppendPath = routeType !== "exact";
            const showStatus = routeType !== "proxy";
            const detailCols = showStatus ? 3 : 2;
            const statusValue = normalizeStatus(configValue.status);
            const priorityValue = normalizePriority(configValue.priority);
            const statusInvalid = showStatus && statusValue.trim() !== "" && !/^\d{3}$/.test(statusValue.trim());
            const priorityInvalid = priorityValue.trim() !== "" && !/^-?\d+$/.test(priorityValue.trim());

            return (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <LabelWithTooltip label={t("typeLabel")} tooltip={t("typeTooltip")} />
                    <DropdownSelect
                      value={(configValue.type as string | undefined) ?? "prefix"}
                      onChange={(next) => {
                        const nextConfig: Record<string, unknown> = { ...configValue, type: next };
                        if (next === "proxy") delete nextConfig.status;
                        if (next === "exact") delete nextConfig.appendPath;
                        onChange(nextConfig);
                      }}
                      options={[
                        { value: "prefix", label: "prefix" },
                        { value: "exact", label: "exact" },
                        { value: "proxy", label: "proxy" },
                      ]}
                    />
                  </div>

                  {showAppendPath ? (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("appendPath")}</label>
                      <div className="inline-flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-3 text-sm text-slate-900">
                        <input
                          type="checkbox"
                          checked={Boolean(configValue.appendPath)}
                          onChange={(e) => onChange({ ...configValue, appendPath: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                        />
                        <span className="text-sm text-slate-700">{t("appendPathHint")}</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className={"grid grid-cols-1 gap-2 " + (detailCols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                  <div className={detailCols === 3 ? "sm:col-span-3" : "sm:col-span-2"}>
                    <LabelWithTooltip label={t("targetLabel")} tooltip={t("targetTooltip")} />
                    <div className="flex gap-2">
                      <DropdownSelect
                        className="w-28 shrink-0"
                        value={getDestinationKey(configValue)}
                        onChange={(next) => {
                          const nextKey = next as DestinationKey;
                          const currentKey = getDestinationKey(configValue);
                          const currentValue = asString(configValue[currentKey]);
                          onChange(setExclusiveDestination(configValue, nextKey, currentValue));
                        }}
                        options={[
                          { value: "target", label: "target" },
                          { value: "to", label: "to" },
                          { value: "url", label: "url" },
                        ]}
                      />
                      <input
                        value={asString(configValue[getDestinationKey(configValue)])}
                        onChange={(e) => {
                          const nextKey = getDestinationKey(configValue);
                          onChange(setExclusiveDestination(configValue, nextKey, e.target.value));
                        }}
                        placeholder="https://example.com"
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300"
                      />
                      {pathKey && <QRCodeButton pathKey={pathKey} />}
                    </div>
                  </div>

                  {showStatus ? (
                    <div>
                      <LabelWithTooltip label={t("statusLabel")} tooltip={t("statusTooltip")} />
                      <input
                        value={statusValue}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          const next = raw === "" ? undefined : raw;
                          const nextConfig = { ...configValue };
                          if (next === undefined) {
                            delete nextConfig.status;
                            onChange(nextConfig);
                            return;
                          }
                          onChange({ ...nextConfig, status: next });
                        }}
                        placeholder="301"
                        className={
                          "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300 " +
                          (statusInvalid ? "border-rose-300" : "border-slate-200")
                        }
                      />
                      {statusInvalid ? <p className="mt-1 text-xs text-rose-600">{t("statusInvalid")}</p> : null}
                    </div>
                  ) : null}

                  <div>
                    <LabelWithTooltip label={t("priorityLabel")} tooltip={t("priorityTooltip")} />
                    <input
                      value={priorityValue}
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        const next = raw === "" ? undefined : raw;
                        const nextConfig = { ...configValue };
                        if (next === undefined) {
                          delete nextConfig.priority;
                          onChange(nextConfig);
                          return;
                        }
                        onChange({ ...nextConfig, priority: next });
                      }}
                      placeholder="0"
                      className={
                        "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300 " +
                        (priorityInvalid ? "border-rose-300" : "border-slate-200")
                      }
                    />
                    {priorityInvalid ? <p className="mt-1 text-xs text-rose-600">{t("priorityInvalid")}</p> : null}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
