'use client';

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  fieldLabelClassName,
  fieldLabelRowClassName,
  formControlClassName,
} from "@/components/ui/form-control";
import { LabelWithTooltip } from "@/components/ui/label-with-tooltip";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { QRCodeButton } from "@/components/ui/qr-code";
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

  const containerClassName = level > 0 ? "mt-3 rounded-xl border border-line bg-panel-muted p-4" : "";

  return (
    <div className={containerClassName}>
      <div className="space-y-2">
        <span className={"block " + fieldLabelClassName}>{t("ruleType")}</span>

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-panel-muted p-1">
          <Button
            onClick={() => setMode("string")}
            className="w-full whitespace-nowrap"
            size="sm"
            variant={mode === "string" ? "primary" : "ghost"}
          >
            {t("quick")}
          </Button>

          <Button
            onClick={() => setMode("object")}
            className="w-full whitespace-nowrap"
            size="sm"
            variant={mode === "object" ? "primary" : "ghost"}
          >
            {t("detail")}
          </Button>

          {allowArray ? (
            <Button
              onClick={() => setMode("array")}
              className="w-full whitespace-nowrap"
              size="sm"
              variant={mode === "array" ? "primary" : "ghost"}
            >
              {t("multi")}
            </Button>
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
              className={formControlClassName({ className: "flex-1" })}
            />
            {pathKey && <QRCodeButton pathKey={pathKey} />}
          </div>
        </div>
      ) : null}

      {mode === "array" && arrayValue ? (
        <div className="mt-4 space-y-3">
          {arrayValue.length === 0 ? (
            <Card elevation="flat" padding="sm" tone="muted" className="border-dashed">
              <p className="text-sm text-muted">{t("noRuleItems")}</p>
            </Card>
          ) : null}

          {arrayValue.map((item, index) => (
            <Card key={index} elevation="flat" padding="sm">
              <div className="flex items-center justify-between gap-3">
                <p className={fieldLabelClassName}>{t("ruleItem", { index: index + 1 })}</p>
                <Button
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
                  size="icon"
                  variant="danger"
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
                </Button>
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
            </Card>
          ))}

          <Button
            onClick={() => onChange([...(arrayValue ?? []), ""])}
            size="sm"
            variant="secondary"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
              <path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("addRuleItem")}
          </Button>
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
                      <label className={fieldLabelRowClassName + " " + fieldLabelClassName}>
                        {t("appendPath")}
                      </label>
                      <div className="inline-flex h-10 w-full items-center gap-2 rounded-xl border border-line bg-panel px-3 text-sm text-ink">
                        <input
                          type="checkbox"
                          checked={configValue.appendPath !== false}
                          onChange={(e) => onChange({ ...configValue, appendPath: e.target.checked })}
                          className="h-4 w-4 rounded border-line-strong accent-accent"
                        />
                        <span className="text-sm text-ink">{t("appendPathHint")}</span>
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
                        className={formControlClassName({ className: "flex-1" })}
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
                        className={formControlClassName({
                          className: "w-full " + (statusInvalid ? "border-rose-300" : ""),
                        })}
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
                      className={formControlClassName({
                        className: "w-full " + (priorityInvalid ? "border-rose-300" : ""),
                      })}
                    />
                    {priorityInvalid ? <p className="mt-1 text-xs text-rose-600">{t("priorityInvalid")}</p> : null}
                  </div>
                </div>

                <div>
                  <LabelWithTooltip label={t("analyticsIdLabel")} tooltip={t("analyticsIdTooltip")} />
                  <input
                    value={asString(configValue.analyticsId)}
                    readOnly
                    className="h-10 w-full rounded-xl border border-line bg-panel-muted px-3.5 font-mono text-xs text-muted outline-none"
                  />
                </div>
              </>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
