'use client';

import { validateDataConfig } from "@i0c/config";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { AppShell } from "@/components/ui/layout/app-shell";
import { AppSectionNavigationHeader } from "@/components/ui/layout/app-section-navigation";
import { ContentSkeleton, SidebarSkeletonBody, SidebarSkeletonCatalog, SidebarSkeletonFooter } from "@/components/ui/feedback/skeletons";
import { GroupEntriesEditor } from "@/components/editor/group-entries-editor";
import { JsonEditor } from "@/components/editor/json-editor";
import { RightPanel, type EditorMode } from "@/components/editor/right-panel";
import { useRedirectsGroups } from "@/composables/redirects-groups";
import { useDataConfigFile } from "@/composables/data-config/use-data-config-file";
import { RouteEntriesCatalog } from "@/components/redirects-groups/manager-sidebar/manager-sidebar-catalog";
import { RuntimeSettingsProvider } from "@/components/redirects-groups/runtime-settings-context";

import { ManagerSidebarBody } from "./manager-sidebar/manager-sidebar-body";
import { ManagerSidebarFooter } from "./manager-sidebar/manager-sidebar-footer";

interface RedirectsGroupsManagerProps {
  isReadOnly?: boolean;
}

export function RedirectsGroupsManager({ isReadOnly = false }: RedirectsGroupsManagerProps) {
  const tGroups = useTranslations("groups");
  const tEntries = useTranslations("entries");
  const tEditor = useTranslations("editor");
  const tConfig = useTranslations("instanceConfig");

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
    canonicalOrigin,
    save,
    applyJson,
    previewJson,
    resultMessage,
    lastCommitUrl
  } = useRedirectsGroups();

  const [editorMode, setEditorMode] = useState<EditorMode>("rules");
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [configDraft, setConfigDraft] = useState("");
  const [configError, setConfigError] = useState<string | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const dataConfigFile = useDataConfigFile({
    fallbackLoadErrorText: tConfig("loadFail"),
    fallbackSaveErrorText: tConfig("saveFail"),
    saveOkText: tConfig("saveOk"),
  });

  const enterRulesMode = useCallback(() => {
    setEditorMode("rules");
    setJsonError(null);
  }, []);

  const enterJsonMode = useCallback(() => {
    setEditorMode("json");
    setJsonDraft(previewJson);
    setJsonError(null);
  }, [previewJson]);

  const enterConfigMode = useCallback(() => {
    setEditorMode("config");
    setJsonError(null);
    if (configDraft || isConfigLoading) {
      return;
    }

    setIsConfigLoading(true);
    setConfigError(null);
    void dataConfigFile.load()
      .then((content) => {
        setConfigDraft(content);
      })
      .catch((error: unknown) => {
        setConfigError(error instanceof Error ? error.message : tConfig("loadFail"));
      })
      .finally(() => {
        setIsConfigLoading(false);
      });
  }, [configDraft, dataConfigFile, isConfigLoading, tConfig]);

  const handleSave = useCallback(async () => {
    if (isReadOnly) {
      return;
    }

    if (editorMode === "config") {
      try {
        const parsed = JSON.parse(configDraft) as unknown;
        const validation = validateDataConfig(parsed);
        if (validation.status === "invalid") {
          const details = validation.issues
            .slice(0, 5)
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("; ");
          throw new Error(tConfig("validationFail", { details }));
        }
        const normalized = JSON.stringify(parsed, null, 2);
        setConfigDraft(normalized);
        setConfigError(null);
        dataConfigFile.save(normalized);
      } catch (error) {
        setConfigError(error instanceof Error ? error.message : tEditor("jsonParseFail"));
      }
      return;
    }

    if (editorMode === "json") {
      try {
        const normalized = JSON.stringify(JSON.parse(jsonDraft), null, 2);
        setJsonError(null);
        const hydrated = await applyJson(normalized);
        setJsonDraft(hydrated);
        save(hydrated);
      } catch (error) {
        setJsonError(error instanceof Error ? error.message : tEditor("jsonParseFail"));
      }
      return;
    }

    save();
  }, [applyJson, configDraft, dataConfigFile, editorMode, isReadOnly, jsonDraft, save, tConfig, tEditor]);

  const handleSelectGroup = useCallback(
    (groupId: string) => {
      selectGroup(groupId);
    },
    [selectGroup]
  );

  if (isLoading) {
    return (
      <AppShell
        navigation={
          <div>
            <AppSectionNavigationHeader />
            <div className="space-y-5 p-5 sm:p-6">
              <div className="border-b border-line pb-5">
                <SidebarSkeletonBody />
              </div>
              <div className="border-b border-line pb-5">
                <SidebarSkeletonCatalog />
              </div>
              {isReadOnly ? null : (
                <div>
                  <SidebarSkeletonFooter />
                </div>
              )}
            </div>
          </div>
        }
      >
        <main data-layout-region="content" className="mx-auto w-full max-w-[var(--app-content-max-width)] px-5 py-7 sm:px-8 sm:py-10 lg:px-10">
          <ContentSkeleton />
        </main>
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell
        navigation={
          <div>
            <AppSectionNavigationHeader />
            <div className="space-y-5 p-5 sm:p-6">
              <div className="border-b border-line pb-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {tGroups("group")}
                </h2>
                <div className="mt-3 text-sm text-muted">{tGroups("cannotLoad")}</div>
              </div>
            </div>
          </div>
        }
      >
        <main data-layout-region="content" className="mx-auto w-full max-w-[var(--app-content-max-width)] px-5 py-7 sm:px-8 sm:py-10 lg:px-10">
          <div className="border-l-2 border-rose-400 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        </main>
      </AppShell>
    );
  }

  const sidebarFooterNode = isReadOnly ? (
    <div className="border-l-2 border-line-strong px-3 py-1">
      <p className="text-sm font-semibold text-ink">{tGroups("readOnlyTitle")}</p>
      <p className="mt-1 text-xs leading-5 text-muted">
        {tGroups("readOnlyDescription")}
      </p>
    </div>
  ) : (
    <div className="flex flex-col">
      <ManagerSidebarFooter
        canUndo={canUndo}
        canRedo={canRedo}
        isPending={editorMode === "config" ? dataConfigFile.isPending : isPending}
        onUndo={undo}
        onRedo={redo}
        onSave={handleSave}
        configUrl={configSourceUrl}
        onLoadConfigUrl={loadFromUrl}
        resultMessage={editorMode === "config" ? dataConfigFile.resultMessage : resultMessage}
        lastCommitUrl={editorMode === "config" ? dataConfigFile.lastCommitUrl : lastCommitUrl}
        showRedirectTools={editorMode !== "config"}
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
      isReadOnly={isReadOnly}
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
      className="max-h-[38vh] border-b border-line pb-5"
      onAddRule={isReadOnly ? undefined : () => addEntry(selectedGroup.id)}
      addRuleLabel={tEntries("addRule")}
      onRemoveEntry={
        isReadOnly
          ? undefined
          : (entryId) => removeEntry(selectedGroup.id, entryId)
      }
      showLocateButton
    />
  ) : null;

  const navigationNode = (
    <div>
      <AppSectionNavigationHeader />
      <div className="space-y-5 p-5 sm:p-6">
        <div className="border-b border-line pb-5">
          {sidebarBodyNode}
        </div>
        {catalogNode}
        {sidebarFooterNode}
      </div>
    </div>
  );

  return (
    <RuntimeSettingsProvider canonicalOrigin={canonicalOrigin}>
      <AppShell navigation={navigationNode}>
        <main data-layout-region="content" className="mx-auto w-full max-w-[var(--app-content-max-width)] px-5 py-7 sm:px-8 sm:py-10 lg:px-10">
          <section className="min-w-0">
            <RightPanel
              editorMode={editorMode}
              onEnterRulesMode={enterRulesMode}
              onEnterJsonMode={enterJsonMode}
              onEnterConfigMode={enterConfigMode}
              jsonDraft={jsonDraft}
              onJsonDraftChange={setJsonDraft}
              jsonError={jsonError}
              isReadOnly={isReadOnly}
              configContent={
                isConfigLoading ? (
                  <p className="py-3 text-sm text-muted">{tConfig("loading")}</p>
                ) : (
                  <JsonEditor
                    jsonDraft={configDraft}
                    onJsonDraftChange={setConfigDraft}
                    jsonError={configError}
                    isReadOnly={isReadOnly}
                    tipText={tConfig("tip")}
                    validateJson={validateDataConfig}
                  />
                )
              }
              rulesContent={
                selectedGroup ? (
                  <GroupEntriesEditor
                    group={selectedGroup}
                    onAddEntry={addEntry}
                    onRemoveEntry={removeEntry}
                    onUpdateEntryKey={updateEntryKey}
                    onUpdateEntryValue={updateEntryValue}
                    isReadOnly={isReadOnly}
                  />
                ) : (
                  <div>
                    <h1 className="text-lg font-semibold text-ink">{tGroups("group")}</h1>
                    <p className="mt-1 text-sm text-muted">{tGroups("selectHint")}</p>
                  </div>
                )
              }
            />
          </section>
        </main>
      </AppShell>
    </RuntimeSettingsProvider>
  );
}
