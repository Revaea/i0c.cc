'use client';

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { Sidebar } from "@/components/ui/sidebar";
import { ContentSkeleton, SidebarSkeletonBody, SidebarSkeletonCatalog, SidebarSkeletonFooter } from "@/components/ui/skeletons";
import { GroupEntriesEditor } from "@/components/editor/group-entries-editor";
import { RightPanel } from "@/components/editor/right-panel";
import { useRedirectsGroups } from "@/composables/redirects-groups";
import { RouteEntriesCatalog } from "@/components/redirects-groups/manager-sidebar-catalog";

import { ManagerSidebarBody } from "./manager-sidebar-body";
import { ManagerSidebarFooter } from "./manager-sidebar-footer";

export type RedirectsGroupsManagerProps = {
  mobileSidebarOpen?: boolean;
  onMobileSidebarOpenChange?: (open: boolean) => void;
};

export function RedirectsGroupsManager({
  mobileSidebarOpen,
  onMobileSidebarOpenChange,
}: RedirectsGroupsManagerProps) {
  const tGroups = useTranslations("groups");
  const tEntries = useTranslations("entries");
  const tEditor = useTranslations("editor");
  const tCommon = useTranslations("common");

  const {
    isLoading,
    loadError,
    configSourceUrl,
    loadFromUrl,
    slotsKey,
    rootGroup,
    selectedGroupId,
    selectedGroup,
    selectGroup,
    editingGroupId,
    editingName,
    setEditingName,
    beginRename,
    cancelRename,
    commitRename,
    addGroup,
    addEntry,
    removeEntry,
    updateEntryKey,
    updateEntryValue,
    removeGroup,
    canUndo,
    canRedo,
    undo,
    redo,
    isPending,
    save,
    applyJson,
    previewJson,
    resultMessage,
    lastCommitUrl
  } = useRedirectsGroups();

  const [editorMode, setEditorMode] = useState<"rules" | "json">("rules");
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const enterRulesMode = useCallback(() => {
    setEditorMode("rules");
    setJsonError(null);
  }, []);

  const enterJsonMode = useCallback(() => {
    setEditorMode("json");
    setJsonDraft(previewJson);
    setJsonError(null);
  }, [previewJson]);

  const handleSave = useCallback(() => {
    if (editorMode === "json") {
      try {
        const normalized = JSON.stringify(JSON.parse(jsonDraft), null, 2);
        setJsonError(null);
        applyJson(normalized);
        save(normalized);
      } catch (error) {
        setJsonError(error instanceof Error ? error.message : tEditor("jsonParseFail"));
      }
      return;
    }

    save();
  }, [applyJson, editorMode, jsonDraft, save, tEditor]);

  const closeMobileSidebar = useCallback(() => {
    onMobileSidebarOpenChange?.(false);
  }, [onMobileSidebarOpenChange]);

  const handleSelectGroup = useCallback(
    (groupId: string) => {
      selectGroup(groupId);
      if (mobileSidebarOpen) {
        closeMobileSidebar();
      }
    },
    [closeMobileSidebar, mobileSidebarOpen, selectGroup]
  );

  const showMobileSidebar = !!mobileSidebarOpen;

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row">
        <div className="hidden lg:block order-1 w-full sm:w-64 lg:w-80 shrink-0">
          <div className="flex min-h-0 flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
            <Sidebar>
              <SidebarSkeletonBody />
            </Sidebar>
            <div className="hidden lg:flex shrink-0 max-h-[30vh] rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <SidebarSkeletonCatalog />
            </div>
            <div className="flex shrink-0 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
              <SidebarSkeletonFooter />
            </div>
          </div>
        </div>
        <section className="order-2 min-w-0 flex-1">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <ContentSkeleton />
          </div>
        </section>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row">
        <div className="hidden lg:block order-1 w-full sm:w-64 lg:w-80 shrink-0">
          <Sidebar title={tGroups("group")}>
            <div className="text-sm text-slate-600">{tGroups("cannotLoad")}</div>
          </Sidebar>
        </div>
        <section className="order-2 min-w-0 flex-1">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{loadError}</div>
        </section>
      </div>
    );
  }

  const sidebarFooterNode = (
    <div className="flex shrink-0 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
      <ManagerSidebarFooter
        canUndo={canUndo}
        canRedo={canRedo}
        isPending={isPending}
        onUndo={undo}
        onRedo={redo}
        onSave={handleSave}
        configUrl={configSourceUrl}
        onLoadConfigUrl={loadFromUrl}
        resultMessage={resultMessage}
        lastCommitUrl={lastCommitUrl}
      />
    </div>
  );

  const sidebarBodyNode = (
    <ManagerSidebarBody
      rootGroup={rootGroup}
      slotsKey={slotsKey}
      selectedGroupId={selectedGroupId}
      editingGroupId={editingGroupId}
      editingName={editingName}
      onAddGroup={addGroup}
      onSelectGroup={handleSelectGroup}
      onBeginRename={beginRename}
      onEditingNameChange={setEditingName}
      onCommitRename={commitRename}
      onCancelRename={cancelRename}
      onRemoveGroup={removeGroup}
    />
  );

  const catalogNode = selectedGroup && selectedGroup.entries.length > 0 ? (
    <RouteEntriesCatalog
      entries={selectedGroup.entries}
      title={tEditor("entries") ?? "Entries"}
      className="hidden lg:flex shrink-0 max-h-[30vh] rounded-3xl border border-slate-200 bg-white shadow-lg"
      onAddRule={() => addEntry(selectedGroup.id)}
      addRuleLabel={tEntries("addRule")}
      onRemoveEntry={(entryId) => removeEntry(selectedGroup.id, entryId)}
      showLocateButton
    />
  ) : null;

  const mobileCatalogNode = selectedGroup && selectedGroup.entries.length > 0 ? (
    <RouteEntriesCatalog
      entries={selectedGroup.entries}
      title={tEditor("entries") ?? "Entries"}
      variant="collapsible"
      wrapperClassName="lg:hidden sticky top-20 z-30 mx-auto w-full max-w-6xl px-6"
      collapsibleContentClassName="max-h-[40vh]"
      onAddRule={() => addEntry(selectedGroup.id)}
      addRuleLabel={tEntries("addRule")}
      onRemoveEntry={(entryId) => removeEntry(selectedGroup.id, entryId)}
      showLocateButton
    />
  ) : null;

  return (
    <>
      {mobileCatalogNode}

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row">
        <div className="hidden lg:block order-1 w-full sm:w-64 lg:w-80 shrink-0">
          <div className="flex min-h-0 flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
            <Sidebar scroll={false}>
              {sidebarBodyNode}
            </Sidebar>
            {catalogNode}
            {sidebarFooterNode}
          </div>
        </div>

        {showMobileSidebar ? (
          <div className="fixed inset-0 z-40 bg-slate-50 lg:hidden">
            <div className="h-full px-6 pb-6 pt-24">
              <div
                className="mx-auto h-full max-w-6xl overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
                style={{ scrollbarGutter: "stable" }}
              >
                <div className="space-y-6 p-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                    {sidebarBodyNode}
                  </div>
                  {sidebarFooterNode}
                  <button
                    type="button"
                    onClick={closeMobileSidebar}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg hover:bg-slate-50"
                  >
                    {tCommon("close")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <section className="order-2 min-w-0 flex-1">
          <RightPanel
            editorMode={editorMode}
            onEnterRulesMode={enterRulesMode}
            onEnterJsonMode={enterJsonMode}
            jsonDraft={jsonDraft}
            onJsonDraftChange={setJsonDraft}
            jsonError={jsonError}
            rulesContent={
              selectedGroup ? (
                <GroupEntriesEditor
                  group={selectedGroup}
                  onAddEntry={addEntry}
                  onRemoveEntry={removeEntry}
                  onUpdateEntryKey={updateEntryKey}
                  onUpdateEntryValue={updateEntryValue}
                />
              ) : (
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">{tGroups("group")}</h1>
                  <p className="mt-1 text-sm text-slate-500">{tGroups("selectHint")}</p>
                </div>
              )
            }
          />
        </section>
      </div>
    </>
  );
}
