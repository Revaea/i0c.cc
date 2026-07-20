import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run analytics migrations");
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = join(scriptDirectory, "..", "migrations");
const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 5,
  connect_timeout: 30,
  prepare: false,
});

try {
  await sql`
    CREATE TABLE IF NOT EXISTS analytics_schema_migration (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => /^\d+.*\.sql$/.test(filename))
    .sort((left, right) => left.localeCompare(right));

  for (const filename of filenames) {
    const migration = await readFile(join(migrationsDirectory, filename), "utf8");
    const checksum = createHash("sha256").update(migration).digest("hex");
    const [applied] = await sql`
      SELECT checksum
      FROM analytics_schema_migration
      WHERE filename = ${filename}
    `;

    if (applied) {
      if (applied.checksum !== checksum) {
        throw new Error(`Applied migration has changed: ${filename}`);
      }

      console.log(`Already applied ${filename}`);
      continue;
    }

    await sql.begin(async (transaction) => {
      await transaction.unsafe(migration);
      await transaction`
        INSERT INTO analytics_schema_migration (filename, checksum)
        VALUES (${filename}, ${checksum})
      `;
    });

    console.log(`Applied ${filename}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
