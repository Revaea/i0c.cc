"use client";

import { useState } from "react";

import { formControlClassName } from "@/components/ui/controls/form-control";

interface NumberInputProps {
  className?: string;
  disabled?: boolean;
  maximum?: number;
  minimum?: number;
  onChange: (value: number | undefined) => void;
  readOnly?: boolean;
  value: number | undefined;
}

export function NumberInput({
  className,
  disabled = false,
  maximum,
  minimum,
  onChange,
  readOnly = false,
  value,
}: NumberInputProps) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));

  return (
    <input
      type="number"
      value={draft}
      disabled={disabled}
      readOnly={readOnly}
      min={minimum}
      max={maximum}
      step={1}
      onChange={(event) => {
        const nextDraft = event.target.value;
        setDraft(nextDraft);
        if (nextDraft === "") {
          return;
        }
        const nextValue = Number(nextDraft);
        if (Number.isFinite(nextValue)) {
          onChange(nextValue);
        }
      }}
      onBlur={() => {
        if (draft === "") {
          onChange(undefined);
        }
      }}
      className={formControlClassName({
        className: ["w-full tabular-nums", className].filter(Boolean).join(" "),
      })}
    />
  );
}
