"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/controls/button";
import { AppDialog } from "@/components/ui/feedback/app-dialog";
import {
  fieldLabelClassName,
  fieldLabelRowClassName,
  formControlClassName,
} from "@/components/ui/controls/form-control";
import type { RedirectEntryDraft } from "@/composables/redirects-groups/model";

import { RouteEntryEditor } from "./route-entry/route-entry-editor";

interface NewRouteEntryDialogProps {
  groupName: string;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (draft: RedirectEntryDraft) => void;
}

export function NewRouteEntryDialog({
  groupName,
  isOpen,
  onClose,
  onCreate,
}: NewRouteEntryDialogProps) {
  const t = useTranslations("entries");
  const [pathKey, setPathKey] = useState("");
  const [value, setValue] = useState<unknown>("");
  const normalizedPathKey = pathKey.trim();
  const canCreate = normalizedPathKey.length > 0;

  function createEntry() {
    if (!canCreate) {
      return;
    }
    onCreate({
      key: normalizedPathKey,
      value,
    });
  }

  return (
    <AppDialog isOpen={isOpen} onClose={onClose} widthClassName="max-w-3xl">
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          createEntry();
        }}
        className="p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {t("newRuleTitle")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              {t("newRuleDescription", { group: groupName })}
            </p>
          </div>
          <Button
            onClick={onClose}
            size="icon"
            variant="ghost"
            title={t("newRuleCancel")}
            aria-label={t("newRuleCancel")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </Button>
        </div>

        <div className="mt-5">
          <label className={fieldLabelRowClassName}>
            <span className={fieldLabelClassName}>{t("pathKey")}</span>
          </label>
          <input
            value={pathKey}
            onChange={(event) => setPathKey(event.target.value)}
            placeholder={t("pathKeyPlaceholder")}
            className={formControlClassName({ className: "w-full" })}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {t("newRulePathHint")}
          </p>
        </div>

        <div className="mt-5">
          <RouteEntryEditor
            pathKey={normalizedPathKey}
            value={value}
            onChange={setValue}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">
            {t("newRuleCancel")}
          </Button>
          <Button type="submit" disabled={!canCreate} variant="primary">
            {t("newRuleCreate")}
          </Button>
        </div>
      </form>
    </AppDialog>
  );
}
