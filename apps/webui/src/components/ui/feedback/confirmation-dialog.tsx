"use client";

import { Button } from "@/components/ui/controls/button";
import { AppDialog } from "@/components/ui/feedback/app-dialog";

interface ConfirmationDialogProps {
  cancelLabel: string;
  confirmLabel: string;
  description: string;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  tone?: "danger" | "default";
}

export function ConfirmationDialog({
  cancelLabel,
  confirmLabel,
  description,
  isOpen,
  onCancel,
  onConfirm,
  title,
  tone = "default",
}: ConfirmationDialogProps) {
  return (
    <AppDialog isOpen={isOpen} onClose={onCancel}>
      <div className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">
          {description}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} variant="ghost">
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            variant={tone === "danger" ? "danger" : "primary"}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}
