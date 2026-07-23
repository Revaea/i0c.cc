"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import type { DataConfig, RobotsPolicy, WebUiAccessMode } from "@i0c/config";

import { PluginSettingsEditor } from "@/components/settings/plugin-settings-editor";
import { Button } from "@/components/ui/controls/button";
import { DropdownSelect } from "@/components/ui/controls/dropdown-select";
import {
  fieldLabelClassName,
  fieldLabelRowClassName,
  formControlClassName,
} from "@/components/ui/controls/form-control";
import { NumberInput } from "@/components/ui/controls/number-input";
import { validateInstanceDataConfig } from "@/lib/configuration/validation";

interface InstanceSettingsEditorProps {
  isReadOnly: boolean;
  onChange: (value: DataConfig) => void;
  pluginStatusContent: ReactNode;
  value: DataConfig;
}

interface SettingsFieldProps {
  children: ReactNode;
  description: string;
  label: string;
}

type SettingsCategory =
  | "runtime"
  | "analytics"
  | "access"
  | "installed-plugins"
  | "plugin-settings";

export function InstanceSettingsEditor({
  isReadOnly,
  onChange,
  pluginStatusContent,
  value,
}: InstanceSettingsEditorProps) {
  const t = useTranslations("instanceConfig");
  const [selectedCategory, setSelectedCategory] =
    useState<SettingsCategory>("runtime");
  const validation = useMemo(() => validateInstanceDataConfig(value), [value]);
  const issues = validation.status === "invalid" ? validation.issues : [];

  function updateRuntime(next: Partial<DataConfig["runtime"]>) {
    onChange({
      ...value,
      runtime: {
        ...value.runtime,
        ...next,
      },
    });
  }

  function updateAnalytics(next: Partial<DataConfig["analytics"]>) {
    onChange({
      ...value,
      analytics: {
        ...value.analytics,
        ...next,
      },
    });
  }

  function updateAccess(next: Partial<DataConfig["webui"]["access"]>) {
    onChange({
      ...value,
      webui: {
        ...value.webui,
        access: {
          ...value.webui.access,
          ...next,
        },
      },
    });
  }

  return (
    <div>
      {issues.length > 0 ? (
        <div className="mb-6 border-l-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">{t("validationSummary")}</p>
          <ul className="mt-2 space-y-1 text-xs">
            {issues.slice(0, 5).map((issue) => (
              <li key={`${issue.path}:${issue.message}`}>
                <code>{issue.path}</code>: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <nav
          aria-label={t("categoryNavigation")}
          className="lg:sticky lg:top-20 lg:self-start"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {t("categoryNavigation")}
          </p>
          <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            <SettingsCategoryButton
              isSelected={selectedCategory === "runtime"}
              onClick={() => setSelectedCategory("runtime")}
            >
              {t("sections.runtime.title")}
            </SettingsCategoryButton>
            <SettingsCategoryButton
              isSelected={selectedCategory === "analytics"}
              onClick={() => setSelectedCategory("analytics")}
            >
              {t("sections.analytics.title")}
            </SettingsCategoryButton>
            <SettingsCategoryButton
              isSelected={selectedCategory === "access"}
              onClick={() => setSelectedCategory("access")}
            >
              {t("sections.access.title")}
            </SettingsCategoryButton>
            <SettingsCategoryButton
              isSelected={selectedCategory === "installed-plugins"}
              onClick={() => setSelectedCategory("installed-plugins")}
            >
              {t("sections.installedPlugins.title")}
            </SettingsCategoryButton>
            <SettingsCategoryButton
              isSelected={selectedCategory === "plugin-settings"}
              onClick={() => setSelectedCategory("plugin-settings")}
            >
              {t("sections.plugins.title")}
            </SettingsCategoryButton>
          </div>
        </nav>

        <div className="min-w-0">
          {selectedCategory === "runtime" ? (
            <SettingsSection
              title={t("sections.runtime.title")}
              description={t("sections.runtime.description")}
            >
            <SettingsField
              label={t("fields.canonicalOrigin")}
              description={t("fieldHints.canonicalOrigin")}
            >
              <input
                value={value.runtime.canonicalOrigin}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateRuntime({
                    canonicalOrigin: event.target.value as `https://${string}`,
                  })
                }
                placeholder="https://i0c.cc"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={formControlClassName({ className: "w-full" })}
              />
            </SettingsField>

            <SettingsField
              label={t("fields.robotsPolicy")}
              description={t("fieldHints.robotsPolicy")}
            >
              <DropdownSelect
                value={value.runtime.robotsPolicy}
                disabled={isReadOnly}
                onChange={(robotsPolicy) =>
                  updateRuntime({ robotsPolicy: robotsPolicy as RobotsPolicy })
                }
                options={[
                  { value: "allow", label: t("options.robotsAllow") },
                  { value: "disallow", label: t("options.robotsDisallow") },
                ]}
              />
            </SettingsField>

            <SettingsField
              label={t("fields.configCacheTtlSeconds")}
              description={t("fieldHints.configCacheTtlSeconds")}
            >
              <NumberInput
                value={value.runtime.configCacheTtlSeconds}
                disabled={isReadOnly}
                minimum={1}
                maximum={86400}
                onChange={(configCacheTtlSeconds) => {
                  if (configCacheTtlSeconds !== undefined) {
                    updateRuntime({ configCacheTtlSeconds });
                  }
                }}
              />
            </SettingsField>

            <SettingsField
              label={t("fields.redirectsCacheTtlSeconds")}
              description={t("fieldHints.redirectsCacheTtlSeconds")}
            >
              <NumberInput
                value={value.runtime.redirectsCacheTtlSeconds}
                disabled={isReadOnly}
                minimum={1}
                maximum={86400}
                onChange={(redirectsCacheTtlSeconds) => {
                  if (redirectsCacheTtlSeconds !== undefined) {
                    updateRuntime({ redirectsCacheTtlSeconds });
                  }
                }}
              />
            </SettingsField>
            </SettingsSection>
          ) : null}

          {selectedCategory === "analytics" ? (
            <SettingsSection
              title={t("sections.analytics.title")}
              description={t("sections.analytics.description")}
            >
            <SettingsField
              label={t("fields.ingestEndpoint")}
              description={t("fieldHints.ingestEndpoint")}
            >
              <input
                value={value.analytics.ingestEndpoint}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateAnalytics({
                    ingestEndpoint: event.target.value as `https://${string}`,
                  })
                }
                placeholder="https://u.i0c.cc/api/analytics/events"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={formControlClassName({ className: "w-full" })}
              />
            </SettingsField>

            <SettingsField
              label={t("fields.sourceId")}
              description={t("fieldHints.sourceId")}
            >
              <input
                value={value.analytics.sourceId}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateAnalytics({ sourceId: event.target.value.toLowerCase() })
                }
                placeholder="i0c.cc"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={formControlClassName({ className: "w-full font-mono" })}
              />
            </SettingsField>
            </SettingsSection>
          ) : null}

          {selectedCategory === "access" ? (
            <SettingsSection
              title={t("sections.access.title")}
              description={t("sections.access.description")}
            >
            <SettingsField
              label={t("fields.accessMode")}
              description={t("fieldHints.accessMode")}
            >
              <DropdownSelect
                value={value.webui.access.mode}
                disabled={isReadOnly}
                onChange={(mode) =>
                  updateAccess({ mode: mode as WebUiAccessMode })
                }
                options={[
                  { value: "authenticated", label: t("options.authenticated") },
                  { value: "allowlist", label: t("options.allowlist") },
                  { value: "public-readonly", label: t("options.publicReadonly") },
                ]}
              />
            </SettingsField>

            <div className="sm:col-span-2">
              <div className={fieldLabelRowClassName}>
                <span className={fieldLabelClassName}>
                  {t("fields.managerGitHubUserIds")}
                </span>
              </div>
              <p className="mb-3 text-xs leading-5 text-muted">
                {t("fieldHints.managerGitHubUserIds")}
              </p>
              <div className="space-y-2">
                {value.webui.access.managerGitHubUserIds.map((userId, index) => (
                  <div key={`${index}:${userId}`} className="flex items-center gap-2">
                    <input
                      value={userId}
                      disabled={isReadOnly}
                      onChange={(event) => {
                        const managerGitHubUserIds = [
                          ...value.webui.access.managerGitHubUserIds,
                        ];
                        managerGitHubUserIds[index] = event.target.value.replace(/\D/g, "");
                        updateAccess({ managerGitHubUserIds });
                      }}
                      inputMode="numeric"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-label={t("managerIdLabel", { index: index + 1 })}
                      className={formControlClassName({
                        className: "min-w-0 flex-1 font-mono",
                      })}
                    />
                    {isReadOnly ? null : (
                      <Button
                        onClick={() => {
                          const managerGitHubUserIds =
                            value.webui.access.managerGitHubUserIds.filter(
                              (_, candidateIndex) => candidateIndex !== index,
                            );
                          updateAccess({ managerGitHubUserIds });
                        }}
                        size="icon"
                        variant="danger"
                        title={t("removeManager")}
                        aria-label={t("removeManager")}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-4 w-4"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path d="M5 12h14" strokeLinecap="round" />
                        </svg>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {isReadOnly ? null : (
                <Button
                  onClick={() =>
                    updateAccess({
                      managerGitHubUserIds: [
                        ...value.webui.access.managerGitHubUserIds,
                        "",
                      ],
                    })
                  }
                  className="mt-3"
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
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                  {t("addManager")}
                </Button>
              )}
            </div>
            </SettingsSection>
          ) : null}

          {selectedCategory === "installed-plugins"
            ? pluginStatusContent
            : null}

          {selectedCategory === "plugin-settings" ? (
            <PluginSettingsEditor
              value={value.plugins}
              isReadOnly={isReadOnly}
              onChange={(plugins) => onChange({ ...value, plugins })}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SettingsSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="py-8">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
          {description}
        </p>
      </div>
      <div className="mt-5 grid gap-x-5 gap-y-5 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function SettingsCategoryButton({
  children,
  isSelected,
  onClick,
}: {
  children: ReactNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        isSelected
          ? "bg-accent-soft text-accent-strong"
          : "text-muted hover:bg-panel-muted hover:text-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SettingsField({
  children,
  description,
  label,
}: SettingsFieldProps) {
  return (
    <div>
      <label className={fieldLabelRowClassName}>
        <span className={fieldLabelClassName}>{label}</span>
      </label>
      {children}
      <p className="mt-1.5 text-xs leading-5 text-muted">{description}</p>
    </div>
  );
}
