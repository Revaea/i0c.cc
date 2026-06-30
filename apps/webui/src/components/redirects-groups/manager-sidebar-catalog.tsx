'use client';

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { RedirectEntry } from "@/composables/redirects-groups/model";

export type RouteEntriesCatalogProps = {
  entries: RedirectEntry[];
  className?: string;
  hideHeader?: boolean;
  title?: string;
  variant?: "plain" | "collapsible";
  wrapperClassName?: string;
  collapsibleContentClassName?: string;
  onAddRule?: () => void;
  addRuleLabel?: string;
  onRemoveEntry?: (entryId: string) => void;
  showLocateButton?: boolean;
};

export function RouteEntriesCatalog({
  entries,
  className,
  hideHeader,
  title,
  variant = "plain",
  wrapperClassName,
  collapsibleContentClassName,
  onAddRule,
  addRuleLabel,
  onRemoveEntry,
  showLocateButton,
}: RouteEntriesCatalogProps) {
  const tEntries = useTranslations("entries");
  const [entriesExpanded, setEntriesExpanded] = useState(true);

  if (!entries.length) {
    return null;
  }

  const headerTitle = title ?? "Entries";
  const addLabel = addRuleLabel ?? tEntries("addRule");
  const deleteLabel = tEntries("deleteRule");
  const locateLabel = tEntries("locate");
  const allowToggle = variant === "plain" && !hideHeader;
  const showList = !allowToggle || entriesExpanded;

  const renderEntryIcon = (key: string) => {
    if (!key || key === "/") {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4 shrink-0 text-slate-500"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m3 10.5 9-6.5 9 6.5V20a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-4h-4v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    if (key.endsWith("/")) {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4 shrink-0 text-slate-500"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4 shrink-0 text-slate-500"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 4h9l3 3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 4v3h3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12h6m-6 4h4" strokeLinecap="round" />
      </svg>
    );
  };

  const handleJump = (entryId: string) => {
    const target = document.getElementById(`entry-${entryId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const list = (
    <div
      className={[
        "flex flex-col min-h-0 p-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hideHeader ? null : (
        <div className="shrink-0 mb-3 border-b border-slate-200 pb-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">{headerTitle}</h2>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500">{entries.length}</span>
              {onAddRule ? (
                <button
                  type="button"
                  onClick={onAddRule}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2">
                    <path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {addLabel}
                </button>
              ) : null}

              {variant === "plain" ? (
                <button
                  type="button"
                  onClick={() => setEntriesExpanded((value) => !value)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  title={entriesExpanded ? tEntries("collapse") : tEntries("expand")}
                  aria-label={entriesExpanded ? tEntries("collapse") : tEntries("expand")}
                >
                  <svg
                    className={"h-4 w-4 text-slate-500 transition-transform " + (entriesExpanded ? "rotate-180" : "")}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
      {showList ? (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent" style={{ scrollbarGutter: "stable" }}>
          <ul className="space-y-1 text-sm text-slate-700">
            {entries.map((entry) => (
              <li key={entry.id} className="group flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50">
                <button
                  type="button"
                  onClick={() => handleJump(entry.id)}
                  className="min-w-0 flex-1 truncate rounded-lg px-1 py-1 text-left"
                  title={entry.key || "/"}
                >
                  <span className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-700">
                    {renderEntryIcon(entry.key)}
                    <span className="block min-w-0 truncate">{entry.key || "/"}</span>
                  </span>
                </button>

                {showLocateButton ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleJump(entry.id);
                    }}
                    className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-transparent text-slate-600 hover:bg-slate-100"
                    aria-label={locateLabel}
                    title={locateLabel}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M12 2v4" strokeLinecap="round" />
                      <path d="M12 18v4" strokeLinecap="round" />
                      <path d="M2 12h4" strokeLinecap="round" />
                      <path d="M18 12h4" strokeLinecap="round" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                ) : null}

                {onRemoveEntry ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const ok = window.confirm(tEntries("confirmDeleteRule"));
                      if (!ok) {
                        return;
                      }
                      onRemoveEntry(entry.id);
                    }}
                    className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-transparent text-rose-600 hover:bg-rose-50"
                    aria-label={deleteLabel}
                    title={deleteLabel}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M3 6h18" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 11v6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );

if (variant === "collapsible") {
    return (
      <div className={wrapperClassName}>
        <details className="group relative rounded-2xl border border-slate-200 bg-white shadow-lg">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">{headerTitle}</span>
            <span className="flex items-center gap-2 text-xs text-slate-600">
              <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500">
                {entries.length}
              </span>
              {onAddRule ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onAddRule();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2">
                    <path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {addLabel}
                </button>
              ) : null}
              <svg
                className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </summary>
          
          <div
            className={[
              "absolute left-0 right-0 top-full z-10 mt-2 hidden group-open:block",
              "rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden",
              "p-1",
              collapsibleContentClassName, 
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="max-h-[40vh] overflow-y-auto rounded-xl scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              <RouteEntriesCatalog
                entries={entries}
                hideHeader
                title={headerTitle}
                className={["!p-2", className].filter(Boolean).join(" ")}
                onRemoveEntry={onRemoveEntry}
                showLocateButton={showLocateButton}
              />
            </div>
          </div>
        </details>
      </div>
    );
  }

  return list;
}
