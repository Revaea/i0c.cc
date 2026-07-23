"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/controls/button";

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  isSaving: boolean;
  kind: "rules" | "settings";
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export function UnsavedChangesDialog({
  isOpen,
  isSaving,
  kind,
  onCancel,
  onDiscard,
  onSave,
}: UnsavedChangesDialogProps) {
  const t = useTranslations("unsavedChanges");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) {
          onCancel();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onCancel();
        }
      }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-line bg-panel p-0 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">
          {t(kind === "settings" ? "settingsTitle" : "rulesTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {t(kind === "settings" ? "settingsDescription" : "rulesDescription")}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            onClick={onCancel}
            disabled={isSaving}
            variant="ghost"
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={onDiscard}
            disabled={isSaving}
            variant="secondary"
          >
            {t("discard")}
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            variant="primary"
          >
            {isSaving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
