import type { JsonObject, JsonValue } from "./types"

export interface JsonSchemaIssue {
  path: string
  message: string
}

export function validateJsonSchema(
  schema: JsonObject,
  value: unknown,
  path = "",
): JsonSchemaIssue[] {
  const issues: JsonSchemaIssue[] = []
  validateNode(schema, value, path || "/", issues)
  return issues
}

export function validateJsonSchemaDefinition(
  schema: unknown,
  path = "/",
): JsonSchemaIssue[] {
  const issues: JsonSchemaIssue[] = []
  if (!isRecord(schema)) {
    return [{ path, message: "must be a schema object" }]
  }
  validateSchemaNode(schema as JsonObject, path, issues, new Set())
  return issues
}

const supportedTypes = new Set([
  "array",
  "boolean",
  "integer",
  "number",
  "object",
  "string",
])
const supportedKeywords = new Set([
  "additionalProperties",
  "const",
  "enum",
  "format",
  "items",
  "maximum",
  "minimum",
  "minLength",
  "pattern",
  "properties",
  "required",
  "type",
  "uniqueItems",
])

function validateSchemaNode(
  schema: JsonObject,
  path: string,
  issues: JsonSchemaIssue[],
  ancestors: Set<object>,
): void {
  if (ancestors.has(schema)) {
    issues.push({ path, message: "must not contain circular references" })
    return
  }
  ancestors.add(schema)

  for (const keyword of Object.keys(schema)) {
    if (!supportedKeywords.has(keyword)) {
      issues.push({
        path: childPath(path, keyword),
        message: "is not supported by the plugin schema subset",
      })
    }
  }

  const type = schema.type
  if (type !== undefined && (
    typeof type !== "string" || !supportedTypes.has(type)
  )) {
    issues.push({ path: childPath(path, "type"), message: "is not supported" })
  }

  if (schema.enum !== undefined && !Array.isArray(schema.enum)) {
    issues.push({ path: childPath(path, "enum"), message: "must be an array" })
  } else if (Array.isArray(schema.enum)) {
    if (schema.enum.length === 0) {
      issues.push({ path: childPath(path, "enum"), message: "must not be empty" })
    }
    const invalidValueIndex = schema.enum.findIndex((value) => !isJsonValue(value))
    if (invalidValueIndex >= 0) {
      issues.push({
        path: childPath(childPath(path, "enum"), String(invalidValueIndex)),
        message: "must be a JSON value",
      })
    }
    const values = schema.enum
      .filter((value) => isJsonValue(value))
      .map(toCanonicalJsonString)
    if (new Set(values).size !== values.length) {
      issues.push({ path: childPath(path, "enum"), message: "must contain unique values" })
    }
  }

  if (schema.const !== undefined && !isJsonValue(schema.const)) {
    issues.push({ path: childPath(path, "const"), message: "must be a JSON value" })
  }

  if (schema.properties !== undefined) {
    if (!isRecord(schema.properties)) {
      issues.push({
        path: childPath(path, "properties"),
        message: "must be an object",
      })
    } else {
      for (const [key, propertySchema] of Object.entries(schema.properties)) {
        if (!isRecord(propertySchema)) {
          issues.push({
            path: childPath(childPath(path, "properties"), key),
            message: "must be a schema object",
          })
          continue
        }
        validateSchemaNode(
          propertySchema as JsonObject,
          childPath(childPath(path, "properties"), key),
          issues,
          ancestors,
        )
      }
    }
  }

  if (
    schema.required !== undefined
    && (
      !Array.isArray(schema.required)
      || schema.required.some((item) => typeof item !== "string")
    )
  ) {
    issues.push({
      path: childPath(path, "required"),
      message: "must be a string array",
    })
  } else if (
    Array.isArray(schema.required)
    && new Set(schema.required).size !== schema.required.length
  ) {
    issues.push({
      path: childPath(path, "required"),
      message: "must contain unique property names",
    })
  }

  if (
    schema.additionalProperties !== undefined
    && typeof schema.additionalProperties !== "boolean"
  ) {
    issues.push({
      path: childPath(path, "additionalProperties"),
      message: "must be a boolean",
    })
  }

  if (schema.items !== undefined) {
    if (!isRecord(schema.items)) {
      issues.push({ path: childPath(path, "items"), message: "must be a schema object" })
    } else {
      validateSchemaNode(
        schema.items as JsonObject,
        childPath(path, "items"),
        issues,
        ancestors,
      )
    }
  }

  if (schema.pattern !== undefined) {
    if (typeof schema.pattern !== "string") {
      issues.push({ path: childPath(path, "pattern"), message: "must be a string" })
    } else {
      try {
        new RegExp(schema.pattern)
      } catch {
        issues.push({
          path: childPath(path, "pattern"),
          message: "must be a valid regular expression",
        })
      }
    }
  }

  if (schema.format !== undefined && schema.format !== "uri") {
    issues.push({ path: childPath(path, "format"), message: "must be uri" })
  }

  validateNonNegativeIntegerKeyword(schema, "minLength", path, issues)
  validateFiniteNumberKeyword(schema, "minimum", path, issues)
  validateFiniteNumberKeyword(schema, "maximum", path, issues)

  if (
    typeof schema.minimum === "number"
    && typeof schema.maximum === "number"
    && schema.minimum > schema.maximum
  ) {
    issues.push({
      path: childPath(path, "maximum"),
      message: "must be greater than or equal to minimum",
    })
  }

  if (
    schema.uniqueItems !== undefined
    && typeof schema.uniqueItems !== "boolean"
  ) {
    issues.push({
      path: childPath(path, "uniqueItems"),
      message: "must be a boolean",
    })
  }

  validateKeywordTypeCompatibility(schema, path, issues)
  ancestors.delete(schema)
}

