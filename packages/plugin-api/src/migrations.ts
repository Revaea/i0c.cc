import type { Awaitable, JsonObject } from "./types"

export interface PluginMigrationStatus {
  currentVersion: string | null
  targetVersion: string
  pending: number
}

export interface PluginMigrationAction {
  id: string
  description: string
  destructive: boolean
  details?: JsonObject
}

export interface PluginMigrationPlan {
  currentVersion: string | null
  targetVersion: string
  actions: readonly PluginMigrationAction[]
}

export interface PluginMigrationApplyInput {
  expectedCurrentVersion?: string | null
  allowDestructive?: boolean
}

export interface PluginMigrationApplyResult {
  previousVersion: string | null
  currentVersion: string
  applied: readonly string[]
}

export interface PluginMigrationProvider {
  migrationStatus(): Awaitable<PluginMigrationStatus>
  migrationPlan(): Awaitable<PluginMigrationPlan>
  applyMigrations(input?: PluginMigrationApplyInput): Awaitable<PluginMigrationApplyResult>
}

export function assertContinuousMigrationHistory(
  orderedMigrationIds: readonly string[],
  appliedMigrationIds: ReadonlySet<string>,
): void {
  const knownMigrationIds = new Set(orderedMigrationIds)
  if (knownMigrationIds.size !== orderedMigrationIds.length) {
    throw new Error("Local migration IDs must be unique")
  }

  for (const appliedId of appliedMigrationIds) {
    if (!knownMigrationIds.has(appliedId)) {
      throw new Error(`Database contains an unknown applied migration: ${appliedId}`)
    }
  }

  let foundPendingMigration = false
  for (const migrationId of orderedMigrationIds) {
    if (!appliedMigrationIds.has(migrationId)) {
      foundPendingMigration = true
      continue
    }
    if (foundPendingMigration) {
      throw new Error(
        `Applied migration history is not a continuous prefix: ${migrationId}`,
      )
    }
  }
}
