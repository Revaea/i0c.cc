import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import Ajv from "ajv"
import addFormats from "ajv-formats"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, "../../..")
const defaultSchemaPath = path.join(repoRoot, "apps/runtime/redirects.schema.json")
const defaultSource = "origin/data:redirects.json"
const userArgs = process.argv.slice(2).filter((arg) => arg !== "--")

function printHelp() {
  console.log(`Usage: pnpm validate:redirects [source] [--source <source>] [--schema <schema>]

Sources can be local JSON files or git object refs such as origin/data:redirects.json.

Examples:
  pnpm validate:redirects
  pnpm validate:redirects -- --source origin/data:redirects.json
  pnpm validate:redirects -- ./redirects.json
`)
}

function readArg(name) {
  const prefix = `--${name}=`
  const inlineArg = userArgs.find((item) => item.startsWith(prefix))

  if (inlineArg) {
    return inlineArg.slice(prefix.length)
  }

  const separateArgIndex = userArgs.indexOf(`--${name}`)
  if (separateArgIndex >= 0) {
    return userArgs[separateArgIndex + 1]
  }

  return undefined
}

function readSource(source) {
  const resolved = path.resolve(process.cwd(), source)

  if (fs.existsSync(resolved)) {
    return {
      label: resolved,
      content: readJsonFile(resolved, "redirect config"),
    }
  }

  if (source.includes(":")) {
    try {
      return {
        label: source,
        content: execFileSync("git", ["show", source], {
          cwd: repoRoot,
          encoding: "utf8",
        }),
      }
    } catch (error) {
      throw new Error(`Failed to read redirect config from git ref ${source}: ${error.message}`, {
        cause: error,
      })
    }
  }

  throw new Error(`Redirect config source not found: ${source}`)
}

function readJsonFile(filePath, label) {
  try {
    return fs.readFileSync(filePath, "utf8")
  } catch (error) {
    throw new Error(`Failed to read ${label}: ${error.message}`, { cause: error })
  }
}

function parseJson(content, label) {
  try {
    return JSON.parse(content)
  } catch (error) {
    throw new Error(`Failed to parse ${label} as JSON: ${error.message}`, { cause: error })
  }
}

function formatErrors(errors) {
  return errors
    .slice(0, 8)
    .map((error) => {
      const location = error.instancePath || "/"
      const message = error.message ?? "failed validation"
      return `- ${location} ${message}`
    })
    .join("\n")
}

function isPositionalSourceArg(arg, index) {
  return !arg.startsWith("--") && userArgs[index - 1] !== "--source" && userArgs[index - 1] !== "--schema"
}

const source =
  readArg("source") ??
  userArgs.find((arg, index) => isPositionalSourceArg(arg, index)) ??
  defaultSource

function main() {
  if (userArgs.includes("--help") || userArgs.includes("-h")) {
    printHelp()
    return
  }

  const schemaPath = path.resolve(process.cwd(), readArg("schema") ?? defaultSchemaPath)
  const schema = parseJson(readJsonFile(schemaPath, "schema"), schemaPath)
  const input = readSource(source)
  const data = parseJson(input.content, input.label)
  const ajv = new Ajv({ allErrors: true, strict: false })

  addFormats(ajv)

  const validate = ajv.compile(schema)
  const ok = validate(data)

  if (!ok) {
    const errors = validate.errors ?? []
    console.error(`Redirect config failed schema validation: ${input.label}`)
    console.error(formatErrors(errors))

    if (errors.length > 8) {
      console.error(`... and ${errors.length - 8} more`)
    }

    process.exitCode = 1
  } else {
    console.log(`Redirect config schema validation passed: ${input.label}`)
  }
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
