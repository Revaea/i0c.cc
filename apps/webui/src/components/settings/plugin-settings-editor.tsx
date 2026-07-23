"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type {
  JsonObject,
  JsonValue,
  PluginInstanceConfig,
} from "@i0c/config";
import type { PluginManifest } from "@i0c/plugin-api";

import { DropdownSelect } from "@/components/ui/controls/dropdown-select";
import {
  fieldLabelClassName,
  fieldLabelRowClassName,
  formControlClassName,
} from "@/components/ui/controls/form-control";
import { NumberInput } from "@/components/ui/controls/number-input";
import { Switch } from "@/components/ui/controls/switch";
import {
  installedInstancePluginManifests,
  requiredInstancePluginIds,
} from "@/lib/configuration/validation";

interface PluginSettingsEditorProps {
  isReadOnly: boolean;
  value: Record<string, PluginInstanceConfig>;
  onChange: (value: Record<string, PluginInstanceConfig>) => void;
}

const pluginKindOrder = [
  "data-source",
  "data-repository",
  "runtime-platform",
  "analytics-sink",
  "analytics-store",
  "feature",
] as const;

export function PluginSettingsEditor({
  isReadOnly,
  value,
  onChange,
}: PluginSettingsEditorProps) {
  const t = useTranslations("instanceConfig");
  const manifests = useMemo(() => {
    const manifestsById = new Map<string, PluginManifest>();
    for (const manifest of installedInstancePluginManifests) {
      manifestsById.set(manifest.id, manifest);
    }

    return [...manifestsById.values()].sort((left, right) => {
      const kindDifference =
        pluginKindOrder.indexOf(left.kind)
        - pluginKindOrder.indexOf(right.kind);
      return kindDifference || left.name.localeCompare(right.name);
    });
  }, []);
  const fieldLabels: Record<string, string> = {
    connectTimeoutSeconds: t("fields.connectTimeoutSeconds"),
    developmentIdleTimeoutSeconds: t("fields.developmentIdleTimeoutSeconds"),
    hookTimeoutMs: t("fields.hookTimeoutMs"),
    idleTimeoutSeconds: t("fields.idleTimeoutSeconds"),
    maxConnections: t("fields.maxConnections"),
    maximumDeliveryAttempts: t("fields.maximumDeliveryAttempts"),
    requestTimeoutMs: t("fields.requestTimeoutMs"),
    retentionDays: t("fields.retentionDays"),
  };
  const kindLabels: Record<string, string> = {
    "analytics-sink": t("pluginKinds.analyticsSink"),
    "analytics-store": t("pluginKinds.analyticsStore"),
    "data-repository": t("pluginKinds.dataRepository"),
    "data-source": t("pluginKinds.dataSource"),
    "runtime-platform": t("pluginKinds.runtimePlatform"),
    feature: t("pluginKinds.feature"),
  };
  const manifestGroups = pluginKindOrder
    .map((kind) => ({
      kind,
      manifests: manifests.filter((manifest) => manifest.kind === kind),
    }))
    .filter((group) => group.manifests.length > 0);

  function updateDeclaration(
    manifest: PluginManifest,
    updater: (current: PluginInstanceConfig) => PluginInstanceConfig,
  ) {
    const current = value[manifest.id] ?? {
      enabled: requiredInstancePluginIds.has(manifest.id),
      version: manifest.config.version,
    };
    onChange({
      ...value,
      [manifest.id]: updater(current),
    });
  }

  function setPluginEnabled(manifest: PluginManifest, enabled: boolean) {
    const next = { ...value };
    if (enabled && manifest.kind === "analytics-store") {
      for (const candidate of manifests) {
        if (candidate.kind !== "analytics-store" || candidate.id === manifest.id) {
          continue;
        }
        const declaration = next[candidate.id];
        if (declaration) {
          next[candidate.id] = { ...declaration, enabled: false };
        }
      }
    }

    const current = next[manifest.id] ?? {
      enabled: false,
      version: manifest.config.version,
    };
    const config = current.config ?? createInitialConfig(manifest);
    const secrets = current.secrets ?? createInitialSecrets(manifest);
    next[manifest.id] = {
      ...current,
      enabled,
      version: current.version ?? manifest.config.version,
      ...(Object.keys(config).length > 0 ? { config } : {}),
      ...(Object.keys(secrets).length > 0 ? { secrets } : {}),
    };
    onChange(next);
  }

  function updateConfigProperty(
    manifest: PluginManifest,
    property: string,
    nextValue: JsonValue | undefined,
  ) {
    updateDeclaration(manifest, (current) => {
      const config = { ...(current.config ?? {}) };
      if (nextValue === undefined) {
        delete config[property];
      } else {
        config[property] = nextValue;
      }
      return {
        ...current,
        version: current.version ?? manifest.config.version,
        config,
      };
    });
  }

  function updateSecretBinding(
    manifest: PluginManifest,
    secret: string,
    binding: string,
  ) {
    updateDeclaration(manifest, (current) => ({
      ...current,
      version: current.version ?? manifest.config.version,
      secrets: {
        ...(current.secrets ?? {}),
        [secret]: binding,
      },
    }));
  }

  return (
    <section className="py-8">
      <div>
        <h2 className="text-base font-semibold text-ink">
          {t("sections.plugins.title")}
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
          {t("sections.plugins.description")}
        </p>
      </div>

      <div className="mt-6 space-y-8">
        {manifestGroups.map((group) => (
          <div key={group.kind}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {kindLabels[group.kind] ?? group.kind}
            </h3>
            <div className="mt-3 divide-y divide-line border-t border-line">
              {group.manifests.map((manifest) => {
                const declaration = value[manifest.id];
                const isRequired = requiredInstancePluginIds.has(manifest.id);
                const isEnabled = declaration?.enabled ?? isRequired;
                const properties = getSchemaProperties(manifest);
                const secretEntries = Object.entries(manifest.secrets);
                const hasDetails =
                  Object.keys(properties).length > 0 || secretEntries.length > 0;
                const fieldsDisabled = isReadOnly || !isEnabled;

                return (
                  <article key={manifest.id} className="py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-ink">
                            {manifest.name}
                          </h3>
                          {isRequired ? (
                            <span className="rounded-full border border-accent-soft bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-strong">
                              {t("required")}
                            </span>
                          ) : null}
                        </div>
                        <code className="mt-1 block break-all text-xs text-muted">
                          {manifest.id}
                        </code>
                      </div>
                      <Switch
                        checked={isEnabled}
                        disabled={isReadOnly || isRequired}
                        label={t("togglePlugin", { name: manifest.name })}
                        onChange={(enabled) => setPluginEnabled(manifest, enabled)}
                      />
                    </div>

                    {isEnabled && hasDetails ? (
                      <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
                        {Object.entries(properties).map(([property, schema]) => (
                          <PluginPropertyField
                            key={property}
                            disabled={fieldsDisabled}
                            label={fieldLabels[property] ?? humanize(property)}
                            onChange={(nextValue) =>
                              updateConfigProperty(manifest, property, nextValue)
                            }
                            schema={schema}
                            value={declaration?.config?.[property]}
                          />
                        ))}

                        {secretEntries.map(([secret, requirement]) => {
                          const binding =
                            declaration?.secrets?.[secret]
                            ?? requirement.defaultBinding
                            ?? "";
                          return (
                            <div key={secret}>
                              <label className={fieldLabelRowClassName}>
                                <span className={fieldLabelClassName}>
                                  {t("secretBinding", { secret })}
                                </span>
                              </label>
                              <input
                                value={binding}
                                disabled={fieldsDisabled}
                                onChange={(event) =>
                                  updateSecretBinding(
                                    manifest,
                                    secret,
                                    event.target.value.toUpperCase(),
                                  )
                                }
                                placeholder={requirement.defaultBinding}
                                autoCapitalize="characters"
                                autoCorrect="off"
                                spellCheck={false}
                                className={formControlClassName({ className: "w-full font-mono" })}
                              />
                              <p className="mt-1.5 text-xs leading-5 text-muted">
                                {t("secretBindingHint")}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PluginPropertyField({
  disabled,
  label,
  onChange,
  schema,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: JsonValue | undefined) => void;
  schema: JsonObject;
  value: JsonValue | undefined;
}) {
  const t = useTranslations("instanceConfig");
  const constantValue = schema.const;
  const minimum = typeof schema.minimum === "number" ? schema.minimum : undefined;
  const maximum = typeof schema.maximum === "number" ? schema.maximum : undefined;
  const enumValues = Array.isArray(schema.enum)
    ? schema.enum.filter(
        (item): item is string | number =>
          typeof item === "string" || typeof item === "number",
      )
    : [];
  const hint = constantValue !== undefined
    ? t("fixedValue")
    : minimum !== undefined || maximum !== undefined
      ? t("range", {
          minimum: minimum ?? "−∞",
          maximum: maximum ?? "∞",
        })
      : null;

  return (
    <div>
      <label className={fieldLabelRowClassName}>
        <span className={fieldLabelClassName}>{label}</span>
      </label>

      {enumValues.length > 0 ? (
        <DropdownSelect
          value={String(value ?? enumValues[0] ?? "")}
          disabled={disabled}
          onChange={(next) => {
            const resolved = enumValues.find((item) => String(item) === next);
            onChange(resolved);
          }}
          options={enumValues.map((item) => ({
            value: String(item),
            label: String(item),
          }))}
        />
      ) : schema.type === "boolean" ? (
        <div className="flex h-10 items-center justify-between rounded-xl border border-line bg-panel px-3.5">
          <span className="text-sm text-ink">
            {value === true ? t("enabled") : t("disabled")}
          </span>
          <Switch
            checked={value === true}
            disabled={disabled}
            label={label}
            onChange={onChange}
          />
        </div>
      ) : schema.type === "integer" || schema.type === "number" || typeof constantValue === "number" ? (
        <NumberInput
          value={
            typeof constantValue === "number"
              ? constantValue
              : typeof value === "number"
                ? value
                : undefined
          }
          disabled={disabled}
          readOnly={constantValue !== undefined}
          minimum={minimum}
          maximum={maximum}
          onChange={onChange}
        />
      ) : (
        <input
          value={typeof constantValue === "string"
            ? constantValue
            : typeof value === "string"
              ? value
              : ""}
          disabled={disabled}
          readOnly={constantValue !== undefined}
          onChange={(event) => onChange(event.target.value)}
          className={formControlClassName({ className: "w-full" })}
        />
      )}

      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function getSchemaProperties(
  manifest: PluginManifest,
): Record<string, JsonObject> {
  const properties = manifest.config.schema?.properties;
  if (!isJsonObject(properties)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(properties).filter(
      (entry): entry is [string, JsonObject] => isJsonObject(entry[1]),
    ),
  );
}

function createInitialConfig(manifest: PluginManifest): JsonObject {
  const config: JsonObject = {};
  for (const [property, schema] of Object.entries(getSchemaProperties(manifest))) {
    if (schema.const !== undefined) {
      config[property] = schema.const;
    }
  }
  return config;
}

function createInitialSecrets(
  manifest: PluginManifest,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(manifest.secrets)
      .filter((entry): entry is [string, typeof entry[1] & { defaultBinding: string }] =>
        typeof entry[1].defaultBinding === "string",
      )
      .map(([secret, requirement]) => [secret, requirement.defaultBinding]),
  );
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("-", " ")
    .replace(/^./, (first) => first.toUpperCase());
}
