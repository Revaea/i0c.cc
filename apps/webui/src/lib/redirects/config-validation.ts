import Ajv, { type AnySchema, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import redirectsSchema from "i0c-redirect-worker/redirects.schema.json";

export interface RedirectConfigValidationIssue {
  message: string;
  path: string;
}

export type RedirectConfigValidationResult =
  | { status: "valid" }
  | { status: "invalid"; issues: RedirectConfigValidationIssue[] }
  | { status: "unavailable"; error: string };

interface SchemaValidatorState {
  error: string | null;
  validate: ValidateFunction | null;
}

function createSchemaValidator(): SchemaValidatorState {
  try {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    return {
      error: null,
      validate: ajv.compile(redirectsSchema as AnySchema),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown schema error",
      validate: null,
    };
  }
}

const schemaValidator = createSchemaValidator();

export function validateRedirectConfig(value: unknown): RedirectConfigValidationResult {
  const validate = schemaValidator.validate;
  if (!validate) {
    return {
      status: "unavailable",
      error: schemaValidator.error ?? "Unknown schema error",
    };
  }

  if (validate(value)) {
    return { status: "valid" };
  }

  return {
    status: "invalid",
    issues: (validate.errors ?? []).map((issue) => ({
      path: issue.instancePath.trim() || "(root)",
      message: issue.message ?? "invalid",
    })),
  };
}
