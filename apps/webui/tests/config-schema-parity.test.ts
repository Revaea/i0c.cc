import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

import { defaultDataConfig, validateDataConfig } from "@i0c/config"
import Ajv2020, { type AnySchema } from "ajv/dist/2020.js"
import addFormats from "ajv-formats"

const schemaPath = path.resolve(process.cwd(), "../../packages/config/config.schema.json")
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8")) as AnySchema
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
const validateSchema = ajv.compile(schema)

const invalidCases = [
  {
    name: "canonical origin credentials",
    config: {
      ...defaultDataConfig,
      runtime: {
        ...defaultDataConfig.runtime,
        canonicalOrigin: "https://user@example.com",
      },
    },
  },
  {
    name: "empty hostname label",
    config: {
      ...defaultDataConfig,
      analytics: {
        ...defaultDataConfig.analytics,
        sourceId: "api..i0c.cc",
      },
    },
  },
  {
    name: "hostname label beginning with a hyphen",
    config: {
      ...defaultDataConfig,
      analytics: {
        ...defaultDataConfig.analytics,
        sourceId: "-api.i0c.cc",
      },
    },
  },
  {
    name: "hostname label longer than 63 characters",
    config: {
      ...defaultDataConfig,
      analytics: {
        ...defaultDataConfig.analytics,
        sourceId: `${"a".repeat(64)}.i0c.cc`,
      },
    },
  },
] as const

test("accepts the default data config in both validators", () => {
  assert.equal(validateSchema(defaultDataConfig), true)
  assert.equal(validateDataConfig(defaultDataConfig).status, "valid")
})

for (const invalidCase of invalidCases) {
  test(`rejects ${invalidCase.name} in both validators`, () => {
    assert.equal(validateSchema(invalidCase.config), false)
    assert.equal(validateDataConfig(invalidCase.config).status, "invalid")
  })
}
