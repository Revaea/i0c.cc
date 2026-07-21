'use client';

import { useId, useState } from "react";

import { Button } from "@/components/ui/controls/button";
import {
  fieldLabelClassName,
  fieldLabelRowClassName,
} from "@/components/ui/controls/form-control";

type LabelWithTooltipProps = {
  label: string;
  tooltip: string;
};

export function LabelWithTooltip({ label, tooltip }: LabelWithTooltipProps) {
  const [show, setShow] = useState(false);
  const tooltipId = useId();

  return (
    <div className={fieldLabelRowClassName}>
      <span className={fieldLabelClassName}>{label}</span>
      <div
        className="relative flex items-center"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        <Button
          size="icon-xs"
          variant="ghost"
          className="text-muted"
          aria-label={tooltip}
          aria-describedby={show ? tooltipId : undefined}
          aria-expanded={show}
          onFocus={() => setShow(true)}
          onBlur={() => setShow(false)}
          onClick={(event) => {
            event.stopPropagation();
            setShow((isOpen) => !isOpen);
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </Button>

        <div
          id={tooltipId}
          role="tooltip"
          aria-hidden={!show}
          className={
            "pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 transform transition-all duration-200 " +
            (show ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95")
          }
        >
          <div className="relative whitespace-pre-wrap rounded-lg bg-ink px-3 py-2 text-center text-xs leading-relaxed text-white shadow-xl">
            {tooltip}
            <div className="absolute left-1/2 top-full -ml-1 -mt-1 h-2 w-2 border-4 border-transparent border-t-ink" />
          </div>
        </div>
      </div>
    </div>
  );
}
