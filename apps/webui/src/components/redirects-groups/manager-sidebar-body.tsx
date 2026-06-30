'use client';

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GroupTree } from "@/components/ui/sidebar";
import type { RedirectGroup } from "@/composables/redirects-groups/model";

export type ManagerSidebarBodyProps = {
  rootGroup: RedirectGroup;
  slotsKey: string;
  selectedGroupId: string | null;
  editingGroupId: string | null;
  editingName: string;
  onAddGroup: (parentId: string) => void;
  onSelectGroup: (groupId: string) => void;
  onBeginRename: (groupId: string) => void;
  onEditingNameChange: (name: string) => void;
  onCommitRename: (groupId: string) => void;
  onCancelRename: () => void;
  onRemoveGroup: (groupId: string) => void;
};

export function ManagerSidebarBody({
  rootGroup,
  slotsKey,
  selectedGroupId,
  editingGroupId,
  editingName,
  onAddGroup,
  onSelectGroup,
  onBeginRename,
  onEditingNameChange,
  onCommitRename,
  onCancelRename,
  onRemoveGroup,
}: ManagerSidebarBodyProps) {
  const tGroups = useTranslations("groups");
  const [groupsExpanded, setGroupsExpanded] = useState(true);

  return (
    <>
      <div className="bg-white pb-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">{tGroups("manager")}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddGroup(rootGroup.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2">
                <path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {tGroups("addGroup")}
            </button>

            {rootGroup.children.length > 0 ? (
              <button
                type="button"
                onClick={() => setGroupsExpanded((value) => !value)}
                className="hidden lg:inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                title={groupsExpanded ? tGroups("collapseAll") : tGroups("expandAll")}
                aria-label={groupsExpanded ? tGroups("collapseAll") : tGroups("expandAll")}
              >
                <svg
                  className={"h-4 w-4 text-slate-500 transition-transform " + (groupsExpanded ? "rotate-180" : "")}
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

      <div
        className="min-h-0 overflow-y-visible pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent lg:overflow-y-auto lg:max-h-[20vh]"
        style={{ scrollbarGutter: "stable" }}
      >
        <button
          type="button"
          onClick={() => onSelectGroup(rootGroup.id)}
          className={
            "mt-3 flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left " +
            (selectedGroupId === rootGroup.id
              ? "border-slate-300 bg-white text-slate-900"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white")
          }
          title={tGroups("rootTitle")}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
              <path
                d="M3 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="truncate text-sm font-medium">{tGroups("root")}</span>
          </span>
          <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500">
            {slotsKey}
          </span>
        </button>

        {rootGroup.children.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{tGroups("empty")}</p>
        ) : (
          <div className={"mt-4 " + (groupsExpanded ? "" : "lg:hidden")}>
            <GroupTree
              groups={rootGroup.children}
              selectedGroupId={selectedGroupId}
              editingGroupId={editingGroupId}
              editingName={editingName}
              onSelectGroup={onSelectGroup}
              onAddChildGroup={onAddGroup}
              onBeginRenameGroup={onBeginRename}
              onEditingNameChange={onEditingNameChange}
              onCommitRenameGroup={onCommitRename}
              onCancelRename={onCancelRename}
              onRemoveGroup={onRemoveGroup}
            />
          </div>
        )}
      </div>
    </>
  );
}
