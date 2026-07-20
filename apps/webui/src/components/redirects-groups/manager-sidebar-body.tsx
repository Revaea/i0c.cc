'use client';

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { GroupTree } from "@/components/ui/sidebar";
import { sidebarItemClassName } from "@/components/ui/sidebar-item";
import type { RedirectGroup } from "@/composables/redirects-groups/model";

export type ManagerSidebarBodyProps = {
  rootGroup: RedirectGroup;
  slotsKey: string;
  selectedGroupId: string | null;
  editingGroupId: string | null;
  editingName: string;
  isReadOnly: boolean;
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
  isReadOnly,
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
      <div className="shrink-0 pb-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {tGroups("manager")}
          </h2>
          <div className="flex items-center gap-2">
            {isReadOnly ? null : (
              <Button
                onClick={() => onAddGroup(rootGroup.id)}
                size="sm"
                variant="secondary"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2">
                  <path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {tGroups("addGroup")}
              </Button>
            )}

            {rootGroup.children.length > 0 ? (
              <Button
                onClick={() => setGroupsExpanded((value) => !value)}
                size="icon-sm"
                variant="ghost"
                title={groupsExpanded ? tGroups("collapseAll") : tGroups("expandAll")}
                aria-label={groupsExpanded ? tGroups("collapseAll") : tGroups("expandAll")}
              >
                <svg
                  className={"h-4 w-4 text-muted transition-transform " + (groupsExpanded ? "rotate-180" : "")}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className="min-h-0 overflow-y-visible pr-1 scrollbar-thin scrollbar-thumb-line-strong scrollbar-track-transparent"
        style={{ scrollbarGutter: "stable" }}
      >
        <button
          type="button"
          data-navigation-close="true"
          onClick={() => onSelectGroup(rootGroup.id)}
          className={sidebarItemClassName({
            className: "mt-2 justify-between",
            isSelected: selectedGroupId === rootGroup.id,
          })}
          title={tGroups("rootTitle")}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-muted" stroke="currentColor" strokeWidth="2">
              <path
                d="M3 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="truncate text-sm font-medium">{tGroups("root")}</span>
          </span>
          <span className="shrink-0 text-xs text-muted">
            {slotsKey}
          </span>
        </button>

        {rootGroup.children.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{tGroups("empty")}</p>
        ) : (
          <div className={"mt-4 " + (groupsExpanded ? "" : "hidden")}>
            <GroupTree
              groups={rootGroup.children}
              selectedGroupId={selectedGroupId}
              editingGroupId={editingGroupId}
              editingName={editingName}
              isReadOnly={isReadOnly}
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
