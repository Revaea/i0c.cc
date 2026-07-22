import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { validateDataConfig } from "@i0c/config"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, "../../..")
const defaultSource = "origin/data:config.json"
const userArgs = process.argv.slice(2).filter((arg) => arg !== "--")

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function readSource(source: string): { content: string; label: string } {
  const resolved = path.resolve(process.cwd(), source)
  if (fs.existsSync(resolved)) {
    return {
      content: fs.readFileSync(resolved, "utf8"),
      label: resolved,
    }
  }

  if (source.includes(":")) {
    return {
      content: execFileSync("git", ["show", source], {
        cwd: repoRoot,
        encoding: "utf8",
      }),
      label: source,
    }
  }

  throw new Error(`Instance config source not found: ${source}`)
}

function parseJson(content: string, label: string): unknown {
  try {
    return JSON.parse(content) as unknown
  } catch (error) {
    throw new Error(`Failed to parse ${label} as JSON: ${getErrorMessage(error)}`)
  }
}

function main(): void {
  const source = userArgs.at(0) ?? defaultSource
  const input = readSource(source)
  const result = validateDataConfig(parseJson(input.content, input.label))
  if (result.status === "valid") {
    console.log(`Instance config validation passed: ${input.label}`)
    return
  }

  console.error(`Instance config validation failed: ${input.label}`)
  for (const issue of result.issues.slice(0, 8)) {
    console.error(`- ${issue.path} ${issue.message}`)
  }
  if (result.issues.length > 8) {
    console.error(`... and ${result.issues.length - 8} more`)
  }
  process.exitCode = 1
}

try {
  main()
} catch (error) {
  console.error(getErrorMessage(error))
  process.exitCode = 1
}
