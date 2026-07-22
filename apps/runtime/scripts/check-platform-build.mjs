import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const runtimeRoot = path.resolve(import.meta.dirname, "..")
const platform = process.argv[2]
const expectedEntries = {
  cloudflare: "platforms/cloudflare.js",
  netlify: "platforms/netlify-edge.js",
  vercel: "api/index.js",
}
const expectedEntry = expectedEntries[platform]

if (!expectedEntry) {
  throw new Error(`Unknown Runtime platform ${platform ?? ""}`)
}

const distRoot = path.join(runtimeRoot, "dist")
const javaScriptEntries = collectJavaScriptEntries(distRoot)
  .filter((entry) => !entry.startsWith("netlify/"))

if (javaScriptEntries.length !== 1 || javaScriptEntries[0] !== expectedEntry) {
  throw new Error(
    `Expected only ${expectedEntry}, found ${javaScriptEntries.join(", ") || "no JavaScript output"}`,
  )
}

const source = fs.readFileSync(path.join(distRoot, expectedEntry), "utf8")
const forbiddenMarkers = [
  "from \"postgres\"",
  "from 'postgres'",
  "react-dom",
  "next/server",
]
if (platform !== "vercel") {
  forbiddenMarkers.push("@vercel/functions")
}

for (const marker of forbiddenMarkers) {
  if (source.includes(marker)) {
    throw new Error(`${expectedEntry} contains forbidden dependency marker ${marker}`)
  }
}

console.log(`${platform} Runtime build contains only ${expectedEntry}`)

function collectJavaScriptEntries(directory) {
  if (!fs.existsSync(directory)) {
    return []
  }
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      return collectJavaScriptEntries(entryPath)
    }
    return entry.name.endsWith(".js")
      ? [path.relative(distRoot, entryPath).replaceAll(path.sep, "/")]
      : []
  })
}