function isJsonValue(value: unknown, ancestors = new Set<object>()): boolean {
  if (
    value === null
    || typeof value === "boolean"
    || typeof value === "string"
  ) {
    return true
  }
  if (typeof value === "number") {
    return Number.isFinite(value)
  }
  if (typeof value !== "object") {
    return false
  }
  if (ancestors.has(value)) {
    return false
  }

  ancestors.add(value)
  const isValid = Array.isArray(value)
    ? value.every((item) => isJsonValue(item, ancestors))
    : isRecord(value)
      && Object.values(value).every((item) => isJsonValue(item, ancestors))
  ancestors.delete(value)
  return isValid
}

function toCanonicalJsonString(value: unknown): string {
  return JSON.stringify(toCanonicalJsonValue(value))
}

function toCanonicalJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toCanonicalJsonValue)
  }
  if (!isRecord(value)) {
    return value
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, toCanonicalJsonValue(value[key])]),
  )
}

function validateNonNegativeIntegerKeyword(
  schema: JsonObject,
  keyword: "minLength",
  path: string,
  issues: JsonSchemaIssue[],
): void {
  const value = schema[keyword]
  if (
    value !== undefined
    && (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
  ) {
    issues.push({
      path: childPath(path, keyword),
      message: "must be a non-negative integer",
    })
  }
}

function validateFiniteNumberKeyword(
  schema: JsonObject,
  keyword: "maximum" | "minimum",
  path: string,
  issues: JsonSchemaIssue[],
): void {
  const value = schema[keyword]
  if (
    value !== undefined
    && (typeof value !== "number" || !Number.isFinite(value))
  ) {
    issues.push({
      path: childPath(path, keyword),
      message: "must be a finite number",
    })
  }
}

function validateKeywordTypeCompatibility(
  schema: JsonObject,
  path: string,
  issues: JsonSchemaIssue[],
): void {
  const keywordGroups = [
    {
      keywords: ["additionalProperties", "properties", "required"],
      type: "object",
    },
    {
      keywords: ["items", "uniqueItems"],
      type: "array",
    },
    {
      keywords: ["format", "minLength", "pattern"],
      type: "string",
    },
    {
      keywords: ["maximum", "minimum"],
      types: ["integer", "number"],
    },
  ] as const

  for (const group of keywordGroups) {
    const usedKeyword = group.keywords.find((keyword) => keyword in schema)
    if (!usedKeyword) {
      continue
    }
    const allowedTypes = "types" in group ? group.types : [group.type]
    if (!allowedTypes.some((type) => schema.type === type)) {
      issues.push({
        path: childPath(path, usedKeyword),
        message: `requires schema type ${allowedTypes.join(" or ")}`,
      })
    }
  }
}

function validateNode(
  schema: JsonObject,
  value: unknown,
  path: string,
  issues: JsonSchemaIssue[],
): void {
  if ("const" in schema && !isJsonEqual(value, schema.const)) {
    issues.push({ path, message: `must equal ${JSON.stringify(schema.const)}` })
    return
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((item) => isJsonEqual(value, item))) {
    issues.push({ path, message: "must match one of the allowed values" })
    return
  }

  const type = schema.type
  if (typeof type === "string" && !matchesType(type, value)) {
    issues.push({ path, message: `must be ${type}` })
    return
  }

  if (type === "object" && isRecord(value)) {
    validateObject(schema, value, path, issues)
  } else if (type === "array" && Array.isArray(value)) {
    validateArray(schema, value, path, issues)
  } else if (type === "string" && typeof value === "string") {
    validateString(schema, value, path, issues)
  } else if (
    (type === "integer" || type === "number")
    && typeof value === "number"
  ) {
    validateNumber(schema, value, path, issues)
  }
}

function validateObject(
  schema: JsonObject,
  value: Record<string, unknown>,
  path: string,
  issues: JsonSchemaIssue[],
): void {
  const properties = isRecord(schema.properties) ? schema.properties : {}
  const required = Array.isArray(schema.required)
    ? schema.required.filter((item): item is string => typeof item === "string")
    : []
  for (const key of required) {
    if (!(key in value)) {
      issues.push({ path: childPath(path, key), message: "is required" })
    }
  }
  for (const [key, candidate] of Object.entries(value)) {
    const propertySchema = properties[key]
    if (isRecord(propertySchema)) {
      validateNode(propertySchema as JsonObject, candidate, childPath(path, key), issues)
    } else if (schema.additionalProperties === false) {
      issues.push({ path: childPath(path, key), message: "is not allowed" })
    }
  }
}

function validateArray(
  schema: JsonObject,
  value: unknown[],
  path: string,
  issues: JsonSchemaIssue[],
): void {
  if (schema.uniqueItems === true) {
    const encoded = value.flatMap((item, index) => {
      if (!isJsonValue(item)) {
        issues.push({
          path: childPath(path, String(index)),
          message: "must be a JSON value",
        })
        return []
      }
      return [toCanonicalJsonString(item)]
    })
    if (new Set(encoded).size !== encoded.length) {
      issues.push({ path, message: "must contain unique items" })
    }
  }
  if (isRecord(schema.items)) {
    value.forEach((item, index) => {
      validateNode(schema.items as JsonObject, item, childPath(path, String(index)), issues)
    })
  }
}

function validateString(
  schema: JsonObject,
  value: string,
  path: string,
  issues: JsonSchemaIssue[],
): void {
  if (typeof schema.minLength === "number" && value.length < schema.minLength) {
    issues.push({ path, message: `must contain at least ${schema.minLength} characters` })
  }
  if (typeof schema.pattern === "string") {
    try {
      if (!new RegExp(schema.pattern).test(value)) {
        issues.push({ path, message: `must match ${schema.pattern}` })
      }
    } catch {
      issues.push({ path, message: "contains an invalid schema pattern" })
    }
  }
  if (schema.format === "uri") {
    try {
      new URL(value)
    } catch {
      issues.push({ path, message: "must be a valid URI" })
    }
  }
}

function validateNumber(
  schema: JsonObject,
  value: number,
  path: string,
  issues: JsonSchemaIssue[],
): void {
  if (typeof schema.minimum === "number" && value < schema.minimum) {
    issues.push({ path, message: `must be at least ${schema.minimum}` })
  }
  if (typeof schema.maximum === "number" && value > schema.maximum) {
    issues.push({ path, message: `must be at most ${schema.maximum}` })
  }
}

function matchesType(type: string, value: unknown): boolean {
  switch (type) {
    case "array":
      return Array.isArray(value)
    case "boolean":
      return typeof value === "boolean"
    case "integer":
      return typeof value === "number" && Number.isSafeInteger(value)
    case "number":
      return typeof value === "number" && Number.isFinite(value)
    case "object":
      return isRecord(value)
    case "string":
      return typeof value === "string"
    default:
      return false
  }
}

function isJsonEqual(left: unknown, right: JsonValue | undefined): boolean {
  return isJsonValue(left)
    && toCanonicalJsonString(left) === toCanonicalJsonString(right)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function childPath(path: string, key: string): string {
  const escaped = key.replaceAll("~", "~0").replaceAll("/", "~1")
  return path === "/" ? `/${escaped}` : `${path}/${escaped}`
}
