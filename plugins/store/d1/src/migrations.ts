import type {
  PluginMigrationApplyInput,
  PluginMigrationApplyResult,
  PluginMigrationPlan,
  PluginMigrationProvider,
  PluginMigrationStatus,
} from "@i0c/plugin-api"

import type { D1Database } from "./d1"
import { d1All, d1Run } from "./d1"

export interface D1Migration {
  id: string
  sql: string
}

interface AppliedMigrationRow {
  id: string
}

export function createD1MigrationProvider(
  database: D1Database,
  migrations: readonly D1Migration[],
): PluginMigrationProvider {
  const ordered = [...migrations].sort((left, right) =>
    left.id.localeCompare(right.id),
  )

  return {
    async migrationStatus(): Promise<PluginMigrationStatus> {
      const applied = await readAppliedMigrations(database)
      const pending = ordered.filter((migration) => !applied.has(migration.id))
      return {
        currentVersion: resolveCurrentVersion(ordered, applied),
        targetVersion: resolveTargetVersion(ordered),
        pending: pending.length,
      }
    },
    async migrationPlan(): Promise<PluginMigrationPlan> {
      const applied = await readAppliedMigrations(database)
      return {
        currentVersion: resolveCurrentVersion(ordered, applied),
        targetVersion: resolveTargetVersion(ordered),
        actions: ordered
          .filter((migration) => !applied.has(migration.id))
          .map((migration) => ({
            id: migration.id,
            description: `Apply ${migration.id}`,
            destructive: false,
          })),
      }
    },
    async applyMigrations(
      input: PluginMigrationApplyInput = {},
    ): Promise<PluginMigrationApplyResult> {
      await ensureMigrationTable(database)
      const applied = await readAppliedMigrations(database)
      const previousVersion = resolveCurrentVersion(ordered, applied)
      if (
        input.expectedCurrentVersion !== undefined
        && input.expectedCurrentVersion !== previousVersion
      ) {
        throw new Error(
          `Expected migration version ${input.expectedCurrentVersion ?? "none"}, found ${previousVersion ?? "none"}`,
        )
      }

      const appliedNow: string[] = []
      for (const migration of ordered) {
        if (applied.has(migration.id)) {
          continue
        }

        await database.exec(migration.sql)
        await d1Run(database.prepare(`
          INSERT INTO analytics_schema_migration (id)
          VALUES (?)
        `).bind(migration.id))
        appliedNow.push(migration.id)
      }

      return {
        previousVersion,
        currentVersion: resolveTargetVersion(ordered),
        applied: appliedNow,
      }
    },
  }
}

async function readAppliedMigrations(
  database: D1Database,
): Promise<Set<string>> {
  const tables = await d1All<{ name: string }>(database.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = 'analytics_schema_migration'
  `))
  if (tables.length === 0) {
    return new Set()
  }

  const rows = await d1All<AppliedMigrationRow>(database.prepare(`
    SELECT id
    FROM analytics_schema_migration
    ORDER BY id ASC
  `))
  return new Set(rows.map((row) => row.id))
}

async function ensureMigrationTable(database: D1Database): Promise<void> {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS analytics_schema_migration (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `)
}

function resolveCurrentVersion(
  migrations: readonly D1Migration[],
  applied: ReadonlySet<string>,
): string | null {
  return [...migrations]
    .reverse()
    .find((migration) => applied.has(migration.id))
    ?.id ?? null
}

function resolveTargetVersion(migrations: readonly D1Migration[]): string {
  const target = migrations.at(-1)?.id
  if (!target) {
    throw new Error("No D1 analytics migrations were provided")
  }
  return target
}
