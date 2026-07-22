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
