'use client';

import { useTranslations } from "next-intl";

import { formControlClassName } from "@/components/ui/form-control";
import { LabelWithTooltip } from "@/components/ui/label-with-tooltip";
import { QRCodeButton } from "@/components/ui/qr-code";

interface RouteQuickEditorProps {
  value: string;
  onChange: (next: string) => void;
  pathKey: string;
  isReadOnly: boolean;
}

export function RouteQuickEditor({
  value,
  onChange,
  pathKey,
  isReadOnly,
}: RouteQuickEditorProps) {
  const t = useTranslations("routeEntry");

  return (
    <div className="mt-3">
      <LabelWithTooltip label={t("targetLabel")} tooltip={t("targetTooltip")} />
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("targetPlaceholder")}
          readOnly={isReadOnly}
          className={formControlClassName({ className: "flex-1" })}
        />
        {pathKey && <QRCodeButton pathKey={pathKey} />}
      </div>
    </div>
  );
}
