"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { JsonEditor } from "@/components/editor/json-editor";
import { Button } from "@/components/ui/controls/button";

export type EditorMode = "rules" | "json" | "config";

export type RightPanelProps = {
  editorMode: EditorMode;
  onEnterRulesMode: () => void;
  onEnterJsonMode: () => void;
  onEnterConfigMode: () => void;
  jsonDraft: string;
  onJsonDraftChange: (value: string) => void;
  jsonError: string | null;
  isReadOnly: boolean;
  configContent: ReactNode;
  rulesContent: ReactNode;
};

export function RightPanel({
  editorMode,
  onEnterRulesMode,
  onEnterJsonMode,
  onEnterConfigMode,
  jsonDraft,
  onJsonDraftChange,
  jsonError,
  isReadOnly,
  configContent,
  rulesContent,
}: RightPanelProps) {
  const t = useTranslations("editor");

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid w-fit grid-cols-3 gap-1 rounded-xl bg-panel-muted p-1">
          <Button
            onClick={onEnterRulesMode}
            size="sm"
            variant={editorMode === "rules" ? "primary" : "ghost"}
          >
            {t("rules")}
          </Button>
          <Button
            onClick={onEnterJsonMode}
            size="sm"
            variant={editorMode === "json" ? "primary" : "ghost"}
          >
            {t("json")}
          </Button>
          <Button
            onClick={onEnterConfigMode}
            size="sm"
            variant={editorMode === "config" ? "primary" : "ghost"}
          >
            {t("config")}
          </Button>
        </div>
        <p className="text-xs text-muted">
          {isReadOnly
            ? t("readOnlyHint")
            : editorMode === "config"
              ? t("configPreferred")
              : editorMode === "json"
              ? t("jsonPreferred")
              : t("editAndSave")}
        </p>
      </div>

      {editorMode === "config" ? (
        configContent
      ) : editorMode === "json" ? (
        <JsonEditor
          jsonDraft={jsonDraft}
          onJsonDraftChange={onJsonDraftChange}
          jsonError={jsonError}
          isReadOnly={isReadOnly}
        />
      ) : (
        rulesContent
      )}
    </div>
  );
}
