'use client';

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/controls/button";
import { WebUiPluginSlot } from "@/components/plugins/plugin-slot";
import { fieldLabelClassName, formControlClassName } from "@/components/ui/controls/form-control";
import type { RedirectGroup } from "@/composables/redirects-groups/model";

import { RouteEntryEditor } from "@/components/editor/route-entry/route-entry-editor";

export type GroupEntriesEditorProps = {
  group: RedirectGroup;
  isReadOnly: boolean;
  onAddEntry: (groupId: string) => void;
  onRemoveEntry: (groupId: string, entryId: string) => void;
  onUpdateEntryKey: (groupId: string, entryId: string, nextKey: string) => void;
  onUpdateEntryValue: (groupId: string, entryId: string, nextValue: unknown) => void;
};

export function GroupEntriesEditor({
  group,
  isReadOnly,
  onAddEntry,
  onRemoveEntry,
  onUpdateEntryKey,
  onUpdateEntryValue,
}: GroupEntriesEditorProps) {
  const t = useTranslations("entries");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6 text-muted"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M3 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="text-lg font-semibold text-ink">{group.name}</h1>
          </div>
          <p className="mt-1 text-sm text-muted">{t("description")}</p>
        </div>

        {isReadOnly ? null : (
          <Button
            onClick={() => onAddEntry(group.id)}
            size="sm"
            variant="secondary"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
              <path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("addRule")}
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {group.entries.length === 0 ? (
          <div className="border-l-2 border-line-strong bg-panel-muted px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-ink">{t("emptyTitle")}</p>
                <p className="mt-1 text-sm text-muted">
                  {t(isReadOnly ? "emptyReadOnlyHint" : "emptyHint")}
                </p>
              </div>
            </div>
          </div>
        ) : null}
        {group.entries.map((entry) => (
          <section key={entry.id} id={`entry-${entry.id}`} className="border-t border-line pt-6">
            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <label className={"block " + fieldLabelClassName}>{t("pathKey")}</label>
                <input
                  value={entry.key}
                  onChange={(e) => onUpdateEntryKey(group.id, entry.id, e.target.value)}
                  placeholder={t("pathKeyPlaceholder")}
                  readOnly={isReadOnly}
                  className={formControlClassName({ className: "mt-1 w-full" })}
                />
              </div>

              {isReadOnly ? null : (
                <Button
                  onClick={() => {
                    if (window.confirm(t("confirmDeleteRule"))) {
                      onRemoveEntry(group.id, entry.id);
                    }
                  }}
                  size="icon-lg"
                  variant="danger"
                  title={t("deleteRule")}
                  aria-label={t("deleteRule")}
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
              )}
            </div>

            <div className="mt-4">
              <RouteEntryEditor
                pathKey={entry.key}
                value={entry.value}
                isReadOnly={isReadOnly}
                onChange={(next) => onUpdateEntryValue(group.id, entry.id, next)}
              />
              <WebUiPluginSlot
                name="rule-editor.fields"
                context={{ entry, group, isReadOnly }}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
