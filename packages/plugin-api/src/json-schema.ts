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
    const encoded = value.map((item) => JSON.stringify(item))
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
  if (typeof schema.pattern === "string" && !new RegExp(schema.pattern).test(value)) {
    issues.push({ path, message: `must match ${schema.pattern}` })
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
      return true
  }
}

function isJsonEqual(left: unknown, right: JsonValue | undefined): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function childPath(path: string, key: string): string {
  const escaped = key.replaceAll("~", "~0").replaceAll("/", "~1")
  return path === "/" ? `/${escaped}` : `${path}/${escaped}`
}
