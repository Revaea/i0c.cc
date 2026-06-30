'use client';

import { useState } from "react";

type LabelWithTooltipProps = {
  label: string;
  tooltip: string;
};

export function LabelWithTooltip({ label, tooltip }: LabelWithTooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div
        className="relative flex items-center"

        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        
        onClick={(e) => {
          e.stopPropagation();
          setShow((prev) => !prev);
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
          className="h-3.5 w-3.5 text-slate-400 cursor-pointer transition-colors hover:text-slate-600"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>

        <div
          className={
            "pointer-events-none absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 transform transition-all duration-200 z-50 " +
            (show ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95")
          }
        >
          <div className="relative rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-xl leading-relaxed whitespace-pre-wrap text-center">
            {tooltip}
            <div className="absolute top-full left-1/2 -mt-1 -ml-1 h-2 w-2 border-4 border-transparent border-t-slate-800"></div>
          </div>
        </div>
      </div>
    </div>
  );
}