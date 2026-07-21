'use client';

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/controls/button";
import { sidebarItemClassName } from "@/components/ui/layout/sidebar-item";
import type { RedirectGroup } from "@/composables/redirects-groups/model";

export type SidebarProps = {
  title?: string;
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
};

export function Sidebar({ title, className, children, footer, scroll = true }: SidebarProps) {
  return (
    <aside className={"w-full shrink-0 sm:max-w-sm " + (className ?? "")}>
      <div className="flex min-h-0 flex-col gap-4">
        <div className="flex min-h-0 flex-col border-b border-line pb-5">
          {title ? <h2 className="text-sm font-semibold text-ink">{title}</h2> : null}
          {scroll ? (
            <div className={(title ? "mt-4 " : "") + "min-h-0 overflow-y-auto pr-1 max-h-[30vh]"}>{children}</div>
          ) : (
            <div className={(title ? "mt-4 " : "") + "min-h-0"}>{children}</div>
          )}
        </div>

        {footer ? <div className="shrink-0">{footer}</div> : null}
      </div>
    </aside>
  );
}

export type GroupTreeProps = {
  groups: RedirectGroup[];
  collapsed?: boolean;
  selectedGroupId: string | null;
  editingGroupId: string | null;
  editingName: string;
  isReadOnly: boolean;
  onSelectGroup: (groupId: string) => void;
  onAddChildGroup: (parentId: string) => void;
  onBeginRenameGroup: (groupId: string) => void;
  onEditingNameChange: (value: string) => void;
  onCommitRenameGroup: (groupId: string) => void;
  onCancelRename: () => void;
  onRemoveGroup: (groupId: string) => void;
};

const MAX_GROUP_DEPTH = 5;

export function GroupTree({
  groups,
  collapsed,
  selectedGroupId,
  editingGroupId,
  editingName,
  isReadOnly,
  onSelectGroup,
  onAddChildGroup,
  onBeginRenameGroup,
  onEditingNameChange,
  onCommitRenameGroup,
  onCancelRename,
  onRemoveGroup,
}: GroupTreeProps) {
  const t = useTranslations("groups");

  const render = (items: RedirectGroup[], depth: number): ReactNode =>
    items.map((group) => {
      const selected = group.id === selectedGroupId;
      const isEditing = !isReadOnly && group.id === editingGroupId;
      const label = group.name.trim() || t("unnamed");
      const canNest = depth < MAX_GROUP_DEPTH - 1;

      return (
        <li key={group.id} className="space-y-2">
          <div
            className={sidebarItemClassName({
              className: "justify-between",
              isSelected: selected,
            })}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            <button
              type="button"
              data-navigation-close="true"
              onClick={() => onSelectGroup(group.id)}
              className="min-w-0 flex-1 rounded-lg text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              title={label}
            >
              <span className="flex min-w-0 items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4 shrink-0 text-muted"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M3 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {isEditing ? (
                  <input
                    value={editingName}
                    onChange={(event) => onEditingNameChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        onCommitRenameGroup(group.id);
                      }
                      if (event.key === "Escape") {
                        onCancelRename();
                      }
                    }}
                    onBlur={() => onCommitRenameGroup(group.id)}
                    autoFocus
                    className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
                  />
                ) : (
                  <span className="block min-w-0 flex-1 truncate">{label}</span>
                )}
              </span>
            </button>

            {isReadOnly ? null : (
              <div className="flex gap-1">
                <Button
                  onClick={() => onAddChildGroup(group.id)}
                  disabled={!canNest}
                  size="icon-sm"
                  variant="ghost"
                  className={canNest ? "" : "cursor-not-allowed"}
                  title={canNest ? t("addChild") : t("maxDepthHint", { count: MAX_GROUP_DEPTH })}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2">
                    <path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
                <Button
                  onClick={() => onBeginRenameGroup(group.id)}
                  size="icon-sm"
                  variant="ghost"
                  title={t("rename")}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
                <Button
                  onClick={() => onRemoveGroup(group.id)}
                  size="icon-sm"
                  variant="danger"
                  title={t("delete")}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
              </div>
            )}
          </div>

          {!collapsed && canNest && group.children.length > 0 ? <ul>{render(group.children, depth + 1)}</ul> : null}
        </li>
      );
    });

  return <ul className="space-y-2">{render(groups, 0)}</ul>;
}
